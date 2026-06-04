import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from '@/design-system/components/Alert'
import { Info } from 'lucide-react'

describe('Alert', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────

  it('has role="alert" for screen readers', () => {
    render(<Alert>Message</Alert>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders AlertTitle and AlertDescription as children', () => {
    render(
      <Alert>
        <AlertTitle>Battery low</AlertTitle>
        <AlertDescription>Vehicle EV-042 is below 15%.</AlertDescription>
      </Alert>
    )
    expect(screen.getByText('Battery low')).toBeInTheDocument()
    expect(screen.getByText(/Vehicle EV-042/)).toBeInTheDocument()
  })

  // ─── Variant tokens ───────────────────────────────────────────────────────

  it('default variant carries Jade border token', () => {
    render(<Alert variant="default">Info</Alert>)
    expect(screen.getByRole('alert').className).toContain('--ds-color-brand-primary')
  })

  it('success variant carries Volt Green border token', () => {
    render(<Alert variant="success">OK</Alert>)
    expect(screen.getByRole('alert').className).toContain('--ds-color-brand-secondary')
  })

  it('warning variant carries status-warning border token', () => {
    render(<Alert variant="warning">Warning</Alert>)
    expect(screen.getByRole('alert').className).toContain('--ds-color-status-warning')
  })

  it('destructive variant carries status-error token', () => {
    render(<Alert variant="destructive">Error</Alert>)
    expect(screen.getByRole('alert').className).toContain('--ds-color-status-error')
  })

  it('carries grey-05 background token', () => {
    render(<Alert>x</Alert>)
    expect(screen.getByRole('alert').className).toContain('--ds-color-neutral-grey-05')
  })

  // ─── Icon slot ────────────────────────────────────────────────────────────

  it('renders an icon child alongside text content', () => {
    render(
      <Alert>
        <Info aria-hidden="true" data-testid="alert-icon" />
        <AlertTitle>Info</AlertTitle>
      </Alert>
    )
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  // ─── Unhappy path ─────────────────────────────────────────────────────────

  it('renders with no title or description (content-only)', () => {
    render(<Alert>Simple notice with no structure.</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Simple notice with no structure.')
  })
})
