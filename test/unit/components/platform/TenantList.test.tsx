import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/app/(dashboard)/platform/actions', () => ({
  setActiveTenant: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/components/platform/TenantContext', () => ({
  useTenantContext: vi.fn().mockReturnValue({ activeTenantName: null, setActiveTenantName: vi.fn() }),
}))

import { TenantList } from '@/components/platform/TenantList'
import { setActiveTenant } from '@/app/(dashboard)/platform/actions'

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
    fireEvent.click(acmeRow)
    expect(setActiveTenant).toHaveBeenCalledWith('tid-1')
  })
})
