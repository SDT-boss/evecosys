import { NextRequest } from 'next/server'
import { POST } from '@/app/api/trips/plan/route'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

function makeRequest(body: unknown, { raw = false }: { raw?: boolean } = {}) {
  return new NextRequest('http://localhost/api/trips/plan', {
    method: 'POST',
    body: raw ? (body as string) : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

/** Thenable stub for the charging_stations query chain (no `.single()` — awaited directly). */
function chargersQuery(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {}
  const ret = vi.fn(() => obj)
  obj.select = ret
  obj.eq = ret
  obj.not = ret
  obj.then = (resolve: (v: unknown) => void) => resolve(result)
  return obj
}

const VALID_BODY = {
  vehicleModel: 'AION_Y_PLUS',
  batteryPercent: 100,
  origin: { latitude: 0, longitude: 0 },
  destination: { latitude: 0, longitude: 0.01 }, // ~1.1 km — comfortably feasible
}

describe('POST /api/trips/plan', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toMatch(/unauthorized/i)
  })

  it('returns 400 on invalid JSON', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(makeRequest('not-json', { raw: true }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/invalid json/i)
  })

  it('returns 400 when vehicleModel is not in the allowed list', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(makeRequest({ ...VALID_BODY, vehicleModel: 'TESLA_MODEL_3' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/invalid fields/i)
  })

  it('returns 400 when batteryPercent is out of range', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(makeRequest({ ...VALID_BODY, batteryPercent: 150 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when coordinates are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(makeRequest({ ...VALID_BODY, destination: {} }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with a feasible plan for a short trip on full charge', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(chargersQuery({ data: [], error: null }))
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(200)
    const plan = await res.json()
    expect(plan.feasible).toBe(true)
    expect(typeof plan.totalDistanceKm).toBe('number')
    expect(Array.isArray(plan.segments)).toBe(true)
    expect(Array.isArray(plan.chargingStops)).toBe(true)
  })

  it('returns 500 when the charging-station query fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(chargersQuery({ data: null, error: new Error('db down') }))
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toMatch(/trip planning failed/i)
  })
})
