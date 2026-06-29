interface ContentUtilityBarProps {
  children?: React.ReactNode
  inviteCta?: React.ReactNode
}

export function ContentUtilityBar({ children, inviteCta }: ContentUtilityBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--ds-space-lg)',
        height: '52px',
        borderBottom: '1px solid var(--ds-color-neutral-grey-20)',
        background: '#f2f5f2', // page ground — no --ds-* token exists for this value
        flexShrink: 0,
      }}
    >
      {/* Left: LIVE chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-xs)',
          borderRadius: 'var(--ds-radius-full)',
          padding: '4px 10px',
          // LIVE chip uses Volt Green (brand-secondary) with low opacity tint
          background: 'rgba(150,208,44,0.12)',
          border: '1px solid rgba(150,208,44,0.25)',
          color: 'var(--ds-color-brand-secondary-strong)',
          fontSize: 'var(--ds-font-size-xs)',
          fontWeight: 'var(--ds-font-weight-semibold)',
          letterSpacing: '0.5px',
        }}
      >
        <div
          className="live-pulse"
          style={{
            width: 7,
            height: 7,
            borderRadius: 'var(--ds-radius-full)',
            background: 'var(--ds-color-brand-secondary)',
          }}
        />
        LIVE
      </div>

      {/* Right: notification slot + optional invite CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-sm)' }}>
        {inviteCta}
        {/* alertBell / notification slot */}
        {children}
      </div>
    </div>
  )
}
