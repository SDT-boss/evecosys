import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { AlertBellWrapper } from '@/components/layout/AlertBellWrapper'
import type { AppUser } from '@/types'

const NAV = [
  { label: 'My Vehicle', icon: '🚗', href: '/driver' },
  { label: 'My Trips',   icon: '🗺', href: '/driver/trips' },
  { label: 'Alerts',     icon: '🔔', href: '/driver/alerts' },
]

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'driver') redirect('/login')

  return (
    <DashboardShell navItems={NAV} user={profile as AppUser} alertBell={<AlertBellWrapper role="driver" />}>
      {children}
    </DashboardShell>
  )
}
