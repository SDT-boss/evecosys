import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/design-system/components/Button'

describe('Button', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders with default Volt Green CTA classes', () => {
    render(<Button>Save</Button>)
    const btn = screen.getByRole('button', { name: 'Save' })
    expect(btn).toBeInTheDocument()
    expect(btn.className).toContain('--ds-color-brand-secondary')
  })

  it.each([
    ['default',     '--ds-color-brand-secondary'],
    ['secondary',   '--ds-color-brand-primary-strong'],
    ['outline',     '--ds-color-neutral-grey-20'],
    ['ghost',       '--ds-color-brand-primary'],
    ['destructive', '--ds-color-status-error'],
    ['link',        '--ds-color-brand-primary'],
  ] as const)('variant="%s" carries the correct ds token in its class', (variant, token) => {
    render(<Button variant={variant}>{variant}</Button>)
    expect(screen.getByRole('button').className).toContain(token)
  })

  it.each(['default', 'sm', 'lg', 'icon'] as const)('size="%s" renders without error', (size) => {
    render(<Button size={size}>x</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('carries the Jade focus-ring token in its class', () => {
    render(<Button>Focus</Button>)
    expect(screen.getByRole('button').className).toContain('--ds-color-brand-primary')
  })

  // ─── Interactions ─────────────────────────────────────────────────────────

  it('fires onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('forwards additional className', () => {
    render(<Button className="custom-extra">X</Button>)
    expect(screen.getByRole('button').className).toContain('custom-extra')
  })

  it('renders children correctly', () => {
    render(<Button>Submit form</Button>)
    expect(screen.getByText('Submit form')).toBeInTheDocument()
  })

  // ─── Disabled (unhappy path) ───────────────────────────────────────────────

  it('disabled button does not fire onClick', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Disabled</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('disabled button carries explicit grey token classes (not just opacity-50)', () => {
    render(<Button disabled>Disabled</Button>)
    const cls = screen.getByRole('button').className
    expect(cls).toContain('disabled:bg-[var(--ds-color-neutral-grey-10)]')
    expect(cls).toContain('disabled:text-[var(--ds-color-neutral-grey-40)]')
    expect(cls).toContain('disabled:opacity-100')
  })

  it('disabled attribute is present on the DOM element', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  // ─── asChild ──────────────────────────────────────────────────────────────

  it('asChild renders the child element instead of <button>', () => {
    render(
      <Button asChild>
        <a href="/dashboard">Dashboard</a>
      </Button>
    )
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
