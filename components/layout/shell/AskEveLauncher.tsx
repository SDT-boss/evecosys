import { Sparkles } from 'lucide-react'

export function AskEveLauncher() {
  return (
    <div style={{ padding: '0 var(--ds-space-md)', marginBottom: 'var(--ds-space-sm)' }}>
      {/*
       * AskEVE AI integration deferred to separate milestone.
       * This button is intentionally inert — onClick is a no-op placeholder.
       */}
      <button
        // AskEVE AI integration deferred to separate milestone
        disabled
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-xs)',
          width: '100%',
          padding: 'var(--ds-space-sm) var(--ds-space-md)',
          borderRadius: 'var(--ds-radius-md)',
          border: '1px dashed var(--ds-color-neutral-grey-20)',
          background: 'transparent',
          color: 'var(--ds-color-neutral-grey-40)',
          fontSize: 'var(--ds-font-size-xs)',
          fontWeight: 'var(--ds-font-weight-medium)',
          cursor: 'not-allowed',
          fontFamily: 'var(--ds-font-family-sans)',
        }}
        aria-label="Ask EVE (coming soon)"
      >
        <Sparkles size={14} />
        Ask EVE
      </button>
    </div>
  )
}
