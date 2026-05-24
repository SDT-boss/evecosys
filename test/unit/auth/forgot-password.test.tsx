import { render, screen, fireEvent } from '@testing-library/react'
import ForgotPasswordPage from '@/app/auth/forgot-password/page'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { resetPasswordForEmail: vi.fn().mockResolvedValue({}) },
  }),
}))

describe('ForgotPasswordPage', () => {
  it('renders and allows submitting an email', async () => {
    render(<ForgotPasswordPage />)
    const input = screen.getByPlaceholderText(/you@evecosys.com/i)
    const submit = screen.getByRole('button', { name: /send reset link/i })
    fireEvent.change(input, { target: { value: 'test@example.com' } })
    expect(input).toHaveValue('test@example.com')
    fireEvent.click(submit)
    // expect some loading state or confirmation to appear
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument()
  })
})
