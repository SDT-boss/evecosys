import { ActiveTenantIndicator } from '@/components/platform/ActiveTenantIndicator'
import { TenantProvider } from '@/components/platform/TenantContext'
import { LeftRailShell } from '@/components/layout/LeftRailShell'
import type { AppUser } from '@/types'

const NAV_GROUPS = [
  {
    items: [
      { label: 'Tenants', iconName: 'domain', href: '/platform' },
    ],
  },
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
        navGroups={NAV_GROUPS}
        user={user}
        alertBell={<ActiveTenantIndicator />}
      >
        {children}
      </LeftRailShell>
    </TenantProvider>
  )
}
