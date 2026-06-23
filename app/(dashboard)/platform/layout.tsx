import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { PlatformShell } from '@/components/layout/PlatformShell'
import { BlockedScreen } from '@/components/platform/BlockedScreen'
import type { AppUser } from '@/types'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers()

  // Role is resolved and set by proxy.ts — trusted server-side header, not forgeable by clients
  const role = headerStore.get('x-user-role')
  const userId = headerStore.get('x-user-id')

  if (!userId || role !== 'platform_admin') redirect('/login')

  const cookieStore = await cookies()
  const tenantId = cookieStore.get('platform_active_tenant')?.value ?? null

  const pathname = headerStore.get('x-pathname') ?? ''
  const isSubRoute = pathname !== '/platform' && pathname !== '/platform/'

  // Fetch full profile for AppUser shape (needed by PlatformShell)
  const supabase = await createClient()
  const [{ data: profile }, { data: { user: authUser } }] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.auth.getUser(),
  ])

  // Auth is already confirmed by the proxy-set x-user-role header above.
  // If the public.users row is missing (e.g. trigger didn't run), construct
  // a minimal AppUser from the auth record so the admin isn't locked out.
  const appUser: AppUser = profile
    ? (profile as AppUser)
    : {
        id: userId,
        email: authUser?.email ?? '',
        full_name: (authUser?.user_metadata?.full_name as string | undefined) ?? 'Platform Admin',
        role: 'platform_admin',
        created_at: new Date().toISOString(),
      }

  if (isSubRoute && !tenantId) {
    return (
      <PlatformShell user={appUser} activeTenantId={null} activeTenantName={null}>
        <BlockedScreen />
      </PlatformShell>
    )
  }

  let activeTenantName: string | null = null
  if (tenantId) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()
    activeTenantName = tenant?.name ?? null
  }

  return (
    <PlatformShell
      user={appUser}
      activeTenantId={tenantId}
      activeTenantName={activeTenantName}
    >
      {children}
    </PlatformShell>
  )
}
