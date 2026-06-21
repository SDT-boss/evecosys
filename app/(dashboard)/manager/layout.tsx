import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeftRailShell } from '@/components/layout/LeftRailShell'
import { AlertBellWrapper } from '@/components/layout/AlertBellWrapper'
import { LayoutDashboard, Truck, Users, Route, Zap, Bell, Settings } from 'lucide-react'
import type { AppUser } from '@/types'

const NAV = [
  { label: 'Overview',          icon: <LayoutDashboard size={20} />, href: '/manager' },
  { label: 'Asset Management',  icon: <Truck size={20} />,           href: '/manager/assets' },
  { label: 'Drivers',           icon: <Users size={20} />,           href: '/manager/drivers' },
  { label: 'Trips',             icon: <Route size={20} />,           href: '/manager/trips' },
  { label: 'Charging Stations', icon: <Zap size={20} />,             href: '/manager/charging' },
  { label: 'Alerts',            icon: <Bell size={20} />,            href: '/manager/alerts' },
  { label: 'Users',             icon: <Settings size={20} />,        href: '/manager/users' },
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
    <LeftRailShell navItems={NAV} user={profile as AppUser} alertBell={<AlertBellWrapper role="manager" />}>
      {children}
    </LeftRailShell>
  )
}
