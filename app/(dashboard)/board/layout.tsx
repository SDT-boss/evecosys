import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeftRailShell } from '@/components/layout/LeftRailShell'
import { AlertBellWrapper } from '@/components/layout/AlertBellWrapper'
import { LayoutDashboard, LayoutGrid, Leaf, Map, Settings } from 'lucide-react'
import type { AppUser } from '@/types'

const NAV = [
  { label: 'Overview', icon: <LayoutDashboard size={20} />, href: '/board' },
  { label: 'Fleet',    icon: <LayoutGrid size={20} />,       href: '/board/fleet' },
  { label: 'Carbon',   icon: <Leaf size={20} />,             href: '/board/carbon' },
  { label: 'Trips',    icon: <Map size={20} />,              href: '/board/trips' },
  { label: 'Settings', icon: <Settings size={20} />,         href: '/board/settings' },
]

export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'board') redirect('/login')

  return (
    <LeftRailShell navItems={NAV} user={profile as AppUser} alertBell={<AlertBellWrapper role="board" />}>
      {children}
    </LeftRailShell>
  )
}
