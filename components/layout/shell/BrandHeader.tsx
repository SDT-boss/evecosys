interface BrandHeaderProps {
  collapsed?: boolean
  onToggle: () => void
}

export function BrandHeader({ collapsed = false, onToggle }: BrandHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '4px 0 6px' : '2px 2px 6px',
        flexShrink: 0,
        height: 48,
      }}
    >
      {!collapsed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/evecosys-light.png" alt="EVEcosys" style={{ height: 22, display: 'block' }} />
      )}
      <button
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 100ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(20,45,32,.06)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <span
          className="material-symbols-rounded"
          aria-hidden="true"
          style={{ fontSize: 20, lineHeight: 1, userSelect: 'none', color: '#5a6a60' }}
        >
          {collapsed ? 'menu' : 'menu_open'}
        </span>
      </button>
    </div>
  )
}
