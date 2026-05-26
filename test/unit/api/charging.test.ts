import { NextRequest } from 'next/server'
import { POST } from '@/app/api/charging/route'

let mockGetUser = vi.fn()
let mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/charging', {
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
  obj.insert = noop
  obj.single = vi.fn().mockResolvedValue(result)
  return obj
}

const validStation = {
  name: 'Station A',
  address: '1 Main St',
  coordinates: '1.23,4.56',
  power_kw: 50,
  is_active: true,
}

describe('POST /api/charging', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makeRequest(validStation))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not a manager', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(chain({ data: { role: 'driver' }, error: null }))
    const res = await POST(makeRequest(validStation))
    expect(res.status).toBe(403)
  })

  it('returns 400 when required fields are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(chain({ data: { role: 'manager' }, error: null }))
    const res = await POST(makeRequest({ name: 'Station A' }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with station data on successful creation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const stationRow = { id: 's1', ...validStation, connector_type: '' }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return chain({ data: { role: 'manager' }, error: null })
      return chain({ data: stationRow, error: null })
    })
    const res = await POST(makeRequest(validStation))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toMatchObject({ name: 'Station A', power_kw: 50 })
  })

  it('returns 400 when database insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return chain({ data: { role: 'manager' }, error: null })
      return chain({ data: null, error: { message: 'duplicate key' } })
    })
    const res = await POST(makeRequest(validStation))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/duplicate key/i)
  })
})
