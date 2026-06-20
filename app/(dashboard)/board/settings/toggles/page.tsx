import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ToggleForm } from '@/components/board/settings/ToggleForm'

export default async function TogglesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, feature_flags')
    .eq('owner_id', user.id)
    .single()

  if (!tenant) redirect('/board/settings')

  return (
    <ToggleForm
      tenantId={tenant.id}
      initialFlags={(tenant.feature_flags ?? {}) as Record<string, boolean>}
    />
  )
}
