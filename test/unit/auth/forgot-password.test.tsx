// The forgot-password page now redirects to /login?mode=forgot.
// The forgot-password form and its behavior are tested in login.test.tsx.

import { redirect } from 'next/navigation'
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

describe('ForgotPasswordPage', () => {
  it('redirects to /login?mode=forgot', () => {
    ForgotPasswordPage()
    expect(redirect).toHaveBeenCalledWith('/login?mode=forgot')
  })
})
