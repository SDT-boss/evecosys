import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { AlertBellWrapper } from '@/components/layout/AlertBellWrapper'
import type { AppUser } from '@/types'

const NAV = [
  { label: 'Overview',        icon: '◈', href: '/manager' },
  { label: 'Asset Management',icon: '⊞', href: '/manager/assets' },
  { label: 'Drivers',         icon: '👤', href: '/manager/drivers' },
  { label: 'Trips',           icon: '🗺', href: '/manager/trips' },
  { label: 'Charging Stations', icon: '⚡', href: '/manager/charging' },
  { label: 'Alerts',          icon: '🔔', href: '/manager/alerts' },
  { label: 'Users',           icon: '⚙', href: '/manager/users' },
]

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'manager') redirect('/login')

  return (
    <DashboardShell navItems={NAV} user={profile as AppUser} alertBell={<AlertBellWrapper role="manager" />}>
      {children}
    </DashboardShell>
  )
}
