'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavItemProps {
  href: string
  label: string
  iconName: string
  badge?: number
  collapsed?: boolean
}

export function NavItem({ href, label, iconName, badge, collapsed = false }: NavItemProps) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  const [hovered, setHovered] = useState(false)

  const textColor = active ? '#0d4e5a' : hovered ? '#16201b' : '#3d4a42'
  const iconColor = active ? '#1a7080' : hovered ? '#3d4a42' : '#67756b'
  const bg = active ? 'rgba(26,112,128,.12)' : hovered ? 'rgba(20,45,32,.05)' : 'transparent'

  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        aria-label={label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '10px 0',
          borderRadius: 9999,
          textDecoration: 'none',
          position: 'relative',
          background: bg,
          transition: 'background 100ms ease',
          flexShrink: 0,
        }}
      >
        <span className="material-symbols-rounded" aria-hidden="true"
          style={{ fontSize: 19, lineHeight: 1, userSelect: 'none', color: iconColor, transition: 'color 100ms ease' }}>
          {iconName}
        </span>
        {!!badge && badge > 0 && (
          <span aria-hidden="true" style={{
            position: 'absolute', top: 6, right: 12,
            width: 7, height: 7, borderRadius: '50%',
            background: '#ef4444',
          }} />
        )}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '9px 12px', borderRadius: 9999,
        textDecoration: 'none',
        fontSize: 13.5, fontWeight: active ? 700 : 500,
        color: textColor,
        background: bg,
        transition: 'background 100ms ease, color 100ms ease',
        fontFamily: 'var(--ds-font-family-sans)',
      }}
    >
      <span className="material-symbols-rounded" aria-hidden="true"
        style={{ fontSize: 19, lineHeight: 1, userSelect: 'none', color: iconColor, flexShrink: 0, transition: 'color 100ms ease' }}>
        {iconName}
      </span>
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      {!!badge && badge > 0 && (
        <span style={{
          minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9999,
          background: active ? '#1a7080' : '#e1ebe3',
          color: active ? '#fff' : '#5a6a60',
          fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {badge}
        </span>
      )}
    </Link>
  )
}
