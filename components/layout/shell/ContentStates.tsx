/**
 * Shell content state components
 *
 * Provides all five fallback/loading/error state UI patterns used inside
 * the DashboardShell content area. All components are pure presentational
 * RSC-compatible (no hooks, no client-side effects).
 *
 * Color values that have no --ds-* equivalent use raw hex per D-03/D-04.
 */

import React from 'react'
import { Button } from '@evecosys/design-system'

// ---------------------------------------------------------------------------
// Skel — shimmer placeholder block
// ---------------------------------------------------------------------------

interface SkelProps {
  style?: React.CSSProperties
  className?: string
}

function Skel({ style, className }: SkelProps) {
  return (
    <div
      className={className}
      style={{
        background: 'linear-gradient(90deg, #eef2ee 25%, #f6f9f6 50%, #eef2ee 75%)',
        backgroundSize: '200% 100%',
        animation: 'skel-shimmer 1.4s ease-in-out infinite',
        borderRadius: 'var(--ds-radius-md)',
        height: '1rem',
        ...style,
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// LoadingState — shimmer grid
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-sm)',
        padding: 'var(--ds-space-lg)',
        fontFamily: 'var(--ds-font-family-sans)',
      }}
      aria-busy="true"
      aria-label="Loading"
    >
      <style>{`
        @keyframes skel-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {/* Header row */}
      <div style={{ display: 'flex', gap: 'var(--ds-space-sm)', marginBottom: 'var(--ds-space-md)' }}>
        <Skel style={{ width: '120px', height: '1rem' }} />
        <Skel style={{ width: '200px', height: '1rem' }} />
        <Skel style={{ width: '80px', height: '1rem' }} />
        <Skel style={{ width: '100px', height: '1rem' }} />
      </div>
      {/* Data rows */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--ds-space-sm)', alignItems: 'center' }}>
          <Skel style={{ width: '32px', height: '32px', borderRadius: 'var(--ds-radius-full)' }} />
          <Skel style={{ width: '140px', height: '0.875rem' }} />
          <Skel style={{ width: '200px', height: '0.875rem' }} />
          <Skel style={{ width: '60px', height: '0.875rem' }} />
          <Skel style={{ width: '80px', height: '0.875rem' }} />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmptyState — zero-data placeholder
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  icon?: React.ReactNode
  message: string
  ctaLabel?: string
  onCta?: () => void
}

function EmptyState({ icon, message, ctaLabel, onCta }: EmptyStateProps) {
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
      {icon && (
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--ds-radius-full)',
            background: '#f2f5f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ds-color-brand-primary)',
          }}
        >
          {icon}
        </div>
      )}
      <p
        style={{
          fontSize: 'var(--ds-font-size-base)',
          color: 'var(--ds-color-neutral-grey-60)',
          margin: 0,
          maxWidth: '320px',
        }}
      >
        {message}
      </p>
      {ctaLabel && (
        <Button onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ErrorState — connection / server error
// ---------------------------------------------------------------------------

interface ErrorStateProps {
  onRetry?: () => void
  onReport?: () => void
}

function ErrorState({ onRetry, onReport }: ErrorStateProps) {
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
      {/* Icon circle — red */}
      <div
        aria-hidden="true"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--ds-radius-full)',
          background: '#fdeaea',
          border: '1px solid #f5c0c0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          color: '#ef4444',
        }}
      >
        {/* cloud_off Material symbol equivalent via text */}
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '28px', lineHeight: 1 }}
          aria-label="Connection error"
        >
          cloud_off
        </span>
      </div>
      <div>
        <p
          style={{
            fontSize: 'var(--ds-font-size-lg)',
            fontWeight: 'var(--ds-font-weight-semibold)',
            color: 'var(--ds-color-neutral-ink)',
            margin: '0 0 var(--ds-space-xs)',
          }}
        >
          Something went wrong
        </p>
        <p
          style={{
            fontSize: 'var(--ds-font-size-sm)',
            color: 'var(--ds-color-neutral-grey-60)',
            margin: 0,
          }}
        >
          We could not load this page. Please try again.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--ds-space-sm)' }}>
        <Button onClick={onRetry}>
          Retry
        </Button>
        <Button variant="outline" onClick={onReport}>
          Report issue
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RestrictedState — 403 / access denied
// ---------------------------------------------------------------------------

interface RestrictedStateProps {
  onBack?: () => void
  onRequestAccess?: () => void
}

function RestrictedState({ onBack, onRequestAccess }: RestrictedStateProps) {
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
      {/* Icon circle — red (same as ErrorState) */}
      <div
        aria-hidden="true"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--ds-radius-full)',
          background: '#fdeaea',
          border: '1px solid #f5c0c0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-label="Restricted"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div>
        <h2
          style={{
            fontSize: 'var(--ds-font-size-xl)',
            fontWeight: 'var(--ds-font-weight-semibold)',
            color: 'var(--ds-color-neutral-ink)',
            margin: '0 0 var(--ds-space-xs)',
          }}
        >
          403 · Restricted
        </h2>
        <p
          style={{
            fontSize: 'var(--ds-font-size-sm)',
            color: 'var(--ds-color-neutral-grey-60)',
            margin: 0,
            maxWidth: '320px',
          }}
        >
          You do not have permission to view this area.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--ds-space-sm)' }}>
        <Button variant="outline" onClick={onBack}>
          Back to Overview
        </Button>
        <Button onClick={onRequestAccess}>
          Request access
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// UnavailableState — feature gated / upgrade required
// ---------------------------------------------------------------------------

interface UnavailableStateProps {
  onUpgrade?: () => void
  onLearnMore?: () => void
}

function UnavailableState({ onUpgrade, onLearnMore }: UnavailableStateProps) {
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
      {/* Icon circle — purple */}
      <div
        aria-hidden="true"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--ds-radius-full)',
          background: '#efe7fb',
          border: '1px solid #d6c4f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7c3aed',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-label="Upgrade"
        >
          <path d="M12 2l9 7-9 7-9-7z" />
          <path d="M3 9v6" />
          <path d="M21 9v6" />
          <path d="M3 15l9 7 9-7" />
        </svg>
      </div>
      <div>
        <h2
          style={{
            fontSize: 'var(--ds-font-size-xl)',
            fontWeight: 'var(--ds-font-weight-semibold)',
            color: 'var(--ds-color-neutral-ink)',
            margin: '0 0 var(--ds-space-xs)',
          }}
        >
          Feature unavailable
        </h2>
        <p
          style={{
            fontSize: 'var(--ds-font-size-sm)',
            color: 'var(--ds-color-neutral-grey-60)',
            margin: 0,
            maxWidth: '320px',
          }}
        >
          This feature is not included in your current plan.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--ds-space-sm)' }}>
        <Button onClick={onUpgrade}>
          Upgrade plan
        </Button>
        <Button variant="ghost" onClick={onLearnMore}>
          See what&apos;s included
        </Button>
      </div>
    </div>
  )
}

export { Skel, LoadingState, EmptyState, ErrorState, RestrictedState, UnavailableState }
