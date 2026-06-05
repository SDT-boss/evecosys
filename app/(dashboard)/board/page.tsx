import { createClient } from '@/lib/supabase/server'
import { calcFleetHealth } from '@/lib/fleetHealth'
import { calcBehaviorScore } from '@/lib/behaviorScore'
import { BoardTabsClient } from '@/components/board/BoardTabsClient'
import type { BoardData } from '@/components/board/BoardTabsClient'
import type { Vehicle, Alert, Trip, Driver } from '@/types'

export default async function BoardOverviewPage() {
  const supabase = await createClient()
  const [{ data: vehicles }, { data: alerts }, { data: trips }, { data: drivers }] = await Promise.all([
    supabase.from('vehicles').select('*').order('brand'),
    supabase.from('alerts').select('*').eq('resolved', false),
    supabase
      .from('trips')
      .select('*, driver:drivers(user:users(full_name)), vehicle:vehicles(plate_no)')
      .order('started_at', { ascending: false }),
    supabase.from('drivers').select('*, user:users(full_name)'),
  ])

  const vList = (vehicles ?? []) as Vehicle[]
  const aList = (alerts ?? []) as Alert[]
  const tList = (trips ?? []) as Trip[]
  const dList = (drivers ?? []) as Driver[]

  // ── Overview computations ──────────────────────────────────────────────────
  const totalKm = vList.reduce((s, v) => s + v.odometer, 0)
  const avgSoc = vList.length ? Math.round(vList.reduce((s, v) => s + v.soc, 0) / vList.length) : 0
  const totalKwh = Math.round(totalKm * 0.18)
  const totalCo2Kg = Math.round(totalKwh * 0.654)
  const iceCo2Kg = Math.round(totalKm * 0.21 * 1000)
  const savedKg = iceCo2Kg - totalCo2Kg
  const savingsPct = iceCo2Kg > 0 ? Math.round((savedKg / iceCo2Kg) * 100) : 0
  const online = vList.filter(v => v.status !== 'Maintenance').length
  const health = calcFleetHealth(vList, aList)

  const behaviorScoresMap = dList.map(d => {
    const s = calcBehaviorScore(tList.filter(t => t.driver_id === d.id))
    return { id: d.id, name: d.user?.full_name ?? 'Unknown', overall: s.overall, color: s.color, grade: s.grade }
  })
  const behaviorScores = behaviorScoresMap.map(s => s.overall)
  const avgBehavior = behaviorScores.length ? Math.round(behaviorScores.reduce((a, b) => a + b, 0) / behaviorScores.length) : 0
  const behaviorColor = avgBehavior >= 75 ? '#5a9e2f' : avgBehavior >= 60 ? '#c07800' : '#c02020'

  const brandMap = vList.reduce((m, v) => {
    m[v.brand] = m[v.brand] ?? { count: 0, km: 0 }
    m[v.brand].count++
    m[v.brand].km += v.odometer
    return m
  }, {} as Record<string, { count: number; km: number }>)
  const maxKm = Math.max(...Object.values(brandMap).map(b => b.km), 1)

  // ── Fleet tab computations ─────────────────────────────────────────────────
  const statusCounts = { Moving: 0, Parked: 0, Charging: 0, Maintenance: 0 }
  const socGroups = { lt20: 0, s2050: 0, s5080: 0, gt80: 0 }
  const sohGroups = { lt20: 0, s2050: 0, s5080: 0, gt80: 0 }
  for (const v of vList) {
    statusCounts[v.status as keyof typeof statusCounts] = (statusCounts[v.status as keyof typeof statusCounts] ?? 0) + 1
    if (v.soc < 20) socGroups.lt20++
    else if (v.soc < 50) socGroups.s2050++
    else if (v.soc < 80) socGroups.s5080++
    else socGroups.gt80++
    if (v.soh < 20) sohGroups.lt20++
    else if (v.soh < 50) sohGroups.s2050++
    else if (v.soh < 80) sohGroups.s5080++
    else sohGroups.gt80++
  }
  const avgSoh = vList.length ? Math.round(vList.reduce((s, v) => s + v.soh, 0) / vList.length) : 0

  // ── Carbon tab computations ────────────────────────────────────────────────
  const totalEnergyKwh = Math.round(tList.reduce((s, t) => s + (t.energy_kwh ?? 0), 0))
  const totalDistanceKm = Math.round(tList.reduce((s, t) => s + (t.distance_km ?? 0), 0))
  const co2SavedKg = Math.round(totalEnergyKwh * 0.15)
  const avgEfficiency = totalDistanceKm > 0 ? totalEnergyKwh / totalDistanceKm : 0

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const thisMonthKwh = Math.round(tList.filter(t => t.started_at >= thisMonthStart).reduce((s, t) => s + (t.energy_kwh ?? 0), 0))
  const lastMonthKwh = Math.round(tList.filter(t => t.started_at >= lastMonthStart && t.started_at <= lastMonthEnd).reduce((s, t) => s + (t.energy_kwh ?? 0), 0))
  const thisMonthKm = Math.round(tList.filter(t => t.started_at >= thisMonthStart).reduce((s, t) => s + (t.distance_km ?? 0), 0))
  const lastMonthKm = Math.round(tList.filter(t => t.started_at >= lastMonthStart && t.started_at <= lastMonthEnd).reduce((s, t) => s + (t.distance_km ?? 0), 0))

  // ── Trips tab computations ─────────────────────────────────────────────────
  const totalTripsCount = tList.length
  const avgDuration = totalTripsCount > 0 ? Math.round(tList.reduce((s, t) => s + (t.duration_min ?? 0), 0) / totalTripsCount) : 0

  const routeFreq: Record<string, number> = {}
  for (const t of tList) {
    const key = `${t.origin} → ${t.destination}`
    routeFreq[key] = (routeFreq[key] ?? 0) + 1
  }
  const topRoutes = Object.entries(routeFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([route, count]) => ({ route, count }))

  const recentTrips = tList.slice(0, 10)

  const boardData: BoardData = {
    vList,
    aList,
    tList,
    dList,
    health,
    totalKm,
    avgSoc,
    totalKwh,
    savedKg,
    iceCo2Kg,
    savingsPct,
    online,
    avgBehavior,
    behaviorColor,
    brandMap,
    maxKm,
    behaviorScoresMap,
    statusCounts,
    socGroups,
    sohGroups,
    avgSoh,
    totalEnergyKwh,
    co2SavedKg,
    totalDistanceKm,
    avgEfficiency,
    thisMonthKwh,
    lastMonthKwh,
    thisMonthKm,
    lastMonthKm,
    totalTripsCount,
    avgDuration,
    topRoutes,
    recentTrips,
  }

  return (
    <div className="fade-in">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Executive Overview</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Board-level fleet performance · {vList.length} vehicles · Jakarta, Indonesia</p>
        </div>
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ background: '#eaf5d8', border: '1px solid #c0dfa0', color: '#3a7010' }}>
          {online} / {vList.length} vehicles operational
        </div>
      </div>
      <BoardTabsClient boardData={boardData} />
    </div>
  )
}
