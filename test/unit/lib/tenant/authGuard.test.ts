import { describe, it, expect, vi } from 'vitest'
import { TenantAuthGuard } from '@/lib/tenant/authGuard'
import { AuthSessionError, TenantAccessError } from '@/lib/tenant/types'
import type { DatabaseClient, Tenant } from '@/lib/tenant/types'

// ---------------------------------------------------------------------------
// Helpers — minimal DatabaseClient fakes matching the makeProbe/makeVault pattern
// ---------------------------------------------------------------------------

function makeDbClient(overrides: {
  user?: { id: string } | null
  tenant?: Tenant | null
  userError?: Error | null
  tenantError?: Error | null
} = {}): DatabaseClient {
  return {
    getUser: vi.fn().mockResolvedValue({
      user: overrides.user ?? { id: 'user-a' },
      error: overrides.userError ?? null,
    }),
    getTenantRow: vi.fn().mockResolvedValue({
      data: overrides.tenant ?? null,
      error: overrides.tenantError ?? null,
    }),
  }
}

const TENANT_A: Tenant = {
  id: 'tenant-a',
  owner_id: 'user-a',
  name: '',
  state: 'Active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TenantAuthGuard.requireSession', () => {
  describe('SEC-01: session validation', () => {
    it('throws AuthSessionError when getUser returns null user (no session)', async () => {
      const db = makeDbClient({ user: null })
      const guard = new TenantAuthGuard(db)

      await expect(guard.requireSession('tenant-a')).rejects.toThrow(AuthSessionError)
    })

    it('throws AuthSessionError when getUser returns an error', async () => {
      const db = makeDbClient({ userError: new Error('JWT expired') })
      const guard = new TenantAuthGuard(db)

      await expect(guard.requireSession('tenant-a')).rejects.toThrow(AuthSessionError)
    })

    it('throws AuthSessionError when getTenantRow returns { data: null, error: null } (RLS zero-row)', async () => {
      // Pitfall 3: RLS returns zero rows as { data: null, error: null } for cross-tenant
      // queries. Guard must reject on null data, not only on errors.
      const db = makeDbClient({ user: { id: 'user-a' }, tenant: null })
      const guard = new TenantAuthGuard(db)

      await expect(guard.requireSession('tenant-a')).rejects.toThrow(AuthSessionError)
    })
  })

  describe('SEC-04: ownership enforcement', () => {
    it('throws TenantAccessError when user.id does not match tenant.owner_id', async () => {
      const tenantOwnedByB: Tenant = { ...TENANT_A, owner_id: 'user-b' }
      const db = makeDbClient({ user: { id: 'user-a' }, tenant: tenantOwnedByB })
      const guard = new TenantAuthGuard(db)

      await expect(guard.requireSession('tenant-a')).rejects.toThrow(TenantAccessError)
    })
  })

  describe('happy path', () => {
    it('resolves to { user, tenant } when user.id matches tenant.owner_id', async () => {
      const db = makeDbClient({ user: { id: 'user-a' }, tenant: TENANT_A })
      const guard = new TenantAuthGuard(db)

      const result = await guard.requireSession('tenant-a')

      expect(result.user.id).toBe('user-a')
      expect(result.tenant).toEqual(TENANT_A)
    })
  })

  describe('call ordering invariants', () => {
    it('calls getUser before getTenantRow; when getUser fails, getTenantRow is never called', async () => {
      const callOrder: string[] = []

      const db: DatabaseClient = {
        getUser: vi.fn().mockImplementation(async () => {
          callOrder.push('getUser')
          return { user: null, error: null }
        }),
        getTenantRow: vi.fn().mockImplementation(async () => {
          callOrder.push('getTenantRow')
          return { data: TENANT_A, error: null }
        }),
      }
      const guard = new TenantAuthGuard(db)

      await expect(guard.requireSession('tenant-a')).rejects.toThrow(AuthSessionError)

      expect(callOrder).toEqual(['getUser'])
      expect(db.getTenantRow).not.toHaveBeenCalled()
    })
  })
})
