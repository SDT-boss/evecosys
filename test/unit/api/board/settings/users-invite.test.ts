import { describe, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: vi.fn() }, from: vi.fn() }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    auth: { admin: { inviteUserByEmail: vi.fn() } },
    from: vi.fn(),
  }),
}))

describe('POST /api/board/settings/users/invite', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it.todo('returns 401 when unauthenticated')
  it.todo('returns 403 when not board')
  it.todo('returns 400 for platform_admin role')
  it.todo('calls inviteUserByEmail with role and tenant_id metadata')
})
