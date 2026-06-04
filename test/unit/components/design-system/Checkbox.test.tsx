import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from '@/design-system/components/Checkbox'

describe('Checkbox', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders an unchecked checkbox by default', () => {
    render(<Checkbox aria-label="Select row" />)
    const cb = screen.getByRole('checkbox', { name: 'Select row' })
    expect(cb).toBeInTheDocument()
    expect(cb).not.toBeChecked()
  })

  it('carries Jade Strong checked-state token in className', () => {
    render(<Checkbox aria-label="x" />)
    const cls = screen.getByRole('checkbox').className
    expect(cls).toContain('data-[state=checked]:bg-[var(--ds-color-brand-primary-strong)]')
  })

  it('carries Jade focus-ring token', () => {
    render(<Checkbox aria-label="x" />)
    expect(screen.getByRole('checkbox').className).toContain('focus-visible:ring-[var(--ds-color-brand-primary)]')
  })

  // ─── Interactions ─────────────────────────────────────────────────────────

  it('becomes checked after click', async () => {
    render(<Checkbox aria-label="Accept" />)
    const cb = screen.getByRole('checkbox')
    await userEvent.click(cb)
    expect(cb).toBeChecked()
  })

  it('fires onCheckedChange with true on first click', async () => {
    const handler = vi.fn()
    render(<Checkbox aria-label="Accept" onCheckedChange={handler} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(handler).toHaveBeenCalledWith(true)
  })

  it('toggles back to unchecked on second click', async () => {
    render(<Checkbox aria-label="Toggle" defaultChecked />)
    const cb = screen.getByRole('checkbox')
    await userEvent.click(cb)
    expect(cb).not.toBeChecked()
  })

  // ─── Disabled (unhappy path) ───────────────────────────────────────────────

  it('disabled checkbox cannot be checked', async () => {
    const handler = vi.fn()
    render(<Checkbox aria-label="Locked" disabled onCheckedChange={handler} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('disabled checkbox carries explicit grey border/bg tokens', () => {
    render(<Checkbox aria-label="Locked" disabled />)
    const cls = screen.getByRole('checkbox').className
    expect(cls).toContain('disabled:border-[var(--ds-color-neutral-grey-10)]')
    expect(cls).toContain('disabled:bg-[var(--ds-color-neutral-grey-05)]')
  })

  // ─── Controlled ───────────────────────────────────────────────────────────

  it('renders checked when checked=true is passed', () => {
    render(<Checkbox aria-label="Controlled" checked onCheckedChange={() => {}} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })
})
