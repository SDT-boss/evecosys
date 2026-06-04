import { render, screen } from '@testing-library/react'
import { StatCard } from '@/design-system/components/StatCard'
import { Zap } from 'lucide-react'

describe('StatCard', () => {
  // ─── Happy path — basic rendering ─────────────────────────────────────────

  it('renders the label', () => {
    render(<StatCard label="Fleet utilisation" value="84" />)
    expect(screen.getByText('Fleet utilisation')).toBeInTheDocument()
  })

  it('renders the numeric value', () => {
    render(<StatCard label="Active vehicles" value={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders a string value', () => {
    render(<StatCard label="Status" value="Healthy" />)
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('renders the unit when provided', () => {
    render(<StatCard label="Efficiency" value="4.2" unit="mi/kWh" />)
    expect(screen.getByText('mi/kWh')).toBeInTheDocument()
  })

  it('renders an icon in the icon slot', () => {
    render(<StatCard label="Energy" value="120" icon={<Zap data-testid="stat-icon" />} />)
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument()
  })

  it('renders the description when provided', () => {
    render(<StatCard label="Trips" value="8" description="This week" />)
    expect(screen.getByText('This week')).toBeInTheDocument()
  })

  it('carries correct surface tokens (white bg, ds-shadow-sm)', () => {
    const { container } = render(<StatCard label="L" value="0" />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('[box-shadow:var(--ds-shadow-sm)]')
    expect(card.className).toContain('bg-white')
  })

  // ─── Trend directions ─────────────────────────────────────────────────────

  it('trend="up" renders Volt Green Strong text colour', () => {
    render(<StatCard label="L" value="0" trend="up" trendValue="+6%" />)
    const trendRow = screen.getByText('+6%').closest('div')
    expect(trendRow!.className).toContain('--ds-color-brand-secondary-strong')
  })

  it('trend="up" renders the ↑ arrow', () => {
    render(<StatCard label="L" value="0" trend="up" trendValue="+6%" />)
    expect(screen.getByText('↑')).toBeInTheDocument()
  })

  it('trend="down" renders status-error text colour', () => {
    render(<StatCard label="L" value="0" trend="down" trendValue="-3%" />)
    const trendRow = screen.getByText('-3%').closest('div')
    expect(trendRow!.className).toContain('--ds-color-status-error')
  })

  it('trend="down" renders the ↓ arrow', () => {
    render(<StatCard label="L" value="0" trend="down" trendValue="-3%" />)
    expect(screen.getByText('↓')).toBeInTheDocument()
  })

  it('trend="neutral" renders grey-60 text colour', () => {
    render(<StatCard label="L" value="0" trend="neutral" trendValue="0%" />)
    const trendRow = screen.getByText('0%').closest('div')
    expect(trendRow!.className).toContain('--ds-color-neutral-grey-60')
  })

  it('renders trendLabel alongside trendValue', () => {
    render(<StatCard label="L" value="0" trend="up" trendValue="+6%" trendLabel="vs last week" />)
    expect(screen.getByText('vs last week')).toBeInTheDocument()
  })

  // ─── Unhappy path — missing optional props ─────────────────────────────────

  it('no unit → unit element absent', () => {
    render(<StatCard label="L" value="84" />)
    expect(screen.queryByText('kWh')).not.toBeInTheDocument()
  })

  it('no trend → trend row absent', () => {
    render(<StatCard label="L" value="84" />)
    expect(screen.queryByText('↑')).not.toBeInTheDocument()
    expect(screen.queryByText('↓')).not.toBeInTheDocument()
  })

  it('no icon → icon container absent', () => {
    const { container } = render(<StatCard label="L" value="84" />)
    // The icon wrapper div uses h-10 w-10 — confirm it is not present
    expect(container.querySelector('[class*="h-10 w-10"]')).not.toBeInTheDocument()
  })
})
