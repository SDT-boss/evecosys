import { render, screen } from '@testing-library/react'

import LoginPage from '@/app/auth/login/page'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
    from: () => ({ select: () => ({ single: async () => ({}) }) }),
  }),
}))

describe('LoginPage', () => {
  it('renders Google SSO button', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })
})
