import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

vi.mock('@/app/(dashboard)/platform/actions', () => ({
  setActiveTenant: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/components/platform/TenantContext', () => ({
  useTenantContext: vi.fn().mockReturnValue({
    activeTenantId: null,
    setActiveTenantId: vi.fn(),
    activeTenantName: null,
    setActiveTenantName: vi.fn(),
  }),
}))

import { TenantList } from '@/components/platform/TenantList'
import { setActiveTenant } from '@/app/(dashboard)/platform/actions'
import { useTenantContext } from '@/components/platform/TenantContext'

const MOCK_TENANTS = [
  { id: 'tid-1', name: 'Acme Fleet', status: 'Active' as const },
  { id: 'tid-2', name: 'Beta Corp', status: 'Pending' as const },
]

describe('TenantList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders tenant names from props', () => {
    render(<TenantList tenants={MOCK_TENANTS} />)
    expect(screen.getByText('Acme Fleet')).toBeInTheDocument()
    expect(screen.getByText('Beta Corp')).toBeInTheDocument()
  })

  it('renders a Badge for each tenant status', () => {
    render(<TenantList tenants={MOCK_TENANTS} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders EmptyState when tenants array is empty', () => {
    render(<TenantList tenants={[]} />)
    expect(screen.getByText('No tenants found')).toBeInTheDocument()
  })

  it('renders error state when error prop is set', () => {
    render(<TenantList tenants={[]} error="Could not load tenants" />)
    expect(screen.getByText('Could not load tenants')).toBeInTheDocument()
  })

  it('calls setActiveTenant with tenant id on row click', async () => {
    render(<TenantList tenants={MOCK_TENANTS} />)
    const acmeRow = screen.getByRole('button', { name: /Set Acme Fleet as active workspace/i })
    await act(async () => { fireEvent.click(acmeRow) })
    expect(setActiveTenant).toHaveBeenCalledWith('tid-1')
  })
})

describe('TenantList — loading state (SWIT-01)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows Spinner and hides tenant name text on pending row', async () => {
    vi.mocked(setActiveTenant).mockImplementation(() => new Promise(() => {}))
    render(<TenantList tenants={MOCK_TENANTS} />)
    const acmeRow = screen.getByRole('button', { name: /Set Acme Fleet as active workspace/i })
    await act(async () => { fireEvent.click(acmeRow) })
    expect(screen.queryByText('Acme Fleet')).not.toBeInTheDocument()
  })

  it('sets aria-busy on the Table when isPending', async () => {
    vi.mocked(setActiveTenant).mockImplementation(() => new Promise(() => {}))
    render(<TenantList tenants={MOCK_TENANTS} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Set Acme Fleet as active workspace/i }))
    })
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
  })

  it('sets aria-disabled on non-pending rows when isPending', async () => {
    vi.mocked(setActiveTenant).mockImplementation(() => new Promise(() => {}))
    render(<TenantList tenants={MOCK_TENANTS} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Set Acme Fleet as active workspace/i }))
    })
    const betaRow = screen.getByRole('button', { name: /Set Beta Corp as active workspace/i })
    expect(betaRow).toHaveAttribute('aria-disabled', 'true')
  })
})

describe('TenantList — error state (SWIT-03)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows Alert with error message after failed switch', async () => {
    vi.mocked(setActiveTenant).mockResolvedValue({ ok: false, error: 'DB error' })
    render(<TenantList tenants={MOCK_TENANTS} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Set Acme Fleet as active workspace/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Failed to switch workspace/)).toBeInTheDocument()
    )
  })

  it('dismiss button removes the Alert', async () => {
    vi.mocked(setActiveTenant).mockResolvedValue({ ok: false, error: 'DB error' })
    render(<TenantList tenants={MOCK_TENANTS} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Set Acme Fleet as active workspace/i }))
    })
    await waitFor(() => screen.getByText(/Failed to switch workspace/))
    fireEvent.click(screen.getByRole('button', { name: /Dismiss error/i }))
    expect(screen.queryByText(/Failed to switch workspace/)).not.toBeInTheDocument()
  })
})

describe('TenantList — optimistic update (SWIT-02)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls setActiveTenantName immediately on row click', async () => {
    const mockSetActiveTenantName = vi.fn()
    vi.mocked(useTenantContext).mockReturnValue({
      activeTenantId: null,
      setActiveTenantId: vi.fn(),
      activeTenantName: null,
      setActiveTenantName: mockSetActiveTenantName,
    })
    render(<TenantList tenants={MOCK_TENANTS} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Set Acme Fleet as active workspace/i }))
    })
    expect(mockSetActiveTenantName).toHaveBeenCalledWith('Acme Fleet')
  })
})
