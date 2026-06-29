import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  LoadingState,
  EmptyState,
  ErrorState,
  RestrictedState,
  UnavailableState,
  Skel,
} from '@/components/layout/shell/ContentStates'

describe('Skel', () => {
  it('renders a shimmer element', () => {
    const { container } = render(<Skel />)
    const el = container.firstChild as HTMLElement
    expect(el).toBeTruthy()
    expect(el.tagName).toBe('DIV')
  })
})

describe('LoadingState', () => {
  it('renders shimmer grid using Skel components with no text content', () => {
    const { container } = render(<LoadingState />)
    // Should have multiple Skel divs (no visible text content — strip style tags)
    const styleEls = container.querySelectorAll('style')
    styleEls.forEach((el) => el.remove())
    const text = container.textContent?.trim()
    expect(text).toBe('')
    // Should have multiple skeleton divs
    const divs = container.querySelectorAll('div')
    expect(divs.length).toBeGreaterThan(1)
  })
})

describe('EmptyState', () => {
  it('renders the icon and message text', () => {
    render(<EmptyState icon={<span data-testid="test-icon" />} message="No data found" />)
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    expect(screen.getByText('No data found')).toBeInTheDocument()
  })

  it('renders a button with ctaLabel when ctaLabel and onCta are provided', () => {
    const onCta = vi.fn()
    render(<EmptyState message="No data" ctaLabel="Add item" onCta={onCta} />)
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument()
  })

  it('renders no button when ctaLabel is not provided', () => {
    render(<EmptyState message="No data" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('renders cloud_off icon equivalent and Retry button', () => {
    render(<ErrorState />)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('renders Report issue button', () => {
    render(<ErrorState />)
    expect(screen.getByRole('button', { name: /report issue/i })).toBeInTheDocument()
  })

  it('calls onRetry when Retry button clicked', async () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('calls onReport when Report issue button clicked', async () => {
    const onReport = vi.fn()
    render(<ErrorState onReport={onReport} />)
    await userEvent.click(screen.getByRole('button', { name: /report issue/i }))
    expect(onReport).toHaveBeenCalledTimes(1)
  })
})

describe('RestrictedState', () => {
  it('renders 403 and Restricted text', () => {
    render(<RestrictedState />)
    expect(screen.getByText(/403/)).toBeInTheDocument()
    expect(screen.getByText(/restricted/i)).toBeInTheDocument()
  })

  it('renders Back to Overview button', () => {
    render(<RestrictedState />)
    expect(screen.getByRole('button', { name: /back to overview/i })).toBeInTheDocument()
  })

  it('renders Request access button', () => {
    render(<RestrictedState />)
    expect(screen.getByRole('button', { name: /request access/i })).toBeInTheDocument()
  })

  it('calls onBack when Back to Overview clicked', async () => {
    const onBack = vi.fn()
    render(<RestrictedState onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /back to overview/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('calls onRequestAccess when Request access clicked', async () => {
    const onRequestAccess = vi.fn()
    render(<RestrictedState onRequestAccess={onRequestAccess} />)
    await userEvent.click(screen.getByRole('button', { name: /request access/i }))
    expect(onRequestAccess).toHaveBeenCalledTimes(1)
  })
})

describe('UnavailableState', () => {
  it('renders Upgrade plan button', () => {
    render(<UnavailableState />)
    expect(screen.getByRole('button', { name: /upgrade plan/i })).toBeInTheDocument()
  })

  it("renders See what's included button", () => {
    render(<UnavailableState />)
    expect(screen.getByRole('button', { name: /see what's included/i })).toBeInTheDocument()
  })
})
