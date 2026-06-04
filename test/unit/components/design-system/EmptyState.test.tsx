import { render, screen } from '@testing-library/react'
import { EmptyState } from '@/design-system/components/EmptyState'
import { Button } from '@/design-system/components/Button'
import { Car } from 'lucide-react'

describe('EmptyState', () => {
  // ─── Happy path ───────────────────────────────────────────────────────────

  it('renders the title', () => {
    render(<EmptyState title="No vehicles yet" />)
    expect(screen.getByText('No vehicles yet')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="No trips" description="Assign a vehicle to start recording trips." />)
    expect(screen.getByText(/Assign a vehicle/)).toBeInTheDocument()
  })

  it('renders an action when provided', () => {
    render(
      <EmptyState title="No vehicles" action={<Button>Add vehicle</Button>} />
    )
    expect(screen.getByRole('button', { name: 'Add vehicle' })).toBeInTheDocument()
  })

  it('renders icon inside a circular container', () => {
    render(
      <EmptyState title="All clear" icon={<Car data-testid="empty-icon" />} />
    )
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument()
  })

  it('icon container carries grey-10 bg and Jade icon colour', () => {
    const { container } = render(
      <EmptyState title="x" icon={<Car />} />
    )
    const iconWrapper = container.querySelector('[class*="grey-10"]')
    expect(iconWrapper).toBeInTheDocument()
    expect(iconWrapper!.className).toContain('--ds-color-brand-primary')
  })

  it('title renders as h3', () => {
    render(<EmptyState title="Empty fleet" />)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Empty fleet')
  })

  it('forwards additional className to the root', () => {
    const { container } = render(<EmptyState title="x" className="mt-8" />)
    expect((container.firstChild as HTMLElement).className).toContain('mt-8')
  })

  // ─── Unhappy path — missing optional props ─────────────────────────────────

  it('no icon → icon wrapper absent', () => {
    const { container } = render(<EmptyState title="No data" />)
    expect(container.querySelector('[class*="rounded-[var(--ds-radius-full)]"]')).not.toBeInTheDocument()
  })

  it('no description → only the heading is rendered (no extra text nodes)', () => {
    const { container } = render(<EmptyState title="No data" />)
    // Confirm no <p> tag exists (description renders as a <p>)
    expect(container.querySelector('p')).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading')).toHaveLength(1)
  })

  it('no action → action wrapper absent', () => {
    render(<EmptyState title="No data" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
