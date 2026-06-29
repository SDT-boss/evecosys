import { NextResponse } from 'next/server'
import { DispatchEngine } from '@/lib/fleet/dispatch-engine'
import { MockTelemetryAdapter } from '@/lib/fleet/adapters/mock-telemetry-adapter'
import { SupabaseFleetRepository } from '@/lib/fleet/supabase-fleet-repository'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const PATROL_START_COORDS = {
  latitude:  Number(process.env.PATROL_START_LAT),
  longitude: Number(process.env.PATROL_START_LNG),
}

export async function POST() {
  // This endpoint drives fleet-wide dispatch with the RLS-bypassing service
  // role, so gate it on an authenticated manager before doing any work.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const service   = createServiceClient()
    const repo      = new SupabaseFleetRepository(service)
    const telemetry = new MockTelemetryAdapter()
    const engine    = new DispatchEngine(telemetry, repo, PATROL_START_COORDS)

    await engine.evaluateFleet()

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[fleet/evaluate]', message)
    return NextResponse.json({ error: 'Fleet evaluation failed' }, { status: 500 })
  }
}
