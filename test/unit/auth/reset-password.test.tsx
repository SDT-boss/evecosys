import { render, screen, fireEvent } from '@testing-library/react'
import ResetPasswordPage from '@/app/auth/reset-password/page'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      updateUser: vi.fn().mockResolvedValue({}),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    from: () => ({ select: () => ({ single: async () => ({ role: 'driver' }) }) }),
  }),
}))

describe('ResetPasswordPage', () => {
  it('validates and submits new password', async () => {
    render(<ResetPasswordPage />)
    const newPwd = screen.getByPlaceholderText(/new password/i)
    const confirm = screen.getByPlaceholderText(/confirm password/i)
    const submit = screen.getByRole('button', { name: /update password/i })
    fireEvent.change(newPwd, { target: { value: 'password123' } })
    fireEvent.change(confirm, { target: { value: 'password123' } })
    fireEvent.click(submit)
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument()
  })
})
