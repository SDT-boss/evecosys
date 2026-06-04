import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from '@/design-system/components/Switch'

describe('Switch', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders an off switch by default', () => {
    render(<Switch aria-label="Live tracking" />)
    const sw = screen.getByRole('switch', { name: 'Live tracking' })
    expect(sw).toBeInTheDocument()
    expect(sw).toHaveAttribute('data-state', 'unchecked')
  })

  it('carries Jade Strong on-track token in className', () => {
    render(<Switch aria-label="x" />)
    expect(screen.getByRole('switch').className).toContain(
      'data-[state=checked]:bg-[var(--ds-color-brand-primary-strong)]'
    )
  })

  it('carries grey-20 off-track token in className', () => {
    render(<Switch aria-label="x" />)
    expect(screen.getByRole('switch').className).toContain(
      'data-[state=unchecked]:bg-[var(--ds-color-neutral-grey-20)]'
    )
  })

  it('carries Jade focus-ring token', () => {
    render(<Switch aria-label="x" />)
    expect(screen.getByRole('switch').className).toContain('focus-visible:ring-[var(--ds-color-brand-primary)]')
  })

  // ─── Interactions ─────────────────────────────────────────────────────────

  it('toggles to checked state on click', async () => {
    render(<Switch aria-label="Notifications" />)
    const sw = screen.getByRole('switch')
    await userEvent.click(sw)
    expect(sw).toHaveAttribute('data-state', 'checked')
  })

  it('fires onCheckedChange with true on first click', async () => {
    const handler = vi.fn()
    render(<Switch aria-label="Toggle" onCheckedChange={handler} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(handler).toHaveBeenCalledWith(true)
  })

  it('toggles back to unchecked on second click', async () => {
    render(<Switch aria-label="Toggle" defaultChecked />)
    const sw = screen.getByRole('switch')
    await userEvent.click(sw)
    expect(sw).toHaveAttribute('data-state', 'unchecked')
  })

  // ─── Disabled (unhappy path) ───────────────────────────────────────────────

  it('disabled switch does not toggle on click', async () => {
    const handler = vi.fn()
    render(<Switch aria-label="Locked" disabled onCheckedChange={handler} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('disabled carries explicit disabled grey tokens', () => {
    render(<Switch aria-label="Locked" disabled />)
    const cls = screen.getByRole('switch').className
    expect(cls).toContain('disabled:data-[state=checked]:bg-[var(--ds-color-neutral-grey-20)]')
    expect(cls).toContain('disabled:data-[state=unchecked]:bg-[var(--ds-color-neutral-grey-10)]')
  })
})
