import { Building2 } from 'lucide-react'
import { ActiveTenantIndicator } from '@/components/platform/ActiveTenantIndicator'
import { TenantProvider } from '@/components/platform/TenantContext'
import { LeftRailShell } from '@/components/layout/LeftRailShell'
import type { AppUser } from '@/types'

const NAV = [
  { label: 'Tenants', icon: <Building2 size={20} />, href: '/platform' },
]

interface PlatformShellProps {
  children: React.ReactNode
  user: AppUser
  activeTenantId?: string | null
  activeTenantName: string | null
}

export function PlatformShell({ children, user, activeTenantId, activeTenantName }: PlatformShellProps) {
  return (
    <TenantProvider initialId={activeTenantId} initialName={activeTenantName}>
      <LeftRailShell
        navItems={NAV}
        user={user}
        alertBell={<ActiveTenantIndicator />}
      >
        {children}
      </LeftRailShell>
    </TenantProvider>
  )
}
