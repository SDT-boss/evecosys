import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/auth/login/page'
import { makeSupabaseMock } from '@/test/utils/supabaseMock'

const mockSupabase = makeSupabaseMock({ auth: { signInWithOAuth: vi.fn() } })
vi.mock('@/lib/supabase/client', () => ({ createClient: () => mockSupabase }))

describe('LoginPage', () => {
  it('renders Google SSO button', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })
})
