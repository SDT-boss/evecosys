import { describe, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: vi.fn() }, from: vi.fn() }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    auth: { admin: {} },
    from: vi.fn(),
    storage: { from: vi.fn() },
  }),
}))

describe('POST /api/board/settings/branding', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it.todo('returns 401 when unauthenticated')
  it.todo('returns 403 when caller is not board role')
  it.todo('returns 400 for invalid file type')
  it.todo('saves logo_url and returns 200')
  it.todo('saves primary_color and returns 200')
})
