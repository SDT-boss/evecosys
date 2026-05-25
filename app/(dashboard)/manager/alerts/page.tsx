import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertsClient } from '@/components/manager/AlertsClient'
import type { Alert, Vehicle } from '@/types'

export default async function AlertsPage() {
  const supabase = await createClient()

  const [{ data: alerts }, { data: vehicles }] = await Promise.all([
    supabase
      .from('alerts')
      .select('*, vehicle:vehicles(brand, model, plate_no)')
      .order('created_at', { ascending: false }),
    supabase.from('vehicles').select('*'),
  ])

  const aList = (alerts ?? []) as (Alert & { vehicle?: Vehicle })[]
  const vList = (vehicles ?? []) as Vehicle[]
  const activeCount = aList.filter(a => !a.resolved).length

  return (
    <div className="fade-in">
      <PageHeader
        title="Alerts & Notifications"
        subtitle={`${aList.length} total alerts · ${activeCount} active`}
      >
        {activeCount > 0 ? (
          <Badge variant="red" dot>{activeCount} active alerts</Badge>
        ) : (
          <Badge variant="green" dot>All clear</Badge>
        )}
      </PageHeader>

      <AlertsClient initialAlerts={aList} vehicles={vList} />
    </div>
  )
}
