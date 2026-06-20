import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActiveTenantIndicator } from '@/components/platform/ActiveTenantIndicator'

describe('ActiveTenantIndicator', () => {
  it('renders placeholder text when name is null', () => {
    render(<ActiveTenantIndicator name={null} />)
    expect(screen.getByText('No workspace selected')).toBeInTheDocument()
  })

  it('renders tenant name when name is provided', () => {
    render(<ActiveTenantIndicator name="Acme Fleet" />)
    expect(screen.getByText('Acme Fleet')).toBeInTheDocument()
  })

  it('does not render placeholder when name is provided', () => {
    render(<ActiveTenantIndicator name="Acme Fleet" />)
    expect(screen.queryByText('No workspace selected')).not.toBeInTheDocument()
  })
})

describe('ActiveTenantIndicator — Phase 3 context integration (SWIT-02)', () => {
  it.todo('reads activeTenantName from TenantContext')
  it.todo('shows "No workspace selected" when context name is null')
})
