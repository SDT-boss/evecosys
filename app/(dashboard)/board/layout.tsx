import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { LeftRailShell } from '@/components/layout/LeftRailShell'
import { AlertBellWrapper } from '@/components/layout/AlertBellWrapper'
import type { AppUser } from '@/types'

const NAV_GROUPS = [
  {
    label: 'Dashboards',
    items: [
      { label: 'Overview', iconName: 'space_dashboard', href: '/board' },
      { label: 'Fleet',    iconName: 'local_shipping',  href: '/board/fleet' },
      { label: 'Carbon',   iconName: 'eco',             href: '/board/carbon' },
      { label: 'Trips',    iconName: 'route',           href: '/board/trips' },
    ],
  },
  {
    label: 'Setup',
    items: [
      { label: 'Settings', iconName: 'settings', href: '/board/settings' },
    ],
  },
]

export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers()
  const role   = headerStore.get('x-user-role')
  const userId = headerStore.get('x-user-id')

  if (!userId || role !== 'board') redirect('/login')

  const supabase = await createClient()
  const [{ data: profile }, { data: { user: authUser } }] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.auth.getUser(),
  ])

  const appUser: AppUser = profile
    ? (profile as AppUser)
    : {
        id: userId,
        email: authUser?.email ?? '',
        full_name: (authUser?.user_metadata?.full_name as string | undefined) ?? 'Board Member',
        role: 'board',
        created_at: new Date().toISOString(),
      }

  return (
    <LeftRailShell navGroups={NAV_GROUPS} user={appUser} alertBell={<AlertBellWrapper role="board" />}>
      {children}
    </LeftRailShell>
  )
}
