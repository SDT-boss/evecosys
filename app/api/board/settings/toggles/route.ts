import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import { safeRecord } from '@/lib/audit/safeRecord'

const KNOWN_FLAGS = [
  'member_invitations',
  'fleet',
  'carbon',
  'trips',
  'driver_behaviour_score',
  'alerts',
  'charging_stations',
  'auth_troubleshooting',
] as const

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'board') return NextResponse.json({ error: 'Forbidden — board role required' }, { status: 403 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const body = await req.json()
  const { flags } = body

  if (!flags || typeof flags !== 'object' || Array.isArray(flags)) {
    return NextResponse.json({ error: 'Invalid flags payload' }, { status: 400 })
  }

  // Reject unknown keys
  const hasUnknownKeys = Object.keys(flags).some(
    (k) => !(KNOWN_FLAGS as readonly string[]).includes(k)
  )
  if (hasUnknownKeys) {
    return NextResponse.json({ error: 'Invalid flags payload' }, { status: 400 })
  }

  // Require all 8 known flag keys to be present
  const hasAllKeys = KNOWN_FLAGS.every((k) => k in flags)
  if (!hasAllKeys) {
    return NextResponse.json({ error: 'Invalid flags payload' }, { status: 400 })
  }

  // Reject non-boolean values
  const allBoolean = Object.values(flags).every((v) => typeof v === 'boolean')
  if (!allBoolean) {
    return NextResponse.json({ error: 'Invalid flags payload' }, { status: 400 })
  }

  const { error } = await supabase
    .from('tenants')
    .update({ feature_flags: flags })
    .eq('id', tenant.id)

  const recorder = new SupabaseAuditRecorder(createServiceClient())
  const actor = { id: user.id, label: user.email ?? user.id, role: 'board' }

  if (error) {
    await safeRecord(recorder, {
      tenantId: tenant.id, actor, action: 'config.feature_flags', outcome: 'error',
      resourceType: 'tenant', resourceId: tenant.id, error: error.message,
    })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await safeRecord(recorder, {
    tenantId: tenant.id, actor, action: 'config.feature_flags', outcome: 'ok',
    resourceType: 'tenant', resourceId: tenant.id,
    details: { flags }, // booleans only; no sensitive values
  })
  return NextResponse.json({ ok: true })
}
