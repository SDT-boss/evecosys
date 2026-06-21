/**
 * AccessDenied — 403 / access denied screen
 *
 * Pure presentational component. Shows a 72px lock circle in #fce4e4,
 * a Lock icon, "403 · Access denied" heading, and role-specific copy.
 *
 * No client-side hooks. RSC-compatible.
 */

import React from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@evecosys/design-system'

export interface AccessDeniedProps {
  role: string
  onBack?: () => void
  onRequestAccess?: () => void
}

export function AccessDenied({ role, onBack, onRequestAccess }: AccessDeniedProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 'var(--ds-space-md)',
        padding: 'var(--ds-space-3xl) var(--ds-space-xl)',
        fontFamily: 'var(--ds-font-family-sans)',
      }}
    >
      {/* 72px lock circle — background #fce4e4 per spec */}
      <div
        aria-hidden="true"
        style={{
          width: '72px',
          height: '72px',
          borderRadius: 'var(--ds-radius-full)',
          background: '#fce4e4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          flexShrink: 0,
        }}
      >
        <Lock size={32} />
      </div>

      <div>
        <h1
          style={{
            fontSize: 'var(--ds-font-size-xl)',
            fontWeight: 'var(--ds-font-weight-semibold)',
            color: 'var(--ds-color-neutral-ink)',
            margin: '0 0 var(--ds-space-xs)',
          }}
        >
          403 · Access denied
        </h1>
        <p
          style={{
            fontSize: 'var(--ds-font-size-sm)',
            color: 'var(--ds-color-neutral-grey-60)',
            margin: 0,
            maxWidth: '360px',
          }}
        >
          Your {role} role does not have access to this area.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--ds-space-sm)' }}>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onRequestAccess}>
          Request access
        </Button>
      </div>
    </div>
  )
}
