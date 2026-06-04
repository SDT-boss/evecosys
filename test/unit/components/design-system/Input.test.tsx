import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/design-system/components/Input'

describe('Input', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders an <input> element', () => {
    render(<Input placeholder="Enter value" />)
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument()
  })

  it('carries Jade border and focus tokens in className', () => {
    render(<Input />)
    const cls = screen.getByRole('textbox').className
    expect(cls).toContain('--ds-color-neutral-grey-20')      // default border
    expect(cls).toContain('--ds-color-brand-primary')         // focus border + halo
  })

  it('carries ink text token', () => {
    render(<Input />)
    expect(screen.getByRole('textbox').className).toContain('--ds-color-neutral-ink')
  })

  it('forwards type prop', () => {
    render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
  })

  // ─── Happy-path interactions ───────────────────────────────────────────────

  it('accepts typed text', async () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'fleet@ev.com')
    expect(input).toHaveValue('fleet@ev.com')
  })

  it('fires onChange on each keystroke', async () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'abc')
    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it('forwards additional className', () => {
    render(<Input className="w-48" />)
    expect(screen.getByRole('textbox').className).toContain('w-48')
  })

  // ─── Error state (unhappy path) ────────────────────────────────────────────

  it('aria-invalid="true" adds red border and halo tokens', () => {
    render(<Input aria-invalid="true" />)
    const cls = screen.getByRole('textbox').className
    expect(cls).toContain('aria-[invalid=true]:border-[var(--ds-color-status-error)]')
    expect(cls).toContain('aria-[invalid=true]:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]')
  })

  it('aria-invalid attribute propagates to the DOM element', () => {
    render(<Input aria-invalid="true" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  // ─── Disabled state (unhappy path) ─────────────────────────────────────────

  it('disabled input carries explicit disabled-state tokens', () => {
    render(<Input disabled />)
    const cls = screen.getByRole('textbox').className
    expect(cls).toContain('disabled:bg-[var(--ds-color-neutral-grey-05)]')
    expect(cls).toContain('disabled:text-[var(--ds-color-neutral-grey-40)]')
    expect(cls).toContain('disabled:opacity-100')
  })

  it('disabled input is not editable', async () => {
    render(<Input disabled defaultValue="locked" />)
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
    await userEvent.type(input, 'extra')
    expect(input).toHaveValue('locked')
  })
})
