import { render, screen, fireEvent } from '@testing-library/react'
import { makeSupabaseStub } from '@/test/utils/supabaseStub'
import ResetPasswordPage from '@/app/(auth)/reset-password/page'

const stub = makeSupabaseStub()
vi.mock('@/lib/supabase/client', () => ({ createClient: () => stub }))

describe('Reset password integration', () => {
  it('updates password and persists forced reset flag', async () => {
    render(<ResetPasswordPage />)
    const inputs = screen.getAllByPlaceholderText(/•+/)
    const newPwd = inputs[0]
    const confirm = inputs[1]
    const submit = screen.getByRole('button', { name: /update password/i })

    fireEvent.change(newPwd, { target: { value: 'newpass123' } })
    fireEvent.change(confirm, { target: { value: 'newpass123' } })
    fireEvent.click(submit)

    expect(await screen.findByText(/password updated/i)).toBeInTheDocument()
  })
})
