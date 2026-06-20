import { describe, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: vi.fn() }, from: vi.fn() }),
}))

describe('PATCH /api/board/settings/toggles', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it.todo('returns 401 when unauthenticated')
  it.todo('returns 403 when not board')
  it.todo('returns 400 for unknown flag keys')
  it.todo('returns 400 for non-boolean flag values')
  it.todo('updates feature_flags with full 8-key object')
})
