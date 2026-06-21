'use client'

/**
 * InviteStateRow — Invite lifecycle row component
 *
 * Pure prop-driven component representing all 5 invite lifecycle states:
 * sent, expiring, accepted, expired, revoked.
 *
 * When isLimitedAccess=true, all action buttons are rendered DISABLED with
 * a lock glyph — they are NOT hidden.
 */

import React from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@evecosys/design-system'

// ---------------------------------------------------------------------------
// Types (exported per plan spec)
// ---------------------------------------------------------------------------

export type InviteState = 'sent' | 'expiring' | 'accepted' | 'expired' | 'revoked'

export interface InviteStateRowProps {
  state: InviteState
  email: string
  name?: string
  expiresAt?: Date
  joinedAt?: Date
  revokedAt?: Date
  revokedBy?: string
  onResend?: () => void
  onRevoke?: () => void
  onView?: () => void
  onReinvite?: () => void
  isLimitedAccess?: boolean
}

// ---------------------------------------------------------------------------
// Badge styles
// ---------------------------------------------------------------------------

const BADGE_STYLES: Record<InviteState, React.CSSProperties> = {
  sent: {
    backgroundColor: 'var(--ds-color-status-warning)',
    color: 'var(--ds-color-neutral-grey-80)',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
  },
  expiring: {
    backgroundColor: 'var(--ds-color-status-warning)',
    color: 'var(--ds-color-neutral-grey-80)',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
  },
  accepted: {
    backgroundColor: 'var(--ds-color-brand-primary)',
    color: '#ffffff', /* no ds-token equivalent */
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
  },
  expired: {
    backgroundColor: '#6b7280', /* no ds-token equivalent */
    color: '#ffffff', /* no ds-token equivalent */
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
  },
  revoked: {
    backgroundColor: 'var(--ds-color-status-error)',
    color: '#ffffff', /* no ds-token equivalent */
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
  },
}

const BADGE_LABELS: Record<InviteState, string> = {
  sent: 'Sent',
  expiring: 'Expiring',
  accepted: 'Accepted',
  expired: 'Expired',
  revoked: 'Revoked',
}

// ---------------------------------------------------------------------------
// Utility: format relative time
// ---------------------------------------------------------------------------

function formatDaysFromNow(date: Date): string {
  const now = Date.now()
  const diffMs = date.getTime() - now
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays >= 1) return `${diffDays} day${diffDays !== 1 ? 's' : ''}`
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  if (diffHours >= 1) return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
  return 'less than an hour'
}

function formatDaysAgo(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 1) return 'today'
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}

function formatHoursFromNow(date: Date): string {
  const now = Date.now()
  const diffMs = date.getTime() - now
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
}

// ---------------------------------------------------------------------------
// ActionButton — wraps Button with optional lock glyph when limited access
// ---------------------------------------------------------------------------

interface ActionButtonProps {
  onClick?: () => void
  isLimitedAccess?: boolean
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link'
}

function ActionButton({ onClick, isLimitedAccess, children, variant = 'outline' }: ActionButtonProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {isLimitedAccess && (
        <Lock
          size={12}
          aria-hidden="true"
          style={{ color: 'var(--ds-color-neutral-grey-40)', flexShrink: 0 }}
        />
      )}
      <Button
        variant={variant}
        size="sm"
        disabled={isLimitedAccess}
        onClick={isLimitedAccess ? undefined : onClick}
      >
        {children}
      </Button>
    </span>
  )
}

// ---------------------------------------------------------------------------
// InviteStateRow
// ---------------------------------------------------------------------------

export function InviteStateRow({
  state,
  email,
  name,
  expiresAt,
  joinedAt,
  revokedAt,
  isLimitedAccess = false,
  onResend,
  onRevoke,
  onView,
  onReinvite,
}: InviteStateRowProps) {
  const badge = (
    <span style={BADGE_STYLES[state]} aria-label={`Status: ${BADGE_LABELS[state]}`}>
      {BADGE_LABELS[state]}
    </span>
  )

  const meta = (() => {
    switch (state) {
      case 'sent':
        return expiresAt ? (
          <span
            style={{ fontSize: 'var(--ds-font-size-sm)', color: 'var(--ds-color-neutral-grey-60)' }}
          >
            Expires in {formatDaysFromNow(expiresAt)}
          </span>
        ) : null

      case 'expiring':
        return expiresAt ? (
          <span
            style={{ fontSize: 'var(--ds-font-size-sm)', color: 'var(--ds-color-neutral-grey-60)' }}
          >
            Expires in {formatHoursFromNow(expiresAt)}
          </span>
        ) : null

      case 'accepted':
        return joinedAt ? (
          <span
            style={{ fontSize: 'var(--ds-font-size-sm)', color: 'var(--ds-color-neutral-grey-60)' }}
          >
            Joined {formatDaysAgo(joinedAt)}
          </span>
        ) : (
          <span
            style={{ fontSize: 'var(--ds-font-size-sm)', color: 'var(--ds-color-neutral-grey-60)' }}
          >
            Joined
          </span>
        )

      case 'expired':
        return expiresAt ? (
          <span
            style={{ fontSize: 'var(--ds-font-size-sm)', color: 'var(--ds-color-neutral-grey-60)' }}
          >
            Expired {formatDaysAgo(expiresAt)}
          </span>
        ) : null

      case 'revoked':
        return (
          <span
            style={{ fontSize: 'var(--ds-font-size-sm)', color: 'var(--ds-color-neutral-grey-60)' }}
          >
            Revoked
            {revokedAt ? ` ${formatDaysAgo(revokedAt)}` : ''}
          </span>
        )
    }
  })()

  const actions = (() => {
    switch (state) {
      case 'sent':
      case 'expiring':
        return (
          <>
            <ActionButton onClick={onResend} isLimitedAccess={isLimitedAccess}>
              Resend
            </ActionButton>
            <ActionButton onClick={onRevoke} isLimitedAccess={isLimitedAccess} variant="destructive">
              Revoke
            </ActionButton>
          </>
        )

      case 'accepted':
        return (
          <ActionButton onClick={onView} isLimitedAccess={isLimitedAccess}>
            View
          </ActionButton>
        )

      case 'expired':
      case 'revoked':
        return (
          <ActionButton onClick={onReinvite} isLimitedAccess={isLimitedAccess}>
            Re-invite
          </ActionButton>
        )
    }
  })()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--ds-space-md)',
        padding: 'var(--ds-space-sm) 0',
        fontFamily: 'var(--ds-font-family-sans)',
        borderBottom: '1px solid var(--ds-color-neutral-grey-10)',
      }}
    >
      {/* Identity */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {name && (
          <p
            style={{
              fontSize: 'var(--ds-font-size-sm)',
              fontWeight: 'var(--ds-font-weight-medium)',
              color: 'var(--ds-color-neutral-ink)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </p>
        )}
        <p
          style={{
            fontSize: 'var(--ds-font-size-xs)',
            color: 'var(--ds-color-neutral-grey-60)',
            margin: 0,
          }}
        >
          {email}
        </p>
      </div>

      {/* Status badge */}
      <div style={{ flexShrink: 0 }}>{badge}</div>

      {/* State-specific metadata */}
      <div style={{ flexShrink: 0, minWidth: '140px' }}>{meta}</div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--ds-space-xs)', flexShrink: 0 }}>
        {actions}
      </div>
    </div>
  )
}
