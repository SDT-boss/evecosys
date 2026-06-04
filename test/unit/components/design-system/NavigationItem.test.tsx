import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NavigationItem } from '@/design-system/components/NavigationItem'
import { BarChart2 } from 'lucide-react'

describe('NavigationItem', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders an anchor with the label', () => {
    render(<NavigationItem label="Dashboard" href="/dashboard" />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renders an icon when provided', () => {
    render(
      <NavigationItem label="Reports" href="/reports" icon={<BarChart2 data-testid="nav-icon" />} />
    )
    expect(screen.getByTestId('nav-icon')).toBeInTheDocument()
  })

  it('renders badge count when badge > 0', () => {
    render(<NavigationItem label="Alerts" href="/alerts" badge={7} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('caps badge display at "99+" for counts over 99', () => {
    render(<NavigationItem label="Alerts" href="/alerts" badge={150} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('badge=0 does not render the badge pill', () => {
    render(<NavigationItem label="Alerts" href="/alerts" badge={0} />)
    // No numeric badge should appear
    expect(screen.queryByLabelText(/unread/)).not.toBeInTheDocument()
  })

  // ─── Active state ─────────────────────────────────────────────────────────

  it('active item has aria-current="page"', () => {
    render(<NavigationItem label="Fleet" href="/fleet" isActive />)
    expect(screen.getByRole('link')).toHaveAttribute('aria-current', 'page')
  })

  it('active item carries Jade Strong text token', () => {
    render(<NavigationItem label="Fleet" href="/fleet" isActive />)
    expect(screen.getByRole('link').className).toContain('--ds-color-brand-primary-strong')
  })

  it('active item carries Jade border-l token', () => {
    render(<NavigationItem label="Fleet" href="/fleet" isActive />)
    expect(screen.getByRole('link').className).toContain('border-l-[var(--ds-color-brand-primary-strong)]')
  })

  it('inactive item does NOT have aria-current', () => {
    render(<NavigationItem label="Trips" href="/trips" />)
    expect(screen.getByRole('link')).not.toHaveAttribute('aria-current')
  })

  // ─── Disabled (unhappy path) ───────────────────────────────────────────────

  it('disabled item has pointer-events-none class', () => {
    render(<NavigationItem label="Admin" href="/admin" disabled />)
    expect(screen.getByRole('link').className).toContain('pointer-events-none')
  })

  it('disabled item carries grey-40 text token', () => {
    render(<NavigationItem label="Admin" href="/admin" disabled />)
    expect(screen.getByRole('link').className).toContain('--ds-color-neutral-grey-40')
  })

  // ─── Interactions ─────────────────────────────────────────────────────────

  it('fires onClick when clicked (non-disabled)', async () => {
    const onClick = vi.fn()
    render(<NavigationItem label="Fleet" href="/fleet" onClick={onClick} />)
    await userEvent.click(screen.getByRole('link'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  // ─── href attribute ────────────────────────────────────────────────────────

  it('href is applied to the anchor element', () => {
    render(<NavigationItem label="Fleet" href="/fleet" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/fleet')
  })
})
