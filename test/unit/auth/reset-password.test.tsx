import { render, screen, fireEvent } from '@testing-library/react'
import ResetPasswordPage from '@/app/auth/reset-password/page'
import { makeSupabaseMock } from '@/test/utils/supabaseMock'

const mockSupabase = makeSupabaseMock({
  auth: {
    updateUser: vi.fn().mockResolvedValue({}),
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
  },
})

vi.mock('@/lib/supabase/client', () => ({ createClient: () => mockSupabase }))

describe('ResetPasswordPage', () => {
  it('validates and submits new password', async () => {
    render(<ResetPasswordPage />)
  const inputs = screen.getAllByPlaceholderText(/•+/)
  const newPwd = inputs[0]
  const confirm = inputs[1]
    const submit = screen.getByRole('button', { name: /update password/i })
    fireEvent.change(newPwd, { target: { value: 'password123' } })
  fireEvent.change(confirm, { target: { value: 'password123' } })
  fireEvent.click(submit)
  expect(await screen.findByText(/password updated/i)).toBeInTheDocument()
  // ensure updateUser was called with the new password
  expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'password123' })
  })
})
