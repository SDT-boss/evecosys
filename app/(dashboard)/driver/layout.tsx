import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { LeftRailShell } from '@/components/layout/LeftRailShell'
import { AlertBellWrapper } from '@/components/layout/AlertBellWrapper'
import type { AppUser } from '@/types'

const NAV_GROUPS = [
  {
    items: [
      { label: 'Today',        iconName: 'today',          href: '/driver' },
      { label: 'My Trips',     iconName: 'route',          href: '/driver/trips' },
      { label: 'Alerts',       iconName: 'notifications',  href: '/driver/alerts' },
    ],
  },
]

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers()
  const role   = headerStore.get('x-user-role')
  const userId = headerStore.get('x-user-id')

  if (!userId || role !== 'driver') redirect('/login')

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
        full_name: (authUser?.user_metadata?.full_name as string | undefined) ?? 'Driver',
        role: 'driver',
        created_at: new Date().toISOString(),
      }

  return (
    <LeftRailShell navGroups={NAV_GROUPS} user={appUser} alertBell={<AlertBellWrapper role="driver" />}>
      {children}
    </LeftRailShell>
  )
}
