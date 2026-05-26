import { NextRequest } from 'next/server'
import { POST } from '@/app/api/alerts/resolve/route'

let mockGetUser = vi.fn()
let mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/alerts/resolve', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function chain(result: any) {
  const obj: any = {}
  const noop = vi.fn().mockReturnValue(obj)
  obj.select = noop
  obj.eq = noop
  obj.update = noop
  obj.single = vi.fn().mockResolvedValue(result)
  return obj
}

describe('POST /api/alerts/resolve', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makeRequest({ alertId: 'a1' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('returns 400 when alertId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when user profile not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(chain({ data: null, error: null }))
    const res = await POST(makeRequest({ alertId: 'a1' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/user not found/i)
  })

  it('returns 404 when alert not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return chain({ data: { role: 'manager' }, error: null })
      return chain({ data: null, error: null })
    })
    const res = await POST(makeRequest({ alertId: 'missing-alert' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/alert not found/i)
  })

  it('returns 403 when driver tries to resolve an alert for an unassigned vehicle', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return chain({ data: { role: 'driver' }, error: null })
      if (callCount === 2) return chain({ data: { vehicle_id: 'v1' }, error: null })
      return chain({ data: { assigned_vehicle_id: 'v2' }, error: null })
    })
    const res = await POST(makeRequest({ alertId: 'a1' }))
    expect(res.status).toBe(403)
  })

  it('returns 200 with success:true when manager resolves an alert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return chain({ data: { role: 'manager' }, error: null })
      if (callCount === 2) return chain({ data: { vehicle_id: 'v1' }, error: null })
      return chain({ data: {}, error: null })
    })
    const res = await POST(makeRequest({ alertId: 'a1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
