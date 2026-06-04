import { render, screen } from '@testing-library/react'
import { Spinner } from '@/design-system/components/Spinner'

describe('Spinner', () => {
  // ─── Accessibility ────────────────────────────────────────────────────────

  it('has role="status" for screen readers', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has default aria-label="Loading"', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading')
  })

  it('accepts a custom aria-label', () => {
    render(<Spinner aria-label="Saving trip data" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Saving trip data')
  })

  // ─── Sizes ────────────────────────────────────────────────────────────────

  // SVG elements use SVGAnimatedString for className — must use getAttribute('class')
  it('sm size carries h-4 w-4', () => {
    render(<Spinner size="sm" />)
    const cls = screen.getByRole('status').getAttribute('class') ?? ''
    expect(cls).toContain('h-4')
    expect(cls).toContain('w-4')
  })

  it('md size (default) carries h-6 w-6', () => {
    render(<Spinner />)
    const cls = screen.getByRole('status').getAttribute('class') ?? ''
    expect(cls).toContain('h-6')
    expect(cls).toContain('w-6')
  })

  it('lg size carries h-10 w-10', () => {
    render(<Spinner size="lg" />)
    const cls = screen.getByRole('status').getAttribute('class') ?? ''
    expect(cls).toContain('h-10')
    expect(cls).toContain('w-10')
  })

  // ─── Colour ───────────────────────────────────────────────────────────────

  it('default colour is Jade (--ds-color-brand-primary)', () => {
    render(<Spinner />)
    const cls = screen.getByRole('status').getAttribute('class') ?? ''
    expect(cls).toContain('text-[var(--ds-color-brand-primary)]')
  })

  it('className override applies (e.g. white for use inside Jade button)', () => {
    render(<Spinner className="text-white" />)
    const cls = screen.getByRole('status').getAttribute('class') ?? ''
    expect(cls).toContain('text-white')
  })

  // ─── Animation ────────────────────────────────────────────────────────────

  it('carries animate-spin class', () => {
    render(<Spinner />)
    const cls = screen.getByRole('status').getAttribute('class') ?? ''
    expect(cls).toContain('animate-spin')
  })
})
