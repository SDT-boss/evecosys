import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DriverAlertsClient } from '@/components/driver/DriverAlertsClient'
import type { Alert } from '@/types'

type AlertWithResolvedName = Alert & { resolved_by_name?: string | null }

export default async function DriverAlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: driver } = await supabase
    .from('drivers')
    .select('assigned_vehicle_id')
    .eq('user_id', user.id)
    .single()

  if (!driver?.assigned_vehicle_id) {
    return (
      <div className="fade-in">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>My Alerts</h1>
        </div>
        <div className="rounded-xl p-12 text-center theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No vehicle assigned</p>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>Alerts will appear here once a vehicle is assigned to you.</p>
        </div>
      </div>
    )
  }

  const { data: rawAlerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('vehicle_id', driver.assigned_vehicle_id)
    .order('created_at', { ascending: false })

  const alertList = (rawAlerts ?? []) as Alert[]

  // Fetch resolved_by names in one query
  const resolvedByIds = [...new Set(alertList.map(a => a.resolved_by).filter(Boolean) as string[])]
  let nameMap: Record<string, string> = {}
  if (resolvedByIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', resolvedByIds)
    if (users) {
      nameMap = Object.fromEntries(users.map((u: { id: string; full_name: string }) => [u.id, u.full_name]))
    }
  }

  const alerts: AlertWithResolvedName[] = alertList.map(a => ({
    ...a,
    resolved_by_name: a.resolved_by ? (nameMap[a.resolved_by] ?? null) : null,
  }))

  const activeCount = alerts.filter(a => !a.resolved).length

  return (
    <div className="fade-in">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>My Alerts</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{alerts.length} total · {activeCount} active</p>
        </div>
        {activeCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: '#fdeaea', border: '1px solid #f0b0b0', color: '#8a1010' }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#c02020' }} />
            {activeCount} active alert{activeCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      <DriverAlertsClient alerts={alerts} userId={user.id} />
    </div>
  )
}
