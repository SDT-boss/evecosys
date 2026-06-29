import { NextRequest } from 'next/server'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { POST } from '@/app/api/board/settings/users/invite/route'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockAdminInvite = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    auth: { admin: { inviteUserByEmail: mockAdminInvite } },
    from: vi.fn(),
  }),
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/board/settings/users/invite', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

// Stub chain helper — replicates the chained .select().eq().single() pattern
function profileChain(role: string) {
  const obj: any = {}
  const noop = vi.fn().mockReturnValue(obj)
  obj.select = noop
  obj.eq = noop
  obj.single = vi.fn().mockResolvedValue({ data: { role }, error: null })
  return obj
}

function tenantChain(tenantId: string) {
  const obj: any = {}
  const noop = vi.fn().mockReturnValue(obj)
  obj.select = noop
  obj.eq = noop
  obj.single = vi.fn().mockResolvedValue({ data: { id: tenantId }, error: null })
  return obj
}

describe('POST /api/board/settings/users/invite', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockAdminInvite.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makeRequest({ email: 'test@x.com', role: 'driver' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not board role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(profileChain('manager'))
    const res = await POST(makeRequest({ email: 'test@x.com', role: 'driver' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when role is platform_admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let call = 0
    mockFrom.mockImplementation(() => {
      call++
      if (call === 1) return profileChain('board')
      return tenantChain('tenant-123')
    })
    const res = await POST(makeRequest({ email: 'test@x.com', role: 'platform_admin' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/role must be manager or driver/i)
  })

  it('returns 400 when email is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let call = 0
    mockFrom.mockImplementation(() => {
      call++
      if (call === 1) return profileChain('board')
      return tenantChain('tenant-123')
    })
    const res = await POST(makeRequest({ role: 'driver' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/email is required/i)
  })

  it('returns 200 and calls inviteUserByEmail with correct metadata', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let call = 0
    mockFrom.mockImplementation(() => {
      call++
      if (call === 1) return profileChain('board')
      return tenantChain('tenant-123')
    })
    mockAdminInvite.mockResolvedValue({ error: null })

    const res = await POST(makeRequest({ email: 'test@x.com', role: 'driver' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(mockAdminInvite).toHaveBeenCalledWith(
      'test@x.com',
      expect.objectContaining({
        data: { role: 'driver', tenant_id: 'tenant-123' },
        redirectTo: expect.stringContaining('/login'),
      })
    )
  })
})
