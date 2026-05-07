import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { AlertBellWrapper } from '@/components/layout/AlertBellWrapper'
import type { AppUser } from '@/types'

const NAV = [
  { label: 'Overview',   icon: '◈', href: '/board' },
  { label: 'Fleet',      icon: '⊞', href: '/board/fleet' },
  { label: 'Carbon',     icon: '🌱', href: '/board/carbon' },
  { label: 'Trips',      icon: '🗺', href: '/board/trips' },
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
    <DashboardShell navItems={NAV} user={profile as AppUser} alertBell={<AlertBellWrapper role="board" />}>
      {children}
    </DashboardShell>
  )
}
