import { describe, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: vi.fn() }, from: vi.fn() }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    auth: { admin: {} },
    from: vi.fn(),
  }),
}))

vi.mock('@/lib/tenant/registrationService', () => ({
  BYODBRegistrationService: vi.fn(),
}))

vi.mock('@/lib/tenant/stateMachine', () => ({
  transition: vi.fn(),
}))

describe('POST /api/board/settings/byodb', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it.todo('returns 401 when unauthenticated')
  it.todo('returns 403 when not board')
  it.todo('transitions Registered tenant to Provisioning before calling register')
  it.todo('returns 400 on ConnectivityError')
  it.todo('returns 200 and active state on success')
})
