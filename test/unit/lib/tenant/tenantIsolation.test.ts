import { describe, it, expect, vi } from 'vitest'
import { TenantAuthGuard } from '@/lib/tenant/authGuard'
import { AuthSessionError, TenantAccessError } from '@/lib/tenant/types'
import type { DatabaseClient, Tenant } from '@/lib/tenant/types'

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

const TENANT_B: Tenant = {
  id: 'tenant-b',
  owner_id: 'user-b',
  name: '',
  state: 'Active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('Cross-tenant isolation (TEST-03)', () => {
  it('rejects when RLS filters Tenant B from user-a session (zero-row path)', async () => {
    // RLS returns { data: null, error: null } — guard must treat null data as rejection
    const db = makeDbClient({ user: { id: 'user-a' }, tenant: null })
    const guard = new TenantAuthGuard(db)

    await expect(guard.requireSession('tenant-b')).rejects.toThrow(AuthSessionError)
  })

  it('rejects with TenantAccessError when RLS bypassed and guard catches ownership mismatch', async () => {
    // Defense-in-depth: even if RLS were bypassed and Tenant B's row is returned,
    // the guard's owner_id check prevents cross-tenant access
    const db = makeDbClient({ user: { id: 'user-a' }, tenant: TENANT_B })
    const guard = new TenantAuthGuard(db)

    await expect(guard.requireSession('tenant-b')).rejects.toThrow(TenantAccessError)
  })

  it('resolves when Tenant A session queries Tenant A (positive control)', async () => {
    const db = makeDbClient({ user: { id: 'user-a' }, tenant: TENANT_A })
    const guard = new TenantAuthGuard(db)

    const result = await guard.requireSession('tenant-a')

    expect(result.tenant.owner_id).toBe('user-a')
    expect(result.tenant.id).toBe('tenant-a')
  })
})
