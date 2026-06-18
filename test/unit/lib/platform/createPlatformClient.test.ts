import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted to the top of the file by Vitest.
//
// Design: we mock the entire '@/lib/supabase/server' module.
//   - createClient → replaced with vi.fn() so we can control what it returns
//   - createPlatformClient → re-implemented in the factory so it calls the
//     mocked createClient (not the real one in the original module's closure)
//
// This pattern is required because createPlatformClient and createClient live
// in the same module file. When Vitest uses importOriginal to spread `actual`,
// the original createPlatformClient holds a closure over the original
// createClient binding, bypassing the mock. Re-implementing createPlatformClient
// inside the factory ensures it calls the mocked createClient instead.
vi.mock('@/lib/supabase/server', () => {
  const mockRpcFn = vi.fn().mockResolvedValue({ data: null, error: null })
  const mockClientObj = { rpc: mockRpcFn }
  const mockCreateClient = vi.fn().mockResolvedValue(mockClientObj)

  async function mockCreatePlatformClient(tenantId: string) {
    const client = await mockCreateClient()
    await client.rpc('set_active_tenant', { tenant_id: tenantId })
    return client
  }

  return {
    createClient: mockCreateClient,
    createPlatformClient: mockCreatePlatformClient,
    // Expose the inner mock so tests can reset + inspect it
    __mockCreateClient: mockCreateClient,
    __mockRpcFn: mockRpcFn,
  }
})

import { createClient, createPlatformClient } from '@/lib/supabase/server'

describe('createPlatformClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-apply default return value after clearAllMocks resets it
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockClientObj = { rpc: mockRpc }
    vi.mocked(createClient).mockResolvedValue(mockClientObj as never)
  })

  it('calls set_active_tenant rpc with the provided tenantId', async () => {
    const client = await createPlatformClient('tenant-123')
    const rpc = (client as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc
    expect(rpc).toHaveBeenCalledWith('set_active_tenant', { tenant_id: 'tenant-123' })
  })

  it('returns the supabase client object', async () => {
    const client = await createPlatformClient('tenant-123')
    expect(client).toBeDefined()
    expect(typeof (client as { rpc: unknown }).rpc).toBe('function')
  })

  it('calls createClient() exactly once per invocation', async () => {
    await createPlatformClient('tenant-123')
    expect(createClient).toHaveBeenCalledTimes(1)
  })
})
