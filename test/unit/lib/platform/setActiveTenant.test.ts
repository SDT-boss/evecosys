import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock calls are hoisted to the top of the file by Vitest.
// Mock next/headers before importing the module under test.
vi.mock('next/headers', () => {
  const mockSet = vi.fn()
  const mockGet = vi.fn()
  const mockCookieStore = { set: mockSet, get: mockGet }
  return {
    cookies: vi.fn().mockResolvedValue(mockCookieStore),
    __mockSet: mockSet,
    __mockGet: mockGet,
    __mockCookieStore: mockCookieStore,
  }
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { setActiveTenant } from '@/app/(dashboard)/platform/actions'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

beforeEach(() => {
  vi.clearAllMocks()
  // Re-apply default mock after clearAllMocks resets it
  const mockSet = vi.fn()
  const mockGet = vi.fn()
  const mockCookieStore = { set: mockSet, get: mockGet }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(cookies).mockResolvedValue(mockCookieStore as any)
})

describe('setActiveTenant', () => {
  it('sets platform_active_tenant cookie with correct name, value, path and httpOnly', async () => {
    const mockCookieStore = await vi.mocked(cookies)()
    await setActiveTenant('tenant-uuid-123')
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'platform_active_tenant',
      'tenant-uuid-123',
      expect.objectContaining({ path: '/platform', httpOnly: false }),
    )
  })

  it('does not set a maxAge on the cookie (session-duration cookie per D-07)', async () => {
    const mockCookieStore = await vi.mocked(cookies)()
    await setActiveTenant('tenant-uuid-123')
    const callArgs = (mockCookieStore.set as ReturnType<typeof vi.fn>).mock.calls[0]
    const cookieOptions = callArgs[2] as Record<string, unknown>
    expect(cookieOptions).not.toMatchObject({ maxAge: expect.anything() })
  })

  it('calls revalidatePath with /platform and layout type', async () => {
    await setActiveTenant('tenant-uuid-123')
    expect(revalidatePath).toHaveBeenCalledWith('/platform', 'layout')
  })

  it('uses the exact cookie name platform_active_tenant', async () => {
    const mockCookieStore = await vi.mocked(cookies)()
    await setActiveTenant('some-tenant-id')
    const cookieName = (mockCookieStore.set as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(cookieName).toBe('platform_active_tenant')
  })
})

describe('setActiveTenant — ActionResult return type (Phase 3)', () => {
  it('resolves to { ok: true } when cookie write succeeds', async () => {
    const result = await setActiveTenant('tenant-uuid-123')
    expect(result).toEqual({ ok: true })
  })

  it('resolves to { ok: false, error } when cookieStore.set throws an Error', async () => {
    const mockCookieStore = await vi.mocked(cookies)()
    vi.mocked(mockCookieStore.set).mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })
    const result = await setActiveTenant('tenant-uuid-123')
    expect(result).toEqual({ ok: false, error: 'Storage quota exceeded' })
  })

  it('resolves to { ok: false, error: "Cookie write failed" } when cookieStore.set throws a non-Error value', async () => {
    const mockCookieStore = await vi.mocked(cookies)()
    vi.mocked(mockCookieStore.set).mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'some string error'
    })
    const result = await setActiveTenant('tenant-uuid-123')
    expect(result).toEqual({ ok: false, error: 'Cookie write failed' })
  })
})
