export function SidebarSearch({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <button
        title="Search or ask EVE"
        aria-label="Search"
        style={{
          width: 40, height: 40, borderRadius: 11,
          margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#fff', border: '1px solid #e4ebe6',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <span className="material-symbols-rounded" aria-hidden="true"
          style={{ fontSize: 19, lineHeight: 1, userSelect: 'none', color: '#8a978c' }}>
          search
        </span>
      </button>
    )
  }
  return (
    <button
      aria-label="Search"
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        height: 38, padding: '0 8px 0 12px', borderRadius: 9999,
        background: '#fff', border: '1px solid #e4ebe6',
        cursor: 'pointer', fontFamily: 'var(--ds-font-family-sans)',
      }}
    >
      <span className="material-symbols-rounded" aria-hidden="true"
        style={{ fontSize: 18, lineHeight: 1, color: '#8a978c', flexShrink: 0 }}>
        search
      </span>
      <span style={{ fontSize: 12.5, flex: 1, textAlign: 'left', color: '#8a978c' }}>Search…</span>
      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: '#9aa79e',
        border: '1px solid #e4ebe6', borderRadius: 6, padding: '1px 5px', whiteSpace: 'nowrap' }}>
        ⌘K
      </span>
    </button>
  )
}
