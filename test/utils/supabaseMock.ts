import { vi } from 'vitest'

type AuthShape = Record<string, any>
type FromShape = Record<string, any>

export function makeSupabaseMock(overrides: { auth?: AuthShape; from?: FromShape } = {}) {
  const defaultAuth: AuthShape = {
    signUp: vi.fn().mockResolvedValue({ data: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({}),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null } }),
    updateUser: vi.fn().mockResolvedValue({}),
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({}),
  }

  const defaultFrom = () => ({
    select: () => ({ single: async () => ({ role: 'driver' }) }),
    update: () => ({ eq: async () => ({}) }),
  })

  const auth = { ...defaultAuth, ...(overrides.auth ?? {}) }
  const fromFactory = overrides.from ? (() => ({ ...defaultFrom(), ...(overrides.from as any) })) : defaultFrom

  return {
    auth,
    from: fromFactory,
  }
}

export function createClientMock(overrides = {}) {
  return makeSupabaseMock(overrides)
}
