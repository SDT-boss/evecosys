'use client'

import { useState } from 'react'
import { ChevronDown, Check, Building2 } from 'lucide-react'
import { useTenantContext } from '@/components/platform/TenantContext'

interface Tenant {
  id: string
  name: string
}

interface TenantSwitcherProps {
  tenants: Tenant[]
  onSelect: (id: string) => void
}

export function TenantSwitcher({ tenants, onSelect }: TenantSwitcherProps) {
  const { activeTenantName } = useTenantContext()
  const [open, setOpen] = useState(false)

  const activeTenant = tenants.find((t) => t.name === activeTenantName)

  function handleSelect(id: string) {
    onSelect(id)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', padding: '0 var(--ds-space-md)', marginBottom: 'var(--ds-space-xs)' }}>
      {/* Trigger button — collapsed state: name + chevron */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-xs)',
          width: '100%',
          padding: 'var(--ds-space-xs) var(--ds-space-sm)',
          borderRadius: 'var(--ds-radius-md)',
          border: '1px solid var(--ds-color-neutral-grey-20)',
          background: 'rgba(0,134,132,0.06)',
          color: 'var(--ds-color-brand-primary)',
          fontSize: 'var(--ds-font-size-xs)',
          fontWeight: 'var(--ds-font-weight-semibold)',
          cursor: 'pointer',
          fontFamily: 'var(--ds-font-family-sans)',
          textAlign: 'left',
        }}
      >
        <Building2 size={13} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeTenantName ?? 'Select workspace'}
        </span>
        <ChevronDown
          size={13}
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--ds-motion-duration-fast) var(--ds-motion-easing-standard)',
          }}
        />
      </button>

      {/* Dropdown list — expanded state */}
      {open && (
        <ul
          role="listbox"
          aria-label="Select workspace"
          style={{
            position: 'absolute',
            top: '100%',
            left: 'var(--ds-space-md)',
            right: 'var(--ds-space-md)',
            marginTop: 'var(--ds-space-xs)',
            background: 'white',
            border: '1px solid var(--ds-color-neutral-grey-20)',
            borderRadius: 'var(--ds-radius-md)',
            boxShadow: 'var(--ds-shadow-md)',
            zIndex: 50,
            listStyle: 'none',
            padding: 'var(--ds-space-xs) 0',
            margin: '0',
          }}
        >
          {tenants.map((tenant) => {
            const isActive = tenant.id === activeTenant?.id
            return (
              <li
                key={tenant.id}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(tenant.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--ds-space-xs)',
                  padding: 'var(--ds-space-xs) var(--ds-space-sm)',
                  fontSize: 'var(--ds-font-size-xs)',
                  fontWeight: isActive ? 'var(--ds-font-weight-semibold)' : 'var(--ds-font-weight-normal)',
                  color: isActive ? 'var(--ds-color-brand-primary)' : 'var(--ds-color-neutral-ink)',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(0,134,132,0.06)' : 'transparent',
                }}
              >
                <span style={{ flex: 1 }}>{tenant.name}</span>
                {isActive && <Check size={12} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
