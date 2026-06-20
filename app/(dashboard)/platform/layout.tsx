import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { PlatformShell } from '@/components/layout/PlatformShell'
import type { AppUser } from '@/types'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'platform_admin') redirect('/login')

  // Read active tenant from cookie — role guard MUST run before this
  const cookieStore = await cookies()
  const tenantId = cookieStore.get('platform_active_tenant')?.value ?? null

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
      user={profile as AppUser}
      activeTenantName={activeTenantName}
    >
      {children}
    </PlatformShell>
  )
}
