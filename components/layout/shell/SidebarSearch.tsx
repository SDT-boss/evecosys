import { Search } from 'lucide-react'

interface SidebarSearchProps {
  placeholder?: string
}

export function SidebarSearch({ placeholder = 'Search…' }: SidebarSearchProps) {
  return (
    <div
      style={{
        padding: '0 var(--ds-space-md)',
        marginBottom: 'var(--ds-space-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-xs)',
          background: 'rgba(0,0,0,0.06)',
          border: '1px solid var(--ds-color-neutral-grey-20)',
          borderRadius: 'var(--ds-radius-md)',
          padding: '6px var(--ds-space-sm)',
        }}
      >
        <Search
          size={14}
          style={{ color: 'var(--ds-color-neutral-grey-40)', flexShrink: 0 }}
        />
        <input
          type="text"
          placeholder={placeholder}
          // no-op: search integration deferred to separate milestone
          onChange={() => {}}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 'var(--ds-font-size-xs)',
            color: 'var(--ds-color-neutral-ink)',
            width: '100%',
          }}
        />
      </div>
    </div>
  )
}
