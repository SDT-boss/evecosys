import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/platform/TenantContext', () => ({
  useTenantContext: vi.fn(),
}))

import { ActiveTenantIndicator } from '@/components/platform/ActiveTenantIndicator'
import { useTenantContext } from '@/components/platform/TenantContext'

describe('ActiveTenantIndicator', () => {
  it('renders placeholder text when activeTenantName is null', () => {
    vi.mocked(useTenantContext).mockReturnValue({ activeTenantId: null, setActiveTenantId: vi.fn(), activeTenantName: null, setActiveTenantName: vi.fn() })
    render(<ActiveTenantIndicator />)
    expect(screen.getByText('No workspace selected')).toBeInTheDocument()
  })

  it('renders tenant name when activeTenantName is provided', () => {
    vi.mocked(useTenantContext).mockReturnValue({ activeTenantId: 'tenant-1', setActiveTenantId: vi.fn(), activeTenantName: 'Acme Fleet', setActiveTenantName: vi.fn() })
    render(<ActiveTenantIndicator />)
    expect(screen.getByText('Acme Fleet')).toBeInTheDocument()
  })

  it('does not render placeholder when activeTenantName is provided', () => {
    vi.mocked(useTenantContext).mockReturnValue({ activeTenantId: 'tenant-1', setActiveTenantId: vi.fn(), activeTenantName: 'Acme Fleet', setActiveTenantName: vi.fn() })
    render(<ActiveTenantIndicator />)
    expect(screen.queryByText('No workspace selected')).not.toBeInTheDocument()
  })
})

describe('ActiveTenantIndicator — Phase 3 context integration (SWIT-02)', () => {
  it('reads activeTenantName from TenantContext', () => {
    vi.mocked(useTenantContext).mockReturnValue({ activeTenantId: 'tenant-2', setActiveTenantId: vi.fn(), activeTenantName: 'Beta Corp', setActiveTenantName: vi.fn() })
    render(<ActiveTenantIndicator />)
    expect(screen.getByText('Beta Corp')).toBeInTheDocument()
  })

  it('shows "No workspace selected" when context name is null', () => {
    vi.mocked(useTenantContext).mockReturnValue({ activeTenantId: null, setActiveTenantId: vi.fn(), activeTenantName: null, setActiveTenantName: vi.fn() })
    render(<ActiveTenantIndicator />)
    expect(screen.getByText('No workspace selected')).toBeInTheDocument()
  })
})
