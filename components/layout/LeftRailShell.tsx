'use client'

import { useState } from 'react'
import type { AppUser } from '@/types'
import { BrandHeader } from './shell/BrandHeader'
import { SidebarSearch } from './shell/SidebarSearch'
import { NavItem } from './shell/NavItem'
import { AccountBlock } from './shell/AccountBlock'
import { AskEveLauncher } from './shell/AskEveLauncher'
import { ContentUtilityBar } from './shell/ContentUtilityBar'
import { TenantSwitcher } from './shell/TenantSwitcher'

export interface NavItemConfig {
  label: string
  icon: React.ReactNode
  href: string
}

export interface LeftRailShellProps {
  navItems: NavItemConfig[]
  user: AppUser
  alertBell?: React.ReactNode
  children: React.ReactNode
}

const RAIL_WIDTH_EXPANDED = 264
const RAIL_WIDTH_COLLAPSED = 72

export function LeftRailShell({
  navItems,
  user,
  alertBell,
  children,
}: LeftRailShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const railWidth = collapsed ? RAIL_WIDTH_COLLAPSED : RAIL_WIDTH_EXPANDED

  const isPlatformAdmin = user.role === 'platform_admin'

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: 'var(--ds-font-family-sans)',
      }}
    >
      {/* Left Rail */}
      <aside
        style={{
          width: railWidth,
          minWidth: railWidth,
          maxWidth: railWidth,
          // rail bg — raw value; no --ds-* token exists for this surface
          background: '#eef3f0',
          borderRight: '1px solid var(--ds-color-neutral-grey-20)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width var(--ds-motion-duration-base) var(--ds-motion-easing-standard)',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 20,
        }}
      >
        {/* Brand + collapse toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <BrandHeader collapsed={collapsed} />
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              marginRight: 'var(--ds-space-sm)',
              width: 28,
              height: 28,
              borderRadius: 'var(--ds-radius-sm)',
              border: '1px solid var(--ds-color-neutral-grey-20)',
              background: 'transparent',
              color: 'var(--ds-color-neutral-grey-40)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: '10px',
            }}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        {/* AskEVE launcher */}
        {!collapsed && <AskEveLauncher />}

        {/* Search */}
        {!collapsed && <SidebarSearch />}

        {/* Tenant switcher — platform admin only */}
        {!collapsed && isPlatformAdmin && (
          <TenantSwitcher tenants={[]} onSelect={() => {}} />
        )}

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'var(--ds-color-neutral-grey-20)',
            margin: 'var(--ds-space-xs) var(--ds-space-md)',
          }}
        />

        {/* Nav items */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: `0 ${collapsed ? 'var(--ds-space-xs)' : '0'}`,
          }}
        >
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={collapsed ? '' : item.label}
              icon={item.icon}
            />
          ))}
        </nav>

        {/* Account block */}
        <AccountBlock
          user={{
            name: user.full_name,
            email: user.email,
            avatarUrl: user.avatar_url,
          }}
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
          // page ground — raw value; no --ds-* token exists for this surface
          background: '#f2f5f2',
          transition: 'margin-left var(--ds-motion-duration-base) var(--ds-motion-easing-standard)',
        }}
      >
        {/* Content utility bar with alertBell slot */}
        <ContentUtilityBar>{alertBell}</ContentUtilityBar>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
