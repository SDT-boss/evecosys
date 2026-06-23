export function AskEveLauncher({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <button
        title="Ask EVE"
        disabled
        aria-label="Ask EVE (coming soon)"
        style={{
          width: 40, height: 40, borderRadius: 13,
          margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#fff', border: '1px solid #e7efe9',
          cursor: 'not-allowed', flexShrink: 0,
        }}
      >
        <span className="material-symbols-rounded" aria-hidden="true"
          style={{ fontSize: 20, lineHeight: 1, userSelect: 'none', color: '#1a7080' }}>
          auto_awesome
        </span>
      </button>
    )
  }
  return (
    <button
      disabled
      aria-label="Ask EVE (coming soon)"
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        width: '100%', padding: '9px 12px', borderRadius: 14,
        border: '1px solid #d6ecdb', background: 'rgba(26,112,128,.04)',
        cursor: 'not-allowed', fontFamily: 'var(--ds-font-family-sans)',
      }}
    >
      <span className="material-symbols-rounded" aria-hidden="true"
        style={{ fontSize: 22, lineHeight: 1, color: '#1a7080', flexShrink: 0 }}>
        auto_awesome
      </span>
      <span style={{ textAlign: 'left', lineHeight: 1.2 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#15402e' }}>Ask EVE</span>
        <span style={{ display: 'block', fontSize: 11, color: '#5a7a64' }}>Your fleet AI assistant</span>
      </span>
    </button>
  )
}
