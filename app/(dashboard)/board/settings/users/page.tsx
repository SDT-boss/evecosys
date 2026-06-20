import { createClient } from '@/lib/supabase/server'
import { InviteForm } from '@/components/board/settings/InviteForm'
import { MemberTable } from '@/components/board/settings/MemberTable'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, feature_flags')
    .eq('owner_id', user!.id)
    .single()

  const { data: members } = await supabase
    .from('users')
    .select('id, full_name, email, role, created_at')
    .eq('tenant_id', tenant!.id)
    .order('created_at', { ascending: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-lg)' }}>
      <InviteForm tenantId={tenant!.id} />
      <MemberTable
        members={members ?? []}
        authTroubleshootingEnabled={tenant?.feature_flags?.auth_troubleshooting ?? false}
      />
    </div>
  )
}
