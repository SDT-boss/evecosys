import { test, expect } from '../../fixtures/index'
import { adminClient } from '../../helpers/supabase.admin'

/**
 * EVE-55 audit-log E2E. Relies on the shared global-setup test users:
 *   - platform_admin (e2e/.auth/platform-admin.json)
 *   - board          (e2e/.auth/board.json) — owns a tenant (ensureTestTenant)
 *   - driver         (e2e/.auth/driver.json)
 *
 * Tenant discovery adaptation: there is no GET /api/platform/tenants listing
 * endpoint (only [tenantId]/... sub-routes exist). We follow the same pattern
 * as tenant-lifecycle.spec.ts — create an ephemeral Active tenant directly via
 * adminClient (service-role), perform actions, assert, then delete in finally.
 */

async function createTenant(name: string, state: string): Promise<string> {
  const { data, error } = await adminClient
    .from('tenants')
    .insert({ name, state })
    .select('id')
    .single()
  if (error) throw new Error(`createTenant failed: ${error.message}`)
  return data.id as string
}

async function deleteTenant(id: string): Promise<void> {
  await adminClient.from('tenants').delete().eq('id', id)
}

// ── Auth guards (unauthenticated) ────────────────────────────────────────────

test.describe('audit log — auth guards', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('platform audit GET requires auth (401)', async ({ page }) => {
    const res = await page.request.get(
      '/api/platform/tenants/00000000-0000-0000-0000-000000000000/audit',
    )
    expect(res.status()).toBe(401)
  })

  test('board audit GET requires auth (401)', async ({ page }) => {
    const res = await page.request.get('/api/board/audit-log')
    expect(res.status()).toBe(401)
  })
})

// ── Auth guards (wrong role) ──────────────────────────────────────────────────

test.describe('audit log — non platform_admin forbidden', () => {
  test.use({ storageState: 'e2e/.auth/driver.json' })

  test('driver platform audit GET → 403', async ({ page }) => {
    const res = await page.request.get(
      '/api/platform/tenants/00000000-0000-0000-0000-000000000000/audit',
    )
    expect(res.status()).toBe(403)
  })
})

// ── Traceability (platform_admin) ─────────────────────────────────────────────

test.describe('audit log — traceability as platform_admin', () => {
  test.use({ storageState: 'e2e/.auth/platform-admin.json' })

  test('a lifecycle action and its failure path are both traceable', async ({ page }) => {
    // Create an ephemeral Active tenant — same pattern as tenant-lifecycle.spec.ts.
    const tenantId = await createTenant('E2E Audit Trace', 'Active')
    try {
      // 1) Successful sensitive action: suspend (Active -> Suspended).
      const suspend = await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, {
        data: { action: 'suspend' },
      })
      expect([200, 409]).toContain(suspend.status()) // 409 if already Suspended from a prior run

      // 2) Failure path: an invalid override (empty reason) → 400, must still audit.
      const badOverride = await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, {
        data: { action: 'override', toState: 'Active', reason: '' },
      })
      expect(badOverride.status()).toBe(400)

      // 3) Retrieve the audit trail and assert both records exist.
      const audit = await page.request.get(
        `/api/platform/tenants/${tenantId}/audit?limit=100`,
      )
      expect(audit.ok()).toBeTruthy()
      const { rows } = await audit.json()
      const actions = rows.map((r: { action: string; outcome: string }) => `${r.action}:${r.outcome}`)
      expect(actions).toContain('lifecycle.suspend:ok')
      expect(actions).toContain('lifecycle.override:error')

      // 4) No raw secrets leaked: no row's serialized form contains a password value.
      expect(JSON.stringify(rows)).not.toMatch(/hunter2|password":"[^"]+"/i)
    } finally {
      await deleteTenant(tenantId)
    }
  })
})

// ── Tenant isolation (board surface) ─────────────────────────────────────────

test.describe('audit log — tenant isolation on the board surface', () => {
  test.use({ storageState: 'e2e/.auth/board.json' })

  test('board sees only its own tenant rows', async ({ page }) => {
    const res = await page.request.get('/api/board/audit-log?limit=100')
    expect(res.ok()).toBeTruthy()
    const { rows } = await res.json()
    // All returned rows belong to a single tenant (RLS-scoped to the owner).
    const tenantIds = new Set(rows.map((r: { tenant_id: string }) => r.tenant_id))
    expect(tenantIds.size).toBeLessThanOrEqual(1)
  })
})
