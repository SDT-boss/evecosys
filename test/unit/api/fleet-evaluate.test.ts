import { POST } from '@/app/api/fleet/evaluate/route'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockEvaluateFleet = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({}),
}))

// Replace the engine so the route's success/failure path is driven by the mock,
// not by real Supabase/telemetry work.
vi.mock('@/lib/fleet/dispatch-engine', () => ({
  DispatchEngine: class {
    evaluateFleet() {
      return mockEvaluateFleet()
    }
  },
}))

/** Chain stub ending in `.single()` for the users role lookup. */
function roleQuery(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {}
  const ret = vi.fn(() => obj)
  obj.select = ret
  obj.eq = ret
  obj.single = vi.fn().mockResolvedValue(result)
  return obj
}

describe('POST /api/fleet/evaluate', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockEvaluateFleet.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST()
    expect(res.status).toBe(401)
    expect(mockEvaluateFleet).not.toHaveBeenCalled()
  })

  it('returns 403 when the user is not a manager', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(roleQuery({ data: { role: 'driver' }, error: null }))
    const res = await POST()
    expect(res.status).toBe(403)
    expect(mockEvaluateFleet).not.toHaveBeenCalled()
  })

  it('returns 200 ok and runs the engine for a manager', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(roleQuery({ data: { role: 'manager' }, error: null }))
    mockEvaluateFleet.mockResolvedValue(undefined)
    const res = await POST()
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
    expect(mockEvaluateFleet).toHaveBeenCalledOnce()
  })

  it('returns 500 (without leaking detail) when evaluation throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(roleQuery({ data: { role: 'manager' }, error: null }))
    mockEvaluateFleet.mockRejectedValue(new Error('internal boom'))
    const res = await POST()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/fleet evaluation failed/i)
    expect(body.detail).toBeUndefined()
  })
})
