import { NextRequest } from 'next/server'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { DELETE } from '@/app/api/board/settings/users/remove/route'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockAdminDeleteUser = vi.fn()
const mockAdminFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    auth: { admin: { deleteUser: mockAdminDeleteUser } },
    from: mockAdminFrom,
  }),
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/board/settings/users/remove', {
    method: 'DELETE',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

// Stub chain helper for user profile lookup
function profileChain(role: string) {
  const obj: any = {}
  const noop = vi.fn().mockReturnValue(obj)
  obj.select = noop
  obj.eq = noop
  obj.single = vi.fn().mockResolvedValue({ data: { role }, error: null })
  return obj
}

// Stub chain helper for tenant lookup
function tenantChain(tenantId: string) {
  const obj: any = {}
  const noop = vi.fn().mockReturnValue(obj)
  obj.select = noop
  obj.eq = noop
  obj.single = vi.fn().mockResolvedValue({ data: { id: tenantId }, error: null })
  return obj
}

// Stub chain for admin delete row (from('users').delete().eq().eq())
function deleteChain(error: null | { message: string } = null) {
  const obj: any = {}
  obj.delete = vi.fn().mockReturnValue(obj)
  obj.eq = vi.fn().mockReturnValue(obj)
  obj.single = vi.fn().mockResolvedValue({ error })
  // The final .eq() in .delete().eq('id', ...).eq('tenant_id', ...) returns a promise
  // We need to make the last .eq() resolve with the result
  let eqCount = 0
  obj.eq = vi.fn().mockImplementation(() => {
    eqCount++
    if (eqCount >= 2) {
      // Last eq — return the promise result
      return Promise.resolve({ error })
    }
    return obj
  })
  return obj
}

describe('DELETE /api/board/settings/users/remove', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockAdminDeleteUser.mockReset()
    mockAdminFrom.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await DELETE(makeRequest({ userId: 'user-abc' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not board role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(profileChain('manager'))
    const res = await DELETE(makeRequest({ userId: 'user-abc' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when userId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let call = 0
    mockFrom.mockImplementation(() => {
      call++
      if (call === 1) return profileChain('board')
      return tenantChain('tenant-123')
    })
    const res = await DELETE(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/missing userId/i)
  })

  it('returns 200 and calls deleteUser + scoped delete row with tenant_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let serverCall = 0
    mockFrom.mockImplementation(() => {
      serverCall++
      if (serverCall === 1) return profileChain('board')
      return tenantChain('tenant-123')
    })

    // Track delete chain calls
    const eqSpy = vi.fn().mockImplementation(() => Promise.resolve({ error: null }))
    let firstEqCall = true
    const firstEqSpy = vi.fn().mockImplementation(() => {
      if (firstEqCall) {
        firstEqCall = false
        return { eq: eqSpy }
      }
      return Promise.resolve({ error: null })
    })
    mockAdminFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq: firstEqSpy }) })
    mockAdminDeleteUser.mockResolvedValue({ error: null })

    const res = await DELETE(makeRequest({ userId: 'user-abc' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    // Verify admin from was called with 'users' table
    expect(mockAdminFrom).toHaveBeenCalledWith('users')
    // Verify deleteUser was called with the userId
    expect(mockAdminDeleteUser).toHaveBeenCalledWith('user-abc')
    // Verify tenant_id scope was applied (second .eq call includes tenant_id)
    expect(firstEqSpy).toHaveBeenCalledWith('id', 'user-abc')
    expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-123')
  })
})
