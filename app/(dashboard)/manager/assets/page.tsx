import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AssetManagementClient } from '@/components/manager/AssetManagementClient'
import type { Vehicle, Trip, Alert } from '@/types'

export default async function AssetsPage() {
  const supabase = await createClient()

  const [{ data: vehicles }, { data: trips }, { data: alerts }] = await Promise.all([
    supabase.from('vehicles').select('*').order('brand').order('model'),
    supabase.from('trips').select('*').order('started_at', { ascending: false }),
    supabase.from('alerts').select('*').eq('resolved', false),
  ])

  const vList = (vehicles ?? []) as Vehicle[]
  const tList = (trips ?? []) as Trip[]
  const aList = (alerts ?? []) as Alert[]

  const online = vList.filter(v => v.status !== 'OFFLINE').length

  return (
    <div className="fade-in">
      <PageHeader
        title="Asset Management"
        subtitle={`${vList.length} vehicles · Click any card to view full details`}
      >
        <Badge variant="green" dot>{online} vehicles online</Badge>
      </PageHeader>

      <AssetManagementClient vehicles={vList} trips={tList} alerts={aList} />
    </div>
  )
}
