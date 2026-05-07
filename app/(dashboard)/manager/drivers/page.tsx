import { createClient } from '@/lib/supabase/server'
import { DriversClient } from '@/components/manager/DriversClient'
import type { Driver, Trip, Vehicle, AppUser } from '@/types'

export default async function DriversPage() {
  const supabase = await createClient()

  let drivers: (Driver & { user?: AppUser; vehicle?: Vehicle })[] = []
  let trips: Trip[] = []
  let vehicles: Vehicle[] = []

  try {
    const [dr, tr, vr] = await Promise.all([
      supabase
        .from('drivers')
        .select('*, user:users(full_name, email), vehicle:vehicles(brand, model, plate_no, status)'),
      supabase.from('trips').select('*').order('started_at', { ascending: false }),
      supabase.from('vehicles').select('*'),
    ])
    drivers = (dr.data ?? []) as typeof drivers
    trips = (tr.data ?? []) as Trip[]
    vehicles = (vr.data ?? []) as Vehicle[]
  } catch (err) {
    console.error('[drivers] fetch error:', err)
  }

  return (
    <div className="fade-in">
      <DriversClient initialDrivers={drivers} trips={trips} vehicles={vehicles} />
    </div>
  )
}
