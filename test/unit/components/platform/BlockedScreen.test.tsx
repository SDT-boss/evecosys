import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockedScreen } from '@/components/platform/BlockedScreen'

describe('BlockedScreen', () => {
  it('renders the EmptyState title "Select a workspace to continue"', () => {
    render(<BlockedScreen />)
    expect(screen.getByText('Select a workspace to continue')).toBeInTheDocument()
  })

  it('renders description text matching /requires an active workspace/i', () => {
    render(<BlockedScreen />)
    expect(screen.getByText(/requires an active workspace/i)).toBeInTheDocument()
  })

  it('renders a link to /platform with accessible name /go to tenant list/i', () => {
    render(<BlockedScreen />)
    const link = screen.getByRole('link', { name: /go to tenant list/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/platform')
  })
})
