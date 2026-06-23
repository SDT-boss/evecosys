import { NextRequest, NextResponse } from 'next/server'
import { planTrip } from '@/lib/trip-planner/trip-planner'
import { createClient } from '@/lib/supabase/server'
import type { TripRequest } from '@/lib/trip-planner/types'
import type { Charger } from '@/lib/trip-planner/types'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { vehicleModel, batteryPercent, origin, destination } = body as Record<string, unknown>

  if (
    typeof batteryPercent !== 'number' ||
    batteryPercent < 0 || batteryPercent > 100 ||
    !origin || !destination || !vehicleModel
  ) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('charging_stations')
      .select('id, latitude, longitude, type, is_occupied')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (error) throw error

    const chargers: Charger[] = (data ?? []).map(row => ({
      id:         row.id,
      latitude:   row.latitude,
      longitude:  row.longitude,
      type:       row.type ?? 'DEPOT',
      isOccupied: row.is_occupied ?? false,
    }))

    const request: TripRequest = {
      vehicleModel:   vehicleModel as TripRequest['vehicleModel'],
      batteryPercent: batteryPercent as number,
      origin:         origin as TripRequest['origin'],
      destination:    destination as TripRequest['destination'],
    }

    const plan = planTrip(request, chargers)
    return NextResponse.json(plan)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[trips/plan]', message)
    return NextResponse.json({ error: 'Trip planning failed', detail: message }, { status: 500 })
  }
}
