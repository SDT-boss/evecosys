import { test, expect } from '../../fixtures/index'
import { adminClient } from '../../helpers/supabase.admin'

/**
 * EVE-45 — tenant provisioning API.
 * Uses an unreachable BYODB endpoint so bind_byodb fails (retryable → exhausts →
 * rollback), proving a failed provision never leaves a routable (Active) tenant.
 *
 * The endpoint is localhost on a closed port: connecting yields an immediate
 * ECONNREFUSED rather than a 5s connect timeout. bind_byodb retries 3× (5s each),
 * so a black-hole host would take ~15s and exceed the per-test timeout; a refused
 * connection keeps all three attempts effectively instant.
 */

const UNREACHABLE_BYODB = {
  kind: 'structured',
  params: {
    engine: 'postgres',
    host: '127.0.0.1', // localhost, closed port → immediate ECONNREFUSED
    port: 1,
    database: 'nope',
    user: 'u',
    password: 'p',
  },
}

async function createRegisteredTenant(name: string): Promise<string> {
  const { data, error } = await adminClient
    .from('tenants')
    .insert({ name, state: 'Registered' })
    .select('id')
    .single()
  if (error) throw new Error(`createRegisteredTenant failed: ${error.message}`)
  return data.id
}

async function deleteTenant(id: string): Promise<void> {
  await adminClient.from('tenants').delete().eq('id', id)
}

test.describe('provision API — auth guards', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('POST requires auth (401)', async ({ page }) => {
    const res = await page.request.post('/api/platform/tenants/00000000-0000-0000-0000-000000000000/provision', {
      data: UNREACHABLE_BYODB,
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('provision API — non platform_admin forbidden', () => {
  test.use({ storageState: 'e2e/.auth/driver.json' })

  test('driver POST → 403', async ({ page }) => {
    const res = await page.request.post('/api/platform/tenants/00000000-0000-0000-0000-000000000000/provision', {
      data: UNREACHABLE_BYODB,
    })
    expect(res.status()).toBe(403)
  })
})

test.describe('provision API — safe failure & isolation', () => {
  test.use({ storageState: 'e2e/.auth/platform-admin.json' })

  test('failed BYODB provisioning rolls back and leaves tenant non-routable', async ({ page }) => {
    const tenantId = await createRegisteredTenant('E2E Provision Fail')
    try {
      const res = await page.request.post(`/api/platform/tenants/${tenantId}/provision`, {
        data: UNREACHABLE_BYODB,
      })
      expect(res.status()).toBe(409)
      const body = await res.json()
      expect(body.status).toBe('RolledBack')

      const { data: tenant } = await adminClient.from('tenants').select('state').eq('id', tenantId).single()
      expect(tenant?.state).not.toBe('Active')
    } finally {
      await deleteTenant(tenantId)
    }
  })

  test('provisioning one tenant does not change another tenant config/flags/metering', async ({ page }) => {
    const tenantA = await createRegisteredTenant('E2E Tenant A')
    const tenantB = await createRegisteredTenant('E2E Tenant B')
    try {
      await page.request.post(`/api/platform/tenants/${tenantA}/provision`, { data: UNREACHABLE_BYODB })

      const { data: bConfig } = await adminClient.from('tenant_config').select('tenant_id').eq('tenant_id', tenantB).maybeSingle()
      const { data: bMeter } = await adminClient.from('tenant_storage_metering').select('tenant_id').eq('tenant_id', tenantB).maybeSingle()
      expect(bConfig).toBeNull()
      expect(bMeter).toBeNull()

      const { data: bTenant } = await adminClient.from('tenants').select('state').eq('id', tenantB).single()
      expect(bTenant?.state).toBe('Registered')
    } finally {
      await deleteTenant(tenantA)
      await deleteTenant(tenantB)
    }
  })
})

test.describe('provision API — happy path', () => {
  test.use({ storageState: 'e2e/.auth/platform-admin.json' })

  // A genuinely reachable BYODB whose user can CREATE: the local Supabase Postgres
  // itself, used here purely as a reachable target so the full success sequence
  // (bind → seed → flags → metering → readiness → activate) runs end to end.
  const REACHABLE_BYODB = {
    kind: 'structured',
    params: {
      engine: 'postgres',
      host: '127.0.0.1',
      port: 54322,
      database: 'postgres',
      user: 'postgres',
      password: 'postgres',
    },
  }

  test('provisions a tenant through to Active with config + metering bootstrapped', async ({ page }) => {
    // Needs a reachable BYODB whose user can CREATE. Locally the Supabase Postgres
    // on 127.0.0.1:54322 serves that role; CI has no such reachable target, so the
    // probe can't connect there. Skip in CI — the success path is also covered by
    // the orchestrator unit tests.
    test.skip(!!process.env.CI, 'requires a reachable BYODB target (runs locally)')

    const tenantId = await createRegisteredTenant('E2E Provision Success')
    try {
      const res = await page.request.post(`/api/platform/tenants/${tenantId}/provision`, {
        data: REACHABLE_BYODB,
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('Provisioned')

      const { data: tenant } = await adminClient.from('tenants').select('state').eq('id', tenantId).single()
      expect(tenant?.state).toBe('Active')

      const { data: cfg } = await adminClient
        .from('tenant_config').select('tenant_id').eq('tenant_id', tenantId).maybeSingle()
      const { data: meter } = await adminClient
        .from('tenant_storage_metering').select('quota_bytes').eq('tenant_id', tenantId).maybeSingle()
      expect(cfg).not.toBeNull()
      expect(meter).not.toBeNull()
    } finally {
      await deleteTenant(tenantId)
    }
  })
})
