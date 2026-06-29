import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrandingForm } from '@/components/board/settings/BrandingForm'

export default async function BrandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, logo_url, primary_color')
    .eq('owner_id', user.id)
    .single()

  if (!tenant) redirect('/board/settings')

  return <BrandingForm initialData={tenant} />
}
