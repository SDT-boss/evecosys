import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/(auth)/login/page'

const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => ({ get: () => null }),
}))

const mockSignIn = vi.fn()
 
let mockFromImpl: (...args: any[]) => any = () => ({
  select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignIn, signInWithOAuth: vi.fn() },
    from: (arg: string) => mockFromImpl(arg),
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockRefresh.mockClear()
    mockSignIn.mockReset()
    mockFromImpl = () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
    })
  })

  it('renders email, password fields and sign-in button — no Google button', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText(/you@company\.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.queryByText(/continue with google/i)).not.toBeInTheDocument()
  })

  it('shows error on invalid credentials', async () => {
    mockSignIn.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login credentials' } })
    render(<LoginPage />)

    fireEvent.change(screen.getByPlaceholderText(/you@company\.com/i), { target: { value: 'bad@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument())
  })

  it('shows routing screen with Driver App label on driver login', async () => {
    mockSignIn.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockFromImpl = () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'driver' } }) }) }),
    })
    render(<LoginPage />)

    fireEvent.change(screen.getByPlaceholderText(/you@company\.com/i), { target: { value: 'driver@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText('Driver App')).toBeInTheDocument())
  })

  it('shows routing screen with Fleet Manager label on manager login', async () => {
    mockSignIn.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null })
    mockFromImpl = () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'manager' } }) }) }),
    })
    render(<LoginPage />)

    fireEvent.change(screen.getByPlaceholderText(/you@company\.com/i), { target: { value: 'manager@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText('Fleet Manager')).toBeInTheDocument())
  })

  it('shows routing screen on login (forced-reset redirect is handled by middleware)', async () => {
    mockSignIn.mockResolvedValue({ data: { user: { id: 'u3' } }, error: null })
    mockFromImpl = () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'driver' } }) }) }),
    })
    render(<LoginPage />)

    fireEvent.change(screen.getByPlaceholderText(/you@company\.com/i), { target: { value: 'driver@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText(/taking you to your workspace/i)).toBeInTheDocument())
  })
})
