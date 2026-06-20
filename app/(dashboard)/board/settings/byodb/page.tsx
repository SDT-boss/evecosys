import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BYODBForm } from '@/components/board/settings/BYODBForm'

export default async function BYODBPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, state')
    .eq('owner_id', user.id)
    .single()

  if (!tenant) redirect('/board/settings/branding')

  return <BYODBForm tenantId={tenant.id} currentState={tenant.state} />
}
