import { render, screen } from '@testing-library/react'
import { Badge } from '@/design-system/components/Badge'

describe('Badge', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders its label text', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('default variant carries Jade Strong bg token', () => {
    render(<Badge>Online</Badge>)
    expect(screen.getByText('Online').className).toContain('--ds-color-brand-primary-strong')
  })

  it('volt variant carries Volt Green bg token', () => {
    render(<Badge variant="volt">Charging</Badge>)
    expect(screen.getByText('Charging').className).toContain('--ds-color-brand-secondary')
  })

  it('volt variant carries ink text token (not white)', () => {
    render(<Badge variant="volt">Charging</Badge>)
    expect(screen.getByText('Charging').className).toContain('--ds-color-neutral-ink')
  })

  it('secondary variant carries grey-10 bg token', () => {
    render(<Badge variant="secondary">Inactive</Badge>)
    expect(screen.getByText('Inactive').className).toContain('--ds-color-neutral-grey-10')
  })

  it('destructive variant carries status-error bg token', () => {
    render(<Badge variant="destructive">Offline</Badge>)
    expect(screen.getByText('Offline').className).toContain('--ds-color-status-error')
  })

  it('outline variant carries grey-20 border token', () => {
    render(<Badge variant="outline">Pending</Badge>)
    expect(screen.getByText('Pending').className).toContain('--ds-color-neutral-grey-20')
  })

  it('carries full rounded-full radius token', () => {
    render(<Badge>x</Badge>)
    expect(screen.getByText('x').className).toContain('--ds-radius-full')
  })

  it('forwards additional className', () => {
    render(<Badge className="ml-2">Label</Badge>)
    expect(screen.getByText('Label').className).toContain('ml-2')
  })
})
