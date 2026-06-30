import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePlatformAdmin } from '@/lib/platform/requirePlatformAdmin'
import { SupabaseControlPlaneStore } from '@/lib/tenant/controlplane/supabaseStore'
import { TenantLifecycleService } from '@/lib/tenant/controlplane/lifecycleService'
import { SupabaseVaultStore } from '@/lib/tenant/vaultStore'
import { TenantNotFoundError, OverrideError } from '@/lib/tenant/controlplane/errors'
import { InvalidStateTransitionError, type TenantState } from '@/lib/tenant/types'
import type { LifecycleAction } from '@/lib/tenant/controlplane/types'

interface LifecycleBody {
  action: LifecycleAction
  // override only:
  toState?: TenantState
  reason?: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const guard = await requirePlatformAdmin()
  if ('error' in guard) return guard.error

  let body: LifecycleBody
  try {
    body = (await req.json()) as LifecycleBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const admin = createServiceClient()
  const store = new SupabaseControlPlaneStore(admin)
  const service = new TenantLifecycleService(store, new SupabaseVaultStore(admin))
  const actor = guard.user.email

  try {
    let tenant
    switch (body.action) {
      case 'suspend': tenant = await service.suspend(tenantId, actor); break
      case 'reactivate': tenant = await service.reactivate(tenantId, actor); break
      case 'decommission': tenant = await service.decommission(tenantId, actor); break
      case 'override':
        if (!body.toState) return NextResponse.json({ error: 'override requires toState' }, { status: 400 })
        tenant = await service.override(tenantId, body.toState, actor, body.reason ?? ''); break
      default:
        return NextResponse.json({ error: `Unknown action: ${String(body.action)}` }, { status: 400 })
    }
    return NextResponse.json({ ok: true, state: tenant.state })
  } catch (err) {
    if (err instanceof TenantNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 })
    if (err instanceof InvalidStateTransitionError) return NextResponse.json({ error: err.message }, { status: 409 })
    if (err instanceof OverrideError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}
