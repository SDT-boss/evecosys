import { render } from '@testing-library/react'
import { Skeleton } from '@/design-system/components/Skeleton'

describe('Skeleton', () => {
  it('renders a div with animate-pulse', () => {
    const { container } = render(<Skeleton />)
    expect((container.firstChild as HTMLElement).className).toContain('animate-pulse')
  })

  it('carries grey-10 background token', () => {
    const { container } = render(<Skeleton />)
    expect((container.firstChild as HTMLElement).className).toContain('--ds-color-neutral-grey-10')
  })

  it('carries rounded-md radius token by default', () => {
    const { container } = render(<Skeleton />)
    expect((container.firstChild as HTMLElement).className).toContain('--ds-radius-md')
  })

  it('className override applied — e.g. for avatar skeleton', () => {
    const { container } = render(<Skeleton className="h-10 w-10 rounded-full" />)
    const cls = (container.firstChild as HTMLElement).className
    expect(cls).toContain('h-10')
    expect(cls).toContain('rounded-full')
  })

  it('className override for wide text skeleton', () => {
    const { container } = render(<Skeleton className="h-4 w-48" />)
    const cls = (container.firstChild as HTMLElement).className
    expect(cls).toContain('h-4')
    expect(cls).toContain('w-48')
  })
})
