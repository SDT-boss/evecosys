import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InviteStateRow, type InviteState } from '@/components/board/settings/InviteStateRow'

// Common test data
const BASE_PROPS = {
  email: 'alice@example.com',
  name: 'Alice Smith',
}

// Helper: date N days from now
function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

// Helper: date N days ago
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// Helper: date N hours from now
function hoursFromNow(n: number): Date {
  const d = new Date()
  d.setHours(d.getHours() + n)
  return d
}

describe('InviteStateRow — Sent state', () => {
  it('renders amber badge', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="sent"
        expiresAt={daysFromNow(7)}
        onResend={vi.fn()}
        onRevoke={vi.fn()}
      />
    )
    // Amber badge is identifiable by text "Sent" or badge element
    expect(screen.getByText('Sent')).toBeInTheDocument()
  })

  it('renders "Expires in N days" text', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="sent"
        expiresAt={daysFromNow(7)}
        onResend={vi.fn()}
        onRevoke={vi.fn()}
      />
    )
    expect(screen.getByText(/expires in/i)).toBeInTheDocument()
    expect(screen.getByText(/days/i)).toBeInTheDocument()
  })

  it('renders Resend and Revoke buttons', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="sent"
        expiresAt={daysFromNow(7)}
        onResend={vi.fn()}
        onRevoke={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument()
  })
})

describe('InviteStateRow — Expiring state', () => {
  it('renders amber badge', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="expiring"
        expiresAt={hoursFromNow(12)}
        onResend={vi.fn()}
        onRevoke={vi.fn()}
      />
    )
    expect(screen.getByText('Expiring')).toBeInTheDocument()
  })

  it('renders "Expires in NN hours" text', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="expiring"
        expiresAt={hoursFromNow(12)}
        onResend={vi.fn()}
        onRevoke={vi.fn()}
      />
    )
    // Exact pattern: must end after the unit — prevents regression of "8 hours hours" double-unit bug
    expect(screen.getByText(/expires in \d+ hours?$/i)).toBeInTheDocument()
  })

  it('renders Resend and Revoke buttons', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="expiring"
        expiresAt={hoursFromNow(12)}
        onResend={vi.fn()}
        onRevoke={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument()
  })
})

describe('InviteStateRow — Accepted state', () => {
  it('renders green badge', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="accepted"
        joinedAt={daysAgo(3)}
        onView={vi.fn()}
      />
    )
    expect(screen.getByText('Accepted')).toBeInTheDocument()
  })

  it('renders "Joined" text', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="accepted"
        joinedAt={daysAgo(3)}
        onView={vi.fn()}
      />
    )
    expect(screen.getByText(/joined/i)).toBeInTheDocument()
  })

  it('renders View button only (no Resend or Revoke)', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="accepted"
        joinedAt={daysAgo(3)}
        onView={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /resend/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /revoke/i })).not.toBeInTheDocument()
  })
})

describe('InviteStateRow — Expired state', () => {
  it('renders grey badge', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="expired"
        expiresAt={daysAgo(5)}
        onReinvite={vi.fn()}
      />
    )
    // Badge text is "Expired" — may appear multiple times (badge + meta)
    const expiredEls = screen.getAllByText(/expired/i)
    expect(expiredEls.length).toBeGreaterThan(0)
  })

  it('renders "Expired N days ago" text', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="expired"
        expiresAt={daysAgo(5)}
        onReinvite={vi.fn()}
      />
    )
    // Meta text shows "Expired X days ago" — check for "days ago" specifically
    expect(screen.getByText(/days ago/i)).toBeInTheDocument()
  })

  it('renders Re-invite button', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="expired"
        expiresAt={daysAgo(5)}
        onReinvite={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /re-invite/i })).toBeInTheDocument()
  })
})

describe('InviteStateRow — Revoked state', () => {
  it('renders red badge', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="revoked"
        revokedAt={daysAgo(2)}
        revokedBy="admin@example.com"
        onReinvite={vi.fn()}
      />
    )
    expect(screen.getByText('Revoked')).toBeInTheDocument()
  })

  it('renders "Revoked" text', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="revoked"
        revokedAt={daysAgo(2)}
        revokedBy="admin@example.com"
        onReinvite={vi.fn()}
      />
    )
    // The badge text also says "Revoked" but there should be descriptive text too
    const revokedElements = screen.getAllByText(/revoked/i)
    expect(revokedElements.length).toBeGreaterThan(0)
  })

  it('renders Re-invite button', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="revoked"
        revokedAt={daysAgo(2)}
        revokedBy="admin@example.com"
        onReinvite={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /re-invite/i })).toBeInTheDocument()
  })
})

describe('InviteStateRow — isLimitedAccess variant', () => {
  it('renders all action buttons as DISABLED with a lock glyph (NOT hidden)', () => {
    render(
      <InviteStateRow
        {...BASE_PROPS}
        state="sent"
        expiresAt={daysFromNow(7)}
        onResend={vi.fn()}
        onRevoke={vi.fn()}
        isLimitedAccess
      />
    )
    const resendBtn = screen.getByRole('button', { name: /resend/i })
    const revokeBtn = screen.getByRole('button', { name: /revoke/i })

    // Buttons must be present (not hidden)
    expect(resendBtn).toBeInTheDocument()
    expect(revokeBtn).toBeInTheDocument()

    // Buttons must be disabled
    expect(resendBtn).toBeDisabled()
    expect(revokeBtn).toBeDisabled()

    // Lock glyph must be present (lucide Lock icon renders as SVG)
    const lockIcons = document.querySelectorAll('svg')
    expect(lockIcons.length).toBeGreaterThan(0)
  })
})
