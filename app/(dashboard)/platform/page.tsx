import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { TenantList } from '@/components/platform/TenantList'
import { mapTenantState } from '@/lib/platform/tenantStatus'
import type { TenantState } from '@/lib/tenant/types'

export default async function PlatformPage() {
  const supabase = await createClient()

  // Read active tenant ID from cookie for row highlight (RESEARCH Pitfall 5)
  const cookieStore = await cookies()
  const activeTenantId = cookieStore.get('platform_active_tenant')?.value ?? null

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, state')
    .neq('state', 'Decommissioned')
    .order('created_at', { ascending: true })

  if (error) {
    return (
      <div style={{ padding: 'var(--ds-space-xl)' }}>
        <TenantList tenants={[]} activeTenantId={activeTenantId} error="Could not load tenants" />
      </div>
    )
  }

  const mapped = (tenants ?? [])
    .map((t) => ({
      id: t.id,
      name: t.name as string,
      status: mapTenantState(t.state as TenantState),
    }))
    .filter(
      (t): t is { id: string; name: string; status: 'Active' | 'Pending' | 'Suspended' } =>
        t.status !== null,
    )

  return (
    <div style={{ padding: 'var(--ds-space-xl)' }}>
      <h1
        style={{
          fontSize: 'var(--ds-font-size-xl)',
          fontWeight: 'var(--ds-font-weight-semibold)',
          color: 'var(--text)',
        }}
      >
        Tenant List
      </h1>
      <p style={{ color: 'var(--text3)', marginTop: 'var(--ds-space-xs)' }}>
        All registered tenants on this platform
      </p>
      <TenantList tenants={mapped} activeTenantId={activeTenantId} />
    </div>
  )
}
