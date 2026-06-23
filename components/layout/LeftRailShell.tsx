'use client'

import { useState } from 'react'
import type { AppUser } from '@/types'
import { BrandHeader } from './shell/BrandHeader'
import { AskEveLauncher } from './shell/AskEveLauncher'
import { SidebarSearch } from './shell/SidebarSearch'
import { NavItem } from './shell/NavItem'
import { AccountBlock } from './shell/AccountBlock'
import { ContentUtilityBar } from './shell/ContentUtilityBar'
import { TenantSwitcher } from './shell/TenantSwitcher'

export interface NavItemConfig {
  label: string
  iconName: string
  href: string
  badge?: number
}

export interface NavGroup {
  label?: string
  items: NavItemConfig[]
}

export interface TenantOption {
  id: string
  name: string
}

export interface LeftRailShellProps {
  navGroups: NavGroup[]
  user: AppUser
  alertBell?: React.ReactNode
  children: React.ReactNode
  tenants?: TenantOption[]
  onTenantSelect?: (id: string) => void
}

const RAIL_EXPANDED = 264
const RAIL_COLLAPSED = 72

export function LeftRailShell({
  navGroups,
  user,
  alertBell,
  children,
  tenants = [],
  onTenantSelect,
}: LeftRailShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const railWidth = collapsed ? RAIL_COLLAPSED : RAIL_EXPANDED
  const isPlatformAdmin = user.role === 'platform_admin'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--ds-font-family-sans)' }}>
      {/* Left Rail */}
      <aside
        style={{
          width: railWidth,
          minWidth: railWidth,
          maxWidth: railWidth,
          background: '#fff',
          borderRight: '1px solid #e7ece8',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: collapsed ? '14px 16px' : '14px 14px 14px',
          transition: 'width var(--ds-motion-duration-base) var(--ds-motion-easing-standard)',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 20,
        }}
      >
        <BrandHeader collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

        <AskEveLauncher collapsed={collapsed} />

        <SidebarSearch collapsed={collapsed} />

        {isPlatformAdmin && tenants.length > 0 && (
          <TenantSwitcher tenants={tenants} onSelect={onTenantSelect ?? (() => {})} />
        )}

        {/* Divider */}
        <div style={{ height: 1, background: '#dde6df', flexShrink: 0, margin: collapsed ? '2px 0' : '2px -2px' }} />

        {/* Nav groups */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            margin: '0 -2px',
            padding: '0 2px',
          }}
        >
          {navGroups.map((group, gi) => (
            <div key={gi} style={{ marginTop: gi > 0 ? (collapsed ? 0 : 4) : 0 }}>
              {collapsed ? (
                gi > 0 ? (
                  <div style={{ height: 1, background: '#dde6df', margin: '6px 8px 8px' }} />
                ) : null
              ) : (
                group.label ? (
                  <div style={{
                    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '.6px', color: '#9aa79e', padding: '4px 12px 6px',
                  }}>
                    {group.label}
                  </div>
                ) : null
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.items.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    iconName={item.iconName}
                    badge={item.badge}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Account block */}
        <AccountBlock
          user={{ name: user.full_name, email: user.email, avatarUrl: user.avatar_url }}
          collapsed={collapsed}
        />
      </aside>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          marginLeft: railWidth,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          background: '#f2f5f2',
          transition: 'margin-left var(--ds-motion-duration-base) var(--ds-motion-easing-standard)',
        }}
      >
        <ContentUtilityBar>{alertBell}</ContentUtilityBar>
        <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
      </div>
    </div>
  )
}
