import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DriverTripsClient } from '@/components/driver/DriverTripsClient'
import type { Trip } from '@/types'

export default async function DriverTripsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: driver } = await supabase
    .from('drivers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const trips: Trip[] = []

  if (driver) {
    const { data } = await supabase
      .from('trips')
      .select('id, origin, destination, distance_km, energy_kwh, duration_min, avg_speed, started_at, ended_at')
      .eq('driver_id', driver.id)
      .order('started_at', { ascending: false })
    if (data) trips.push(...(data as Trip[]))
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>My Trips</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{trips.length} trip{trips.length !== 1 ? 's' : ''} recorded</p>
      </div>
      <DriverTripsClient trips={trips} />
    </div>
  )
}
