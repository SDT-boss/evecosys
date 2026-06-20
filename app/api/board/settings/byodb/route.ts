import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { BYODBRegistrationService } from '@/lib/tenant/registrationService'
import { ConnectivityError } from '@/lib/tenant/probe'
import { RealConnectivityProbe } from '@/lib/tenant/probeDriver'
import { SupabaseVaultStore } from '@/lib/tenant/vaultStore'
import { transition } from '@/lib/tenant/stateMachine'
import { CredentialValidationError } from '@/lib/tenant/credentials'
import type { TenantState } from '@/lib/tenant/types'

export async function POST(req: NextRequest) {
  // Step 1 — auth guard: verify user session
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Step 2 — role guard: caller must be board
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'board')
    return NextResponse.json({ error: 'Forbidden — board role required' }, { status: 403 })

  // Step 3 — fetch full tenant row including current state
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('owner_id', user.id)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Guard inappropriate states
  if (tenant.state === 'Active') {
    return NextResponse.json(
      { error: 'Tenant is already registered — use Update connection to re-register' },
      { status: 400 },
    )
  }
  if (tenant.state === 'Decommissioned' || tenant.state === 'Suspended') {
    return NextResponse.json(
      { error: 'Cannot register in current tenant state' },
      { status: 400 },
    )
  }

  const admin = createServiceClient()

  // Capture the initial state before any transition — used to guard compensating rollback
  const initialState = tenant.state

  // State transition: Registered → Provisioning (if needed)
  let workingTenant = { ...tenant }
  if (tenant.state === 'Registered') {
    // transition() is pure — validates TRANSITIONS table; throws InvalidStateTransitionError if invalid
    transition(tenant.state as TenantState, 'Provisioning')
    const { error: transitionError } = await admin
      .from('tenants')
      .update({ state: 'Provisioning' })
      .eq('id', tenant.id)
    if (transitionError) {
      return NextResponse.json({ error: transitionError.message }, { status: 500 })
    }
    workingTenant = { ...tenant, state: 'Provisioning' }
  }

  // Parse body as BYODBCredentialInput
  let input: unknown
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Construct and call BYODBRegistrationService
  const service = new BYODBRegistrationService(new RealConnectivityProbe(), new SupabaseVaultStore(admin))

  try {
    const result = await service.register(workingTenant, input as Parameters<typeof service.register>[1])

    // Persist the new Active state from result — CR-01: check for write error
    const { error: activateError } = await admin
      .from('tenants')
      .update({ state: result.tenant.state })
      .eq('id', tenant.id)
    if (activateError) {
      // Vault secret already stored — log the secretId for manual reconciliation
      return NextResponse.json(
        { error: 'Registration succeeded but failed to persist state. Please contact support.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, state: result.tenant.state })
  } catch (err) {
    if (err instanceof CredentialValidationError) {
      // Compensating rollback: restore Registered state only if this route caused the transition
      // CR-02: check rollback error and escalate when rollback itself fails
      if (initialState === 'Registered') {
        const { error: rollbackError } = await admin
          .from('tenants')
          .update({ state: 'Registered' })
          .eq('id', tenant.id)
        if (rollbackError) {
          // State is stuck in Provisioning — surface a 500 so ops can investigate
          return NextResponse.json(
            { error: 'Registration failed and state rollback also failed. Please contact support.' },
            { status: 500 },
          )
        }
      }
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }
    if (err instanceof ConnectivityError) {
      // Compensating rollback: restore Registered state only if this route caused the transition
      // CR-02: check rollback error and escalate when rollback itself fails
      if (initialState === 'Registered') {
        const { error: rollbackError } = await admin
          .from('tenants')
          .update({ state: 'Registered' })
          .eq('id', tenant.id)
        if (rollbackError) {
          // State is stuck in Provisioning — surface a 500 so ops can investigate
          return NextResponse.json(
            { error: 'Registration failed and state rollback also failed. Please contact support.' },
            { status: 500 },
          )
        }
      }
      return NextResponse.json({ error: (err as Error).message }, { status: 400 })
    }
    // Unexpected error — let Next.js 500 handler log it
    throw err
  }
}
