import { test, expect } from '../../fixtures/index'
import { adminClient } from '../../helpers/supabase.admin'

/**
 * EVE-45 — tenant provisioning API.
 * Uses an unreachable BYODB host so bind_byodb fails (retryable → exhausts →
 * rollback), proving a failed provision never leaves a routable (Active) tenant.
 */

const UNREACHABLE_BYODB = {
  kind: 'structured',
  params: {
    engine: 'postgres',
    host: '203.0.113.1', // TEST-NET-3, guaranteed unroutable
    port: 5432,
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
