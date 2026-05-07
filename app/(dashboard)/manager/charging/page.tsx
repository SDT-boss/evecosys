import { createClient } from '@/lib/supabase/server'
import { ChargingClient } from '@/components/manager/ChargingClient'
import { PageHeader } from '@/components/ui/Card'
import type { ChargingStation } from '@/types'

export default async function ChargingPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('charging_stations').select('*').order('name')
  const stations = (data ?? []) as ChargingStation[]

  return (
    <div className="fade-in">
      <PageHeader
        title="Charging Stations"
        subtitle="Manage EV charging infrastructure across your fleet"
      />
      <ChargingClient initialStations={stations} />
    </div>
  )
}
