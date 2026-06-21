import { NextResponse } from 'next/server'
import { DispatchEngine } from '@/lib/fleet/dispatch-engine'
import { MockTelemetryAdapter } from '@/lib/fleet/adapters/mock-telemetry-adapter'
import { SupabaseFleetRepository } from '@/lib/fleet/supabase-fleet-repository'
import { createServiceClient } from '@/lib/supabase/service'

const PATROL_START_COORDS = {
  latitude:  Number(process.env.PATROL_START_LAT),
  longitude: Number(process.env.PATROL_START_LNG),
}

export async function POST() {
  try {
    const supabase  = createServiceClient()
    const repo      = new SupabaseFleetRepository(supabase)
    const telemetry = new MockTelemetryAdapter()
    const engine    = new DispatchEngine(telemetry, repo, PATROL_START_COORDS)

    await engine.evaluateFleet()

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[fleet/evaluate]', message)
    return NextResponse.json({ error: 'Fleet evaluation failed', detail: message }, { status: 500 })
  }
}
