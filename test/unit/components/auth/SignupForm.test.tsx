import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SignupForm from '@/components/auth/SignupForm'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockSignUp = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signUp: mockSignUp, signInWithOAuth: vi.fn() },
  }),
}))

describe('SignupForm', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockSignUp.mockReset()
  })

  it('renders email, password fields and submit button — no Google button', () => {
    render(<SignupForm />)
    expect(screen.getByPlaceholderText(/you@evecosys.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.queryByText(/continue with google/i)).not.toBeInTheDocument()
  })

  it('calls signUp with email and password on submit', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    render(<SignupForm />)

    fireEvent.change(screen.getByPlaceholderText(/you@evecosys.com/i), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'password123' }))
  })

  it('redirects to /login after successful signup when no onSuccess callback', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    render(<SignupForm />)

    fireEvent.change(screen.getByPlaceholderText(/you@evecosys.com/i), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'))
  })

  it('calls onSuccess callback instead of redirecting when provided', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const onSuccess = vi.fn()
    render(<SignupForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByPlaceholderText(/you@evecosys.com/i), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows error message on signup failure', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: { message: 'Email already registered' } })
    render(<SignupForm />)

    fireEvent.change(screen.getByPlaceholderText(/you@evecosys.com/i), { target: { value: 'taken@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(screen.getByText(/unable to create account/i)).toBeInTheDocument())
  })
})
