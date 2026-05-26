import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/charging/toggle/route'

let mockGetUser = vi.fn()
let mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/charging/toggle', {
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

describe('PATCH /api/charging/toggle', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await PATCH(makeRequest({ id: 's1' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not a manager', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(chain({ data: { role: 'board' }, error: null }))
    const res = await PATCH(makeRequest({ id: 's1' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when id is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(chain({ data: { role: 'manager' }, error: null }))
    const res = await PATCH(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('toggles is_active from true to false', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return chain({ data: { role: 'manager' }, error: null })
      if (callCount === 2) return chain({ data: { is_active: true }, error: null })
      return chain({ data: { id: 's1', is_active: false }, error: null })
    })
    const res = await PATCH(makeRequest({ id: 's1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.is_active).toBe(false)
  })

  it('toggles is_active from false to true', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return chain({ data: { role: 'manager' }, error: null })
      if (callCount === 2) return chain({ data: { is_active: false }, error: null })
      return chain({ data: { id: 's1', is_active: true }, error: null })
    })
    const res = await PATCH(makeRequest({ id: 's1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.is_active).toBe(true)
  })
})
