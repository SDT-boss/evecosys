'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Logo } from '@/components/ui/Logo'
import type { AppUser } from '@/types'

interface DashboardShellProps {
  children: React.ReactNode
  navItems: { label: string; icon: string; href: string }[]
  user: AppUser
  alertBell?: React.ReactNode
}

export function DashboardShell({ children, navItems, user, alertBell }: DashboardShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const roleLabel: Record<string, string> = {
    manager: 'Fleet Manager',
    board: 'Board Member',
    driver: 'Driver',
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
          <div style={{ width: 1, height: 28, background: '#333' }} />
          <span className="text-xs" style={{ color: '#888' }}>Fleet Management System</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Live indicator — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1 text-xs font-600"
            style={{ background: 'rgba(124,194,66,0.12)', border: '1px solid rgba(124,194,66,0.25)', color: '#7cc242', fontWeight: 600 }}>
            <div className="w-[7px] h-[7px] rounded-full live-pulse" style={{ background: '#7cc242' }} />
            LIVE
          </div>

          {/* Clock — hidden on mobile */}
          <span className="hidden sm:block text-xs font-condensed" style={{ color: '#777', letterSpacing: '0.5px' }}>
            {clock}
          </span>

          {/* Notifications */}
          {alertBell}

          <ThemeToggle />

          {/* User */}
          <div className="flex items-center gap-2 pl-3" style={{ borderLeft: '1px solid #333' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-700"
              style={{ background: '#7cc242', color: 'white', fontWeight: 700 }}>
              {user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-600" style={{ color: '#ccc', fontWeight: 600 }}>{user.full_name}</div>
              <div className="text-[10px]" style={{ color: '#666' }}>{roleLabel[user.role]}</div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #333', color: '#888' }}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Nav — horizontally scrollable on mobile */}
      <div
        className="flex px-7 gap-1 flex-shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--topbar-border)', scrollbarWidth: 'none' }}
      >
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex items-center gap-2 px-5 py-3.5 text-xs font-500 transition-all duration-150 flex-shrink-0"
              style={{
                color: isActive ? '#7cc242' : '#777',
                borderBottom: isActive ? '2.5px solid #7cc242' : '2.5px solid transparent',
                fontWeight: 500,
                marginBottom: -1,
              }}
            >
              <span>{item.icon}</span>
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
