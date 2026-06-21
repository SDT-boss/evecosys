'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItemProps {
  href: string
  label: string
  icon: React.ReactNode
}

export function NavItem({ href, label, icon }: NavItemProps) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--ds-space-sm)',
        padding: 'var(--ds-space-sm) var(--ds-space-md)',
        borderRadius: 'var(--ds-radius-md)',
        textDecoration: 'none',
        fontSize: 'var(--ds-font-size-xs)',
        fontWeight: active
          ? 'var(--ds-font-weight-semibold)'
          : 'var(--ds-font-weight-medium)',
        color: active
          ? 'var(--ds-color-brand-primary)'
          : 'var(--ds-color-neutral-grey-60)',
        background: active ? 'rgba(0,134,132,0.08)' : 'transparent',
        transition: 'background var(--ds-motion-duration-fast) var(--ds-motion-easing-standard), color var(--ds-motion-duration-fast) var(--ds-motion-easing-standard)',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          color: active
            ? 'var(--ds-color-brand-primary)'
            : 'var(--ds-color-neutral-grey-40)',
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  )
}
