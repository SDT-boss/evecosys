import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SignupForm from '@/components/auth/SignupForm'
import { makeSupabaseMock } from '@/test/utils/supabaseMock'

const mockSupabase = makeSupabaseMock({ auth: { signUp: vi.fn().mockResolvedValue({ data: null }) } })
vi.mock('@/lib/supabase/client', () => ({ createClient: () => mockSupabase }))

describe('SignupForm', () => {
  it('renders form fields and submits', async () => {
    render(<SignupForm showGoogle={false} />)
    const email = screen.getByPlaceholderText(/you@evecosys.com/i)
    const password = screen.getByPlaceholderText(/\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022/i)
    const submit = screen.getByRole('button', { name: /create account/i })

    fireEvent.change(email, { target: { value: 'test@example.com' } })
    fireEvent.change(password, { target: { value: 'password123' } })
    fireEvent.click(submit)

    await waitFor(() => expect(submit).toBeDisabled())
    expect(mockSupabase.auth.signUp).toHaveBeenCalled()
  })
})
