import { test, expect } from '../../fixtures/index'
import { adminClient } from '../../helpers/supabase.admin'

async function createTenant(name: string, state: string): Promise<string> {
  const { data, error } = await adminClient
    .from('tenants').insert({ name, state }).select('id').single()
  if (error) throw new Error(`createTenant failed: ${error.message}`)
  return data.id
}
async function deleteTenant(id: string): Promise<void> {
  await adminClient.from('tenants').delete().eq('id', id)
}
async function getState(id: string): Promise<string | undefined> {
  const { data } = await adminClient.from('tenants').select('state').eq('id', id).single()
  return data?.state
}

test.describe('control-plane lifecycle — auth guards', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('POST lifecycle requires auth (401)', async ({ page }) => {
    const res = await page.request.post('/api/platform/tenants/00000000-0000-0000-0000-000000000000/lifecycle', {
      data: { action: 'suspend' },
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('control-plane lifecycle — non platform_admin forbidden', () => {
  test.use({ storageState: 'e2e/.auth/driver.json' })

  test('driver POST lifecycle → 403', async ({ page }) => {
    const res = await page.request.post('/api/platform/tenants/00000000-0000-0000-0000-000000000000/lifecycle', {
      data: { action: 'suspend' },
    })
    expect(res.status()).toBe(403)
  })

  test('driver GET config for a tenant they do not own → 403', async ({ page }) => {
    const tenantId = await createTenant('E2E Other Tenant', 'Active')
    try {
      const res = await page.request.get(`/api/platform/tenants/${tenantId}/config`)
      expect(res.status()).toBe(403)
    } finally {
      await deleteTenant(tenantId)
    }
  })
})

test.describe('control-plane lifecycle — platform_admin', () => {
  test.use({ storageState: 'e2e/.auth/platform-admin.json' })

  test('suspend makes a tenant non-routable, reactivate restores it', async ({ page }) => {
    const tenantId = await createTenant('E2E Lifecycle', 'Active')
    try {
      const suspend = await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, { data: { action: 'suspend' } })
      expect(suspend.status()).toBe(200)
      expect(await getState(tenantId)).toBe('Suspended')

      const cfg = await page.request.get(`/api/platform/tenants/${tenantId}/config`)
      expect(cfg.status()).toBe(200)
      const snap = await cfg.json()
      expect(snap.status).toBe('Suspended')
      expect(snap.routable).toBe(false)

      const reactivate = await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, { data: { action: 'reactivate' } })
      expect(reactivate.status()).toBe(200)
      expect(await getState(tenantId)).toBe('Active')
    } finally {
      await deleteTenant(tenantId)
    }
  })

  test('invalid transition (suspend a Registered tenant) → 409', async ({ page }) => {
    const tenantId = await createTenant('E2E Bad Transition', 'Registered')
    try {
      const res = await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, { data: { action: 'suspend' } })
      expect(res.status()).toBe(409)
      expect(await getState(tenantId)).toBe('Registered')
    } finally {
      await deleteTenant(tenantId)
    }
  })

  test('decommission moves Active → Decommissioned', async ({ page }) => {
    const tenantId = await createTenant('E2E Decommission', 'Active')
    try {
      const res = await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, { data: { action: 'decommission' } })
      expect(res.status()).toBe(200)
      expect(await getState(tenantId)).toBe('Decommissioned')
    } finally {
      await deleteTenant(tenantId)
    }
  })

  test('config endpoint returns a tenant-scoped snapshot for an Active tenant', async ({ page }) => {
    const tenantId = await createTenant('E2E Config', 'Active')
    try {
      const res = await page.request.get(`/api/platform/tenants/${tenantId}/config`)
      expect(res.status()).toBe(200)
      const snap = await res.json()
      expect(snap.tenantId).toBe(tenantId)
      expect(snap.routable).toBe(true)
      expect(typeof snap.featureFlags).toBe('object')
    } finally {
      await deleteTenant(tenantId)
    }
  })

  test('credential rotation through to a new secret (local BYODB)', async ({ page }) => {
    // Needs a reachable BYODB whose user can CREATE; local Postgres serves that.
    // CI has no such target, so skip there (covered by unit tests).
    test.skip(!!process.env.CI, 'requires a reachable BYODB target (runs locally)')

    const tenantId = await createTenant('E2E Rotate', 'Active')
    try {
      const res = await page.request.post(`/api/platform/tenants/${tenantId}/credentials/rotate`, {
        data: {
          kind: 'structured',
          params: { engine: 'postgres', host: '127.0.0.1', port: 54322, database: 'postgres', user: 'postgres', password: 'postgres' },
        },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(typeof body.secretId).toBe('string')

      const { data: row } = await adminClient.from('tenants').select('vault_secret_id').eq('id', tenantId).single()
      expect(row?.vault_secret_id).toBe(body.secretId)
    } finally {
      await deleteTenant(tenantId)
    }
  })
})
