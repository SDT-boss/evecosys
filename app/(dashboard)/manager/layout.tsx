import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { LeftRailShell } from '@/components/layout/LeftRailShell'
import { AlertBellWrapper } from '@/components/layout/AlertBellWrapper'
import type { AppUser } from '@/types'

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { label: 'Fleet Overview',      iconName: 'space_dashboard', href: '/manager' },
      { label: 'Vehicles & Assets',   iconName: 'local_shipping',  href: '/manager/assets' },
      { label: 'Drivers',             iconName: 'group',           href: '/manager/drivers' },
      { label: 'Trips',               iconName: 'route',           href: '/manager/trips' },
    ],
  },
  {
    label: 'Energy',
    items: [
      { label: 'Charging Stations',   iconName: 'bolt',            href: '/manager/charging' },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Alerts',              iconName: 'notifications',   href: '/manager/alerts' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Users',               iconName: 'manage_accounts', href: '/manager/users' },
    ],
  },
]

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers()
  const role   = headerStore.get('x-user-role')
  const userId = headerStore.get('x-user-id')

  if (!userId || role !== 'manager') redirect('/login')

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
        full_name: (authUser?.user_metadata?.full_name as string | undefined) ?? 'Fleet Manager',
        role: 'manager',
        created_at: new Date().toISOString(),
      }

  return (
    <LeftRailShell navGroups={NAV_GROUPS} user={appUser} alertBell={<AlertBellWrapper role="manager" />}>
      {children}
    </LeftRailShell>
  )
}
