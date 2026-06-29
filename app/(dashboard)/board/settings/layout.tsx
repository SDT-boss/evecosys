import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsTabNav } from '@/components/board/settings/SettingsTabNav'

export default async function BoardSettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'board') redirect('/login')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!tenant) redirect('/login')

  return (
    <div style={{ padding: 'var(--ds-space-lg)' }}>
      <h1 style={{
        fontSize: 'var(--ds-font-size-xl)',
        fontWeight: 'var(--ds-font-weight-semibold)',
        color: 'var(--ds-color-neutral-ink)',
        marginBottom: 'var(--ds-space-md)',
      }}>
        Tenant Settings
      </h1>
      <SettingsTabNav />
      <div style={{ marginTop: 'var(--ds-space-lg)' }}>
        {children}
      </div>
    </div>
  )
}
