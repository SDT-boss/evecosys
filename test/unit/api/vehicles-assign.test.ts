import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/vehicles/assign/route'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/vehicles/assign', {
    method: 'PATCH',
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

describe('PATCH /api/vehicles/assign', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await PATCH(makeRequest({ driver_id: 'd1', vehicle_id: 'v1' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not a manager', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(chain({ data: { role: 'driver' }, error: null }))
    const res = await PATCH(makeRequest({ driver_id: 'd1', vehicle_id: 'v1' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when driver_id is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(chain({ data: { role: 'manager' }, error: null }))
    const res = await PATCH(makeRequest({ vehicle_id: 'v1' }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with updated driver data on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return chain({ data: { role: 'manager' }, error: null })
      return chain({ data: { id: 'd1', assigned_vehicle_id: 'v1' }, error: null })
    })
    const res = await PATCH(makeRequest({ driver_id: 'd1', vehicle_id: 'v1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toMatchObject({ id: 'd1', assigned_vehicle_id: 'v1' })
  })

  it('unassigns vehicle when vehicle_id is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return chain({ data: { role: 'manager' }, error: null })
      return chain({ data: { id: 'd1', assigned_vehicle_id: null }, error: null })
    })
    const res = await PATCH(makeRequest({ driver_id: 'd1', vehicle_id: null }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.assigned_vehicle_id).toBeNull()
  })
})
