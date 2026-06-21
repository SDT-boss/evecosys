import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeftRailShell } from '@/components/layout/LeftRailShell'
import { AlertBellWrapper } from '@/components/layout/AlertBellWrapper'
import { Car, Map, Bell } from 'lucide-react'
import type { AppUser } from '@/types'

const NAV = [
  { label: 'My Vehicle', icon: <Car size={20} />,  href: '/driver' },
  { label: 'My Trips',   icon: <Map size={20} />,  href: '/driver/trips' },
  { label: 'Alerts',     icon: <Bell size={20} />, href: '/driver/alerts' },
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
    <LeftRailShell navItems={NAV} user={profile as AppUser} alertBell={<AlertBellWrapper role="driver" />}>
      {children}
    </LeftRailShell>
  )
}
