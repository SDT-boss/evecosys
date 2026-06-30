import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SupabaseControlPlaneStore } from '@/lib/tenant/controlplane/supabaseStore'
import { ControlPlaneConfigResolver } from '@/lib/tenant/controlplane/configResolver'

/**
 * Returns the control-plane snapshot for a tenant, but ONLY with validated tenant
 * context: platform_admin (any tenant) OR the authenticated owner of this tenant.
 * Everyone else gets 403 — no tenant can read another tenant's control-plane state.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'platform_admin'

  if (!isAdmin) {
    // Validated tenant context: the caller must OWN this tenant. RLS on tenants
    // (tenants_select_own) only returns the row when auth.uid() = owner_id.
    const { data: owned } = await supabase
      .from('tenants').select('id').eq('id', tenantId).maybeSingle()
    if (!owned) {
      return NextResponse.json({ error: 'Forbidden — not your tenant' }, { status: 403 })
    }
  }

  const admin = createServiceClient()
  const resolver = new ControlPlaneConfigResolver(new SupabaseControlPlaneStore(admin))
  const snapshot = await resolver.resolve(tenantId)
  if (!snapshot) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  return NextResponse.json(snapshot)
}
