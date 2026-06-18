import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted to the top of the file by Vitest.
// Variables defined outside the factory cannot be referenced inside it
// (they are not yet initialised when the factory runs).
// Use vi.fn() directly inside the factory and retrieve the mocks
// via vi.mocked() or module-level imports after the mock is registered.
vi.mock('@/lib/supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/server')>()
  return {
    ...actual,
    createClient: vi.fn().mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }
})

import { createClient, createPlatformClient } from '@/lib/supabase/server'

describe('createPlatformClient', () => {
  beforeEach(() => {
    // Reset mock call history and re-apply default return values before each test
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it('calls set_active_tenant rpc with the provided tenantId', async () => {
    const client = await createPlatformClient('tenant-123')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((client as any).rpc).toHaveBeenCalledWith('set_active_tenant', { tenant_id: 'tenant-123' })
  })

  it('returns the supabase client object', async () => {
    const client = await createPlatformClient('tenant-123')
    expect(client).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (client as any).rpc).toBe('function')
  })

  it('calls createClient() exactly once per invocation', async () => {
    await createPlatformClient('tenant-123')
    expect(createClient).toHaveBeenCalledTimes(1)
  })
})
