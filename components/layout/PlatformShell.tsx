'use client'

import { useRouter, usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Logo } from '@/components/ui/Logo'
import { ActiveTenantIndicator } from '@/components/platform/ActiveTenantIndicator'
import type { AppUser } from '@/types'

const NAV_TABS = [
  { label: 'Tenants', href: '/platform' },
]

interface PlatformShellProps {
  children: React.ReactNode
  user: AppUser
  activeTenantName: string | null
}

export function PlatformShell({ children, user, activeTenantName }: PlatformShellProps) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Topbar */}
      <div
        className="h-[62px] flex items-center justify-between px-7 sticky top-0 z-30 flex-shrink-0"
        style={{ background: 'var(--topbar-bg)', borderBottom: '1px solid var(--topbar-border)' }}
      >
        <div className="flex items-center gap-4">
          <Logo width={110} />
          <div style={{ width: 1, height: 28, background: 'var(--ds-color-neutral-grey-70)' }} />
          <span className="text-xs" style={{ color: 'var(--ds-color-neutral-grey-40)' }}>Platform Admin</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Active tenant indicator */}
          <ActiveTenantIndicator name={activeTenantName} />

          <ThemeToggle />

          {/* User */}
          <div className="flex items-center gap-2 pl-3" style={{ borderLeft: '1px solid var(--ds-color-neutral-grey-70)' }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ background: 'var(--ds-color-brand-primary)', color: 'white', fontWeight: 700 }}
            >
              {user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs" style={{ color: 'var(--ds-color-neutral-grey-20)', fontWeight: 600 }}>{user.full_name}</div>
              <div className="text-[10px]" style={{ color: 'var(--ds-color-neutral-grey-60)' }}>Platform Admin</div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--ds-color-neutral-grey-70)',
              color: 'var(--ds-color-neutral-grey-40)',
            }}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Nav — horizontal tabs */}
      <div
        className="flex px-7 gap-1 flex-shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--topbar-border)', scrollbarWidth: 'none' }}
      >
        {NAV_TABS.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex items-center gap-2 px-5 py-3.5 text-xs font-500 transition-all duration-150 flex-shrink-0"
              style={{
                color: isActive ? 'var(--ds-color-brand-primary)' : 'var(--ds-color-neutral-grey-60)',
                borderBottom: isActive ? '2.5px solid var(--ds-color-brand-primary)' : '2.5px solid transparent',
                fontWeight: 500,
                marginBottom: -1,
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1280px] mx-auto px-7 py-7 pb-12">
          {children}
        </div>
      </main>
    </div>
  )
}
