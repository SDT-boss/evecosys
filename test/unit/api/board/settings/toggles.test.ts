import { NextRequest } from 'next/server'
import { describe, it, vi, beforeEach, expect } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/board/settings/toggles', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
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

function updateChain(error: any = null) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error }),
    }),
  }
}

const validFlags = {
  member_invitations: true,
  fleet: true,
  carbon: false,
  trips: true,
  driver_behaviour_score: false,
  alerts: true,
  charging_stations: true,
  auth_troubleshooting: false,
}

describe('PATCH /api/board/settings/toggles', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it('returns 401 when unauthenticated', async () => {
    const { PATCH } = await import('@/app/api/board/settings/toggles/route')
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await PATCH(makeRequest({ flags: validFlags }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not board role', async () => {
    const { PATCH } = await import('@/app/api/board/settings/toggles/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(profileChain('manager'))
    const res = await PATCH(makeRequest({ flags: validFlags }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when flags contains an unknown key', async () => {
    const { PATCH } = await import('@/app/api/board/settings/toggles/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      return tenantChain('tenant-123')
    })
    const payloadWithUnknownKey = { ...validFlags, unknown_key: true }
    const res = await PATCH(makeRequest({ flags: payloadWithUnknownKey }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid flags payload/i)
  })

  it('returns 400 when a flag value is not a boolean', async () => {
    const { PATCH } = await import('@/app/api/board/settings/toggles/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      return tenantChain('tenant-123')
    })
    const payloadWithStringValue = { ...validFlags, fleet: 'yes' }
    const res = await PATCH(makeRequest({ flags: payloadWithStringValue }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid flags payload/i)
  })

  it('returns 400 when payload is missing required flag keys', async () => {
    const { PATCH } = await import('@/app/api/board/settings/toggles/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      return tenantChain('tenant-123')
    })
    // Only 6 of 8 keys — missing auth_troubleshooting and driver_behaviour_score
    const incompletePayload = {
      member_invitations: true,
      fleet: true,
      carbon: false,
      trips: true,
      alerts: true,
      charging_stations: true,
    }
    const res = await PATCH(makeRequest({ flags: incompletePayload }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid flags payload/i)
  })

  it('returns 200 and updates feature_flags when all 8 valid boolean flags provided', async () => {
    const { PATCH } = await import('@/app/api/board/settings/toggles/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      if (callCount === 2) return tenantChain('tenant-123')
      return { update: mockUpdate }
    })
    const res = await PATCH(makeRequest({ flags: validFlags }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ feature_flags: validFlags })
  })
})
