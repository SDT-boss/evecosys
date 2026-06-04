import { render, screen } from '@testing-library/react'
import { Separator } from '@/design-system/components/Separator'

describe('Separator', () => {
  it('renders a separator element', () => {
    render(<Separator />)
    // decorative=true (default) → role="none" in Radix
    expect(document.querySelector('[data-orientation]')).toBeInTheDocument()
  })

  it('default orientation is horizontal (h-[1px] w-full)', () => {
    const { container } = render(<Separator />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('h-[1px]')
    expect(el.className).toContain('w-full')
  })

  it('vertical orientation has h-full w-[1px]', () => {
    const { container } = render(<Separator orientation="vertical" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('h-full')
    expect(el.className).toContain('w-[1px]')
  })

  it('carries grey-20 border colour token', () => {
    const { container } = render(<Separator />)
    expect((container.firstChild as HTMLElement).className).toContain('--ds-color-neutral-grey-20')
  })

  it('non-decorative separator has role="separator"', () => {
    render(<Separator decorative={false} aria-label="Section divider" />)
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('forwards className', () => {
    const { container } = render(<Separator className="my-4" />)
    expect((container.firstChild as HTMLElement).className).toContain('my-4')
  })
})
