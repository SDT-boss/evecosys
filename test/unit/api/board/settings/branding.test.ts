import { NextRequest } from 'next/server'
import { describe, it, vi, beforeEach, expect } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockStorageFrom = vi.fn()
const mockAdminFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    auth: { admin: {} },
    from: mockAdminFrom,
    storage: { from: mockStorageFrom },
  }),
}))

function makeFormDataRequest(fields: Record<string, string | File> = {}) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value)
  }
  return new NextRequest('http://localhost/api/board/settings/branding', {
    method: 'POST',
    body: formData,
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

function tenantChain(id: string | null) {
  const obj: any = {}
  const noop = vi.fn().mockReturnValue(obj)
  obj.select = noop
  obj.eq = noop
  obj.single = vi.fn().mockResolvedValue({ data: id ? { id } : null, error: null })
  return obj
}

function adminUpdateChain(error: any = null) {
  const obj: any = {}
  obj.update = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error }),
  })
  return obj
}

describe('POST /api/board/settings/branding', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockStorageFrom.mockReset()
    mockAdminFrom.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it('returns 401 when unauthenticated', async () => {
    const { POST } = await import('@/app/api/board/settings/branding/route')
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makeFormDataRequest())
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not board role', async () => {
    const { POST } = await import('@/app/api/board/settings/branding/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(profileChain('manager'))
    const res = await POST(makeFormDataRequest())
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid file type', async () => {
    const { POST } = await import('@/app/api/board/settings/branding/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      return tenantChain('tenant-123')
    })

    const gifFile = new File(['gif content'], 'logo.gif', { type: 'image/gif' })
    const res = await POST(makeFormDataRequest({ logo: gifFile }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid file type/i)
  })

  it('saves name and primary_color and returns 200', async () => {
    const { POST } = await import('@/app/api/board/settings/branding/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      return tenantChain('tenant-123')
    })
    mockAdminFrom.mockReturnValue(adminUpdateChain(null))

    const res = await POST(makeFormDataRequest({ name: 'Acme Corp', primary_color: '#1A2B3C' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns 400 when primary_color is not a valid hex', async () => {
    const { POST } = await import('@/app/api/board/settings/branding/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      return tenantChain('tenant-123')
    })

    const res = await POST(makeFormDataRequest({ primary_color: '#GGGGGG' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid hex colour/i)
  })
})
