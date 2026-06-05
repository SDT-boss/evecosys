import { NextRequest } from 'next/server'
import { POST } from '@/app/api/users/create/route'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockAdminCreateUser = vi.fn()
const mockAdminFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { admin: { createUser: mockAdminCreateUser } },
    from: mockAdminFrom,
  })),
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/users/create', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function profileChain(role: string) {
  const obj: any = {}
  const noop = vi.fn().mockReturnValue(obj)
  obj.select = noop
  obj.eq = noop
  obj.single = vi.fn().mockResolvedValue({ data: { role }, error: null })
  return obj
}

function adminFromChain() {
  const obj: any = {}
  const noop = vi.fn().mockReturnValue(obj)
  obj.upsert = vi.fn().mockResolvedValue({ error: null })
  obj.insert = vi.fn().mockResolvedValue({ error: null })
  return obj
}

const validPayload = {
  full_name: 'Test Driver',
  email: 'test@example.com',
  password: 'password123',
  role: 'driver',
}

describe('POST /api/users/create', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockAdminCreateUser.mockReset()
    mockAdminFrom.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not a manager', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(profileChain('driver'))
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(403)
  })

  it('returns 400 when required fields are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(profileChain('manager'))
    const res = await POST(makeRequest({ email: 'test@example.com' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(profileChain('manager'))
    const res = await POST(makeRequest({ ...validPayload, role: 'admin' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid role/i)
  })

  it('returns 400 when password is shorter than 8 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(profileChain('manager'))
    const res = await POST(makeRequest({ ...validPayload, password: 'short' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/at least 8 characters/i)
  })

  it('returns 200 with user data on successful creation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(profileChain('manager'))
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: 'new-u1' } },
      error: null,
    })
    mockAdminFrom.mockReturnValue(adminFromChain())
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user).toMatchObject({ email: 'test@example.com', role: 'driver' })
  })

  it('inserts into drivers table when role is driver', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(profileChain('manager'))
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: 'new-u1' } },
      error: null,
    })
    const insertSpy = vi.fn().mockResolvedValue({ error: null })
    mockAdminFrom.mockImplementation((table: string) => {
      const obj: any = {}
      obj.upsert = vi.fn().mockResolvedValue({ error: null })
      obj.insert = insertSpy
      return obj
    })
    await POST(makeRequest(validPayload))
    expect(insertSpy).toHaveBeenCalledWith({ user_id: 'new-u1' })
  })
})
