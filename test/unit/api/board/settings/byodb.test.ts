import { NextRequest } from 'next/server'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { ConnectivityError } from '@/lib/tenant/probe'
import { CredentialValidationError } from '@/lib/tenant/credentials'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockAdminFrom = vi.fn()
const mockRegister = vi.fn()
const mockTransition = vi.fn((_from: string, to: string) => to)

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    auth: { admin: {} },
    from: mockAdminFrom,
  }),
}))

vi.mock('@/lib/tenant/registrationService', () => ({
  BYODBRegistrationService: class BYODBRegistrationService {
    register = mockRegister
  },
}))

vi.mock('@/lib/tenant/stateMachine', () => ({
  transition: mockTransition,
}))

vi.mock('@/lib/tenant/probeDriver', () => ({
  RealConnectivityProbe: class RealConnectivityProbe {
    probe = vi.fn()
  },
}))

vi.mock('@/lib/tenant/vaultStore', () => ({
  SupabaseVaultStore: class SupabaseVaultStore {
    store = vi.fn()
    delete = vi.fn()
  },
}))

// Helpers
function makeRequest(body: object = {}) {
  return new NextRequest('http://localhost/api/board/settings/byodb', {
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

function tenantChain(tenant: object | null) {
  const obj: any = {}
  const noop = vi.fn().mockReturnValue(obj)
  obj.select = noop
  obj.eq = noop
  obj.single = vi.fn().mockResolvedValue({ data: tenant, error: null })
  return obj
}

function adminUpdateChain(error: any = null) {
  const updateObj: any = {}
  updateObj.eq = vi.fn().mockResolvedValue({ error })
  const obj: any = {}
  obj.update = vi.fn().mockReturnValue(updateObj)
  return obj
}

const validInput = {
  kind: 'structured',
  params: {
    engine: 'postgres',
    host: 'db.example.com',
    port: 5432,
    database: 'mydb',
    user: 'dbuser',
    password: 'secret',
  },
}

describe('POST /api/board/settings/byodb', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockAdminFrom.mockReset()
    mockRegister.mockReset()
    mockTransition.mockReset()
    mockTransition.mockImplementation((_from: string, to: string) => to)
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it('returns 401 when unauthenticated', async () => {
    const { POST } = await import('@/app/api/board/settings/byodb/route')
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makeRequest(validInput))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not board', async () => {
    const { POST } = await import('@/app/api/board/settings/byodb/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockFrom.mockReturnValue(profileChain('manager'))
    const res = await POST(makeRequest(validInput))
    expect(res.status).toBe(403)
  })

  it('returns 400 when tenant state is Active', async () => {
    const { POST } = await import('@/app/api/board/settings/byodb/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      return tenantChain({ id: 'tenant-1', state: 'Active' })
    })
    const res = await POST(makeRequest(validInput))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/already registered/i)
  })

  it('transitions Registered tenant to Provisioning before calling register', async () => {
    const { POST } = await import('@/app/api/board/settings/byodb/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      return tenantChain({ id: 'tenant-1', state: 'Registered', owner_id: 'u1', name: 'Acme', created_at: '', updated_at: '' })
    })

    mockAdminFrom.mockReturnValue({ update: updateFn })

    const registerCallOrder: string[] = []
    mockTransition.mockImplementation((_from: string, to: string) => {
      registerCallOrder.push('transition')
      return to
    })
    mockRegister.mockImplementation(async () => {
      registerCallOrder.push('register')
      return { tenant: { state: 'Active' }, secretId: 'sec-1' }
    })

    await POST(makeRequest(validInput))

    // transition must be called with Registered → Provisioning
    expect(mockTransition).toHaveBeenCalledWith('Registered', 'Provisioning')
    // tenants row must be updated to Provisioning before register()
    expect(updateFn).toHaveBeenCalledWith({ state: 'Provisioning' })
    // ordering: transition then register
    expect(registerCallOrder[0]).toBe('transition')
    expect(registerCallOrder[1]).toBe('register')
  })

  it('returns 400 when register() throws ConnectivityError', async () => {
    const { POST } = await import('@/app/api/board/settings/byodb/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      return tenantChain({ id: 'tenant-1', state: 'Provisioning', owner_id: 'u1', name: 'Acme', created_at: '', updated_at: '' })
    })

    mockAdminFrom.mockReturnValue(adminUpdateChain(null))
    mockRegister.mockRejectedValue(new ConnectivityError('probe failed'))

    const res = await POST(makeRequest(validInput))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('probe failed')
  })

  it('rolls back tenant state to Registered when register() throws ConnectivityError after Registered→Provisioning transition', async () => {
    const { POST } = await import('@/app/api/board/settings/byodb/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      return tenantChain({ id: 'tenant-1', state: 'Registered', owner_id: 'u1', name: 'Acme', created_at: '', updated_at: '' })
    })

    const provisioningUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const rollbackUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const updateFn = vi.fn()
      .mockReturnValueOnce({ eq: provisioningUpdateEq })   // first update: Registered → Provisioning
      .mockReturnValueOnce({ eq: rollbackUpdateEq })        // second update: rollback → Registered

    mockAdminFrom.mockReturnValue({ update: updateFn })
    mockRegister.mockRejectedValue(new ConnectivityError('host unreachable'))

    const res = await POST(makeRequest(validInput))

    expect(res.status).toBe(400)
    // First update must set state to Provisioning
    expect(updateFn).toHaveBeenNthCalledWith(1, { state: 'Provisioning' })
    // Second update must roll back to Registered
    expect(updateFn).toHaveBeenNthCalledWith(2, { state: 'Registered' })
    expect(rollbackUpdateEq).toHaveBeenCalledWith('id', 'tenant-1')
  })

  it('rolls back tenant state to Registered when register() throws CredentialValidationError after Registered→Provisioning transition', async () => {
    const { POST } = await import('@/app/api/board/settings/byodb/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      return tenantChain({ id: 'tenant-1', state: 'Registered', owner_id: 'u1', name: 'Acme', created_at: '', updated_at: '' })
    })

    const provisioningUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const rollbackUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const updateFn = vi.fn()
      .mockReturnValueOnce({ eq: provisioningUpdateEq })   // first update: Registered → Provisioning
      .mockReturnValueOnce({ eq: rollbackUpdateEq })        // second update: rollback → Registered

    mockAdminFrom.mockReturnValue({ update: updateFn })
    mockRegister.mockRejectedValue(new CredentialValidationError('bad creds'))

    const res = await POST(makeRequest(validInput))

    expect(res.status).toBe(400)
    // First update must set state to Provisioning
    expect(updateFn).toHaveBeenNthCalledWith(1, { state: 'Provisioning' })
    // Second update must roll back to Registered
    expect(updateFn).toHaveBeenNthCalledWith(2, { state: 'Registered' })
    expect(rollbackUpdateEq).toHaveBeenCalledWith('id', 'tenant-1')
  })

  it('returns 200 and updates tenant state on successful registration', async () => {
    const { POST } = await import('@/app/api/board/settings/byodb/route')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const updateEqFn = vi.fn().mockResolvedValue({ error: null })
    const updateFn = vi.fn().mockReturnValue({ eq: updateEqFn })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return profileChain('board')
      return tenantChain({ id: 'tenant-1', state: 'Provisioning', owner_id: 'u1', name: 'Acme', created_at: '', updated_at: '' })
    })

    mockAdminFrom.mockReturnValue({ update: updateFn })

    mockRegister.mockResolvedValue({
      tenant: { state: 'Active' },
      secretId: 'sec-1',
    })

    const res = await POST(makeRequest(validInput))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.state).toBe('Active')
    // tenants.update called with Active state
    expect(updateFn).toHaveBeenCalledWith({ state: 'Active' })
  })
})
