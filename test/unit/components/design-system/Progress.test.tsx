import { render, screen } from '@testing-library/react'
import { Progress } from '@/design-system/components/Progress'

function getIndicator(container: HTMLElement) {
  // The Radix indicator is the child of the root
  return container.querySelector('[style]') as HTMLElement
}

describe('Progress', () => {
  // ─── Happy path ───────────────────────────────────────────────────────────

  it('renders a progressbar role', () => {
    render(<Progress value={50} aria-label="Loading" />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('indicator translateX is 0% at value=100 (fully filled)', () => {
    const { container } = render(<Progress value={100} />)
    expect(getIndicator(container).style.transform).toBe('translateX(-0%)')
  })

  it('indicator translateX is -100% at value=0 (fully empty)', () => {
    const { container } = render(<Progress value={0} />)
    expect(getIndicator(container).style.transform).toBe('translateX(-100%)')
  })

  it('indicator translateX is -50% at value=50 (half filled)', () => {
    const { container } = render(<Progress value={50} />)
    expect(getIndicator(container).style.transform).toBe('translateX(-50%)')
  })

  it('track carries grey-10 background token', () => {
    render(<Progress value={60} />)
    expect(screen.getByRole('progressbar').className).toContain('--ds-color-neutral-grey-10')
  })

  it('indicator carries Jade primary token', () => {
    const { container } = render(<Progress value={60} />)
    expect(getIndicator(container).className).toContain('--ds-color-brand-primary')
  })

  it('carries motion tokens on the indicator', () => {
    const { container } = render(<Progress value={60} />)
    expect(getIndicator(container).className).toContain('--ds-motion-duration-slow')
  })

  // ─── Unhappy path ─────────────────────────────────────────────────────────

  it('value=undefined defaults to 0% fill (-100% translateX)', () => {
    const { container } = render(<Progress />)
    expect(getIndicator(container).style.transform).toBe('translateX(-100%)')
  })

  it('forwards className to the track', () => {
    render(<Progress value={30} className="h-4" />)
    expect(screen.getByRole('progressbar').className).toContain('h-4')
  })
})
