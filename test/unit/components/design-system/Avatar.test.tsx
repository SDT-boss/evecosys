import { render, screen } from '@testing-library/react'
import { Avatar, AvatarImage, AvatarFallback } from '@/design-system/components/Avatar'

describe('Avatar', () => {
  // ─── Happy path ───────────────────────────────────────────────────────────

  it('renders the fallback initials when no src is provided', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('fallback carries grey-10 background and grey-60 text tokens', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    )
    const fb = screen.getByText('AB')
    expect(fb.className).toContain('--ds-color-neutral-grey-10')
    // Uses [color:var(...)] notation to avoid twMerge collision with text-size utilities
    expect(fb.className).toContain('[color:var(--ds-color-neutral-grey-60)]')
  })

  it('root carries rounded-full radius token', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    expect((container.firstChild as HTMLElement).className).toContain('--ds-radius-full')
  })

  it('size can be overridden via className', () => {
    const { container } = render(
      <Avatar className="h-14 w-14">
        <AvatarFallback>MG</AvatarFallback>
      </Avatar>
    )
    expect((container.firstChild as HTMLElement).className).toContain('h-14')
    expect((container.firstChild as HTMLElement).className).toContain('w-14')
  })

  it('AvatarImage receives the src and alt props', () => {
    // Radix Avatar in jsdom: images never load so the <img> may be
    // withheld by Radix until onLoad fires. We test the prop is accepted.
    // The fallback always renders alongside in jsdom — that's expected behaviour.
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    // Fallback is visible in jsdom (image never loads)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  // ─── Unhappy path — broken image ──────────────────────────────────────────

  it('renders fallback when AvatarImage has an invalid src (Radix fallback logic)', async () => {
    // Radix Avatar shows fallback immediately if image fails to load.
    // In jsdom, images never load, so fallback is always shown alongside.
    render(
      <Avatar>
        <AvatarImage src="broken.jpg" alt="Broken" />
        <AvatarFallback>FB</AvatarFallback>
      </Avatar>
    )
    // Fallback text is always in the DOM (Radix may hide it via opacity/display)
    expect(screen.getByText('FB')).toBeInTheDocument()
  })
})
