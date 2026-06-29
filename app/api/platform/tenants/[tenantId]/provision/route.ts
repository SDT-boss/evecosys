import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildOrchestrator } from '@/lib/tenant/provisioning/buildOrchestrator'
import { SupabaseProvisioningRunStore } from '@/lib/tenant/provisioning/supabaseRunStore'
import { transition } from '@/lib/tenant/stateMachine'
import type { ProvisioningContext } from '@/lib/tenant/provisioning/types'
import type { BYODBCredentialInput } from '@/lib/tenant/credentials'
import type { Tenant, TenantState } from '@/lib/tenant/types'

/** Maps a run status to an HTTP status code. */
function statusToHttp(runStatus: string): number {
  switch (runStatus) {
    case 'Provisioned': return 200
    case 'AwaitingManualIntervention': return 202
    case 'RolledBack': return 409
    default: return 500
  }
}

async function requirePlatformAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'platform_admin') {
    return { error: NextResponse.json({ error: 'Forbidden — platform_admin role required' }, { status: 403 }) }
  }
  return { user }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params

  const guard = await requirePlatformAdmin()
  if ('error' in guard) return guard.error

  const admin = createServiceClient()

  // Resolve tenant from the control plane — never trust the body for identity.
  const { data: tenant } = await admin.from('tenants').select('*').eq('id', tenantId).single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  if (tenant.state !== 'Registered' && tenant.state !== 'Provisioning') {
    return NextResponse.json(
      { error: `Cannot provision a tenant in state ${tenant.state}` },
      { status: 400 },
    )
  }

  // Parse credentials from the body.
  let byodbInput: unknown
  try {
    byodbInput = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Move Registered → Provisioning before running the orchestrator.
  let workingTenant: Tenant = { ...(tenant as Tenant) }
  if (tenant.state === 'Registered') {
    transition(tenant.state as TenantState, 'Provisioning') // validates; throws on invalid
    const { error: tErr } = await admin.from('tenants').update({ state: 'Provisioning' }).eq('id', tenantId)
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })
    workingTenant = { ...workingTenant, state: 'Provisioning' }
  }

  const ctx: ProvisioningContext = {
    tenant: workingTenant,
    byodbInput: byodbInput as BYODBCredentialInput,
  }

  const orchestrator = buildOrchestrator(admin)
  const run = await orchestrator.provision(ctx)

  return NextResponse.json(
    { runId: run.runId, status: run.status, steps: run.steps },
    { status: statusToHttp(run.status) },
  )
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params

  const guard = await requirePlatformAdmin()
  if ('error' in guard) return guard.error

  const admin = createServiceClient()
  const store = new SupabaseProvisioningRunStore(admin)
  const run = await store.getLatestRunForTenant(tenantId)

  if (!run) return NextResponse.json({ error: 'No provisioning run found' }, { status: 404 })
  return NextResponse.json(run)
}
