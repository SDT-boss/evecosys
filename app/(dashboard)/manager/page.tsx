import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { calcBehaviorScore } from '@/lib/behaviorScore'
import { BatteryWarning, Wrench, CheckCircle2, MapPin, Gauge } from 'lucide-react'
import type { Vehicle, Alert, Trip, Driver } from '@/types'

function socColor(s: number) { return s >= 50 ? '#5a9e2f' : s >= 20 ? '#c07800' : '#c02020' }
function sohColor(s: number) { return s >= 90 ? '#5a9e2f' : s >= 75 ? '#c07800' : '#c02020' }

function KpiCard({ label, value, unit, note, noteColor, accent }: {
  label: string; value: string; unit?: string; note?: string; noteColor?: string; accent?: string
}) {
  return (
    <div className="rounded-xl p-4 theme-transition" style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: `3px solid ${accent ?? 'var(--border)'}`,
    }}>
      <div className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</div>
      <div className="text-2xl font-condensed" style={{ color: 'var(--text)', fontWeight: 700, letterSpacing: '-0.5px' }}>
        {value}{unit && <span className="text-sm ml-1" style={{ color: 'var(--text3)', fontWeight: 500 }}>{unit}</span>}
      </div>
      {note && <div className="text-[11px] mt-1.5" style={{ color: noteColor ?? 'var(--text3)', fontWeight: 500 }}>{note}</div>}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div style={{ width: 3, height: 12, background: '#7cc242', borderRadius: 2 }} />
        <span className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ev-teal)', fontWeight: 700, letterSpacing: '0.6px' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default async function ManagerOverviewPage() {
  const supabase = await createClient()

  const [
    { data: vehicles },
    { data: alerts },
    { data: drivers },
    { data: trips },
  ] = await Promise.all([
    supabase.from('vehicles').select('*').order('brand'),
    supabase.from('alerts').select('*, vehicle:vehicles(id,brand,model,plate_no)').eq('resolved', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('drivers').select('*, user:users(full_name)'),
    supabase.from('trips').select('*'),
  ])

  const vList = (vehicles ?? []) as Vehicle[]
  const aList = (alerts ?? []) as Alert[]
  const dList = (drivers ?? []) as Driver[]
  const tList = (trips ?? []) as Trip[]

  const totalKm = vList.reduce((s, v) => s + v.odometer, 0)
  const avgSoc = vList.length ? Math.round(vList.reduce((s, v) => s + v.soc, 0) / vList.length) : 0
  const online = vList.filter(v => v.status !== 'Maintenance').length
  const totalKwh = Math.round(totalKm * 0.18)
  const totalCo2 = Math.round(totalKwh * 0.654)

  const brandMap = vList.reduce((m, v) => {
    m[v.brand] = m[v.brand] ?? { count: 0, km: 0 }
    m[v.brand].count++; m[v.brand].km += v.odometer
    return m
  }, {} as Record<string, { count: number; km: number }>)
  const maxKm = Math.max(...Object.values(brandMap).map(b => b.km), 1)

  // Fleet behavior score
  const allScores = dList.map(d => {
    const dt = tList.filter(t => t.driver_id === d.id)
    return calcBehaviorScore(dt).overall
  })
  const fleetBehaviorScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0

  const alertMeta: Record<string, { icon: React.ReactNode; bg: string; fg: string }> = {
    low_battery:     { icon: <BatteryWarning size={15} />, bg: 'var(--pill-red-bg)',   fg: 'var(--pill-red-fg)' },
    maintenance:     { icon: <Wrench size={15} />,         bg: 'var(--pill-amber-bg)', fg: 'var(--pill-amber-fg)' },
    charge_complete: { icon: <CheckCircle2 size={15} />,   bg: 'var(--pill-green-bg)', fg: 'var(--pill-green-fg)' },
    geofence:        { icon: <MapPin size={15} />,         bg: 'var(--pill-red-bg)',   fg: 'var(--pill-red-fg)' },
    speeding:        { icon: <Gauge size={15} />,          bg: 'var(--pill-red-bg)',   fg: 'var(--pill-red-fg)' },
  }

  return (
    <div className="fade-in">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl tracking-tight" style={{ color: 'var(--text)', fontWeight: 700 }}>Fleet Overview</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
            {vList.length} vehicles · Real-time telemetry · Jakarta, Indonesia
          </p>
        </div>
        <Badge variant="green" dot>{online} vehicles online</Badge>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Total Vehicles" value={String(vList.length)} unit="units" note={`${[...new Set(vList.map(v => v.brand))].length} brands · 100% EV`} noteColor="#5a9e2f" accent="#7cc242" />
        <KpiCard label="Total Distance" value={totalKm.toLocaleString()} unit="km" note="Fleet cumulative" noteColor="#1a7080" accent="#1a7080" />
        <KpiCard label="Energy Used" value={totalKwh.toLocaleString()} unit="kWh" accent="#7cc242" />
        <KpiCard label="Carbon Footprint" value={(totalCo2 / 1000).toFixed(1)} unit="tCO₂e" note="↓ vs ICE fleet" noteColor="#5a9e2f" accent="#1a7080" />
        <KpiCard label="Fleet Avg SOC" value={String(avgSoc)} unit="%" note="Avg state of charge" noteColor="#1a7080" accent="#7cc242" />
        <KpiCard label="Behavior Score" value={String(fleetBehaviorScore)} unit="/ 100" note={`${dList.length} drivers scored`} noteColor={fleetBehaviorScore >= 75 ? '#5a9e2f' : '#c07800'} accent="#1a7080" />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <SectionCard title="Fleet by Brand">
          {Object.entries(brandMap).length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text3)' }}>No vehicles yet</p>
          ) : Object.entries(brandMap).map(([brand, data]) => (
            <div key={brand} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ fontWeight: 600 }}>{brand}</span>
                <span style={{ color: 'var(--text3)' }}>{data.count} vehicles · {data.km.toLocaleString()} km</span>
              </div>
              <div className="h-[7px] rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                <div className="h-full rounded-full" style={{ width: `${(data.km / maxKm) * 100}%`, background: '#7cc242', transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
        </SectionCard>

        <SectionCard title="Active Alerts">
          {aList.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text3)' }}>No active alerts 🎉</p>
          ) : aList.map((a, i) => {
            const meta = alertMeta[a.type] ?? alertMeta.low_battery
            return (
            <div key={a.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < aList.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bg, color: meta.fg }}>
                {meta.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate" style={{ fontWeight: 600 }}>{a.message}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>
                  {a.vehicle ? `${a.vehicle.brand} ${a.vehicle.model} · ${a.vehicle.plate_no}` : a.vehicle_id}
                </div>
              </div>
              <div className="text-[11px] flex-shrink-0" style={{ color: '#bbb' }}>{timeAgo(a.created_at)}</div>
            </div>
          )})}
        </SectionCard>
      </div>

      {/* Vehicle status table */}
      <div className="rounded-xl overflow-hidden theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 3, height: 12, background: '#7cc242', borderRadius: 2 }} />
          <span className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ev-teal)', fontWeight: 700, letterSpacing: '0.6px' }}>Vehicle Status</span>
        </div>
        {vList.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--text3)' }}>
            No vehicles added yet. Go to <strong>Asset Management</strong> to add vehicles.
          </div>
        ) : (
          <div className="table-scroll">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Vehicle', 'SOC', 'SOH', 'Status', 'Location', 'Odometer'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 uppercase tracking-wide" style={{ color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.4px', fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vList.map(v => (
                <tr key={v.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <div style={{ fontWeight: 700 }}>{v.brand} {v.model}</div>
                    <div style={{ color: 'var(--text3)' }}>{v.plate_no}</div>
                  </td>
                  <td className="px-4 py-3"><span style={{ color: socColor(v.soc), fontWeight: 700 }}>{v.soc}%</span></td>
                  <td className="px-4 py-3"><span style={{ color: sohColor(v.soh), fontWeight: 700 }}>{v.soh}%</span></td>
                  <td className="px-4 py-3">
                    {(() => {
                      const pillMap: Record<string, { bg: string; fg: string; bd: string }> = {
                        Moving:      { bg: 'var(--pill-green-bg)', fg: 'var(--pill-green-fg)', bd: 'var(--pill-green-bd)' },
                        Charging:    { bg: 'var(--pill-teal-bg)',  fg: 'var(--pill-teal-fg)',  bd: 'var(--pill-teal-bd)' },
                        Parked:      { bg: 'var(--pill-amber-bg)', fg: 'var(--pill-amber-fg)', bd: 'var(--pill-amber-bd)' },
                        Maintenance: { bg: 'var(--pill-red-bg)',   fg: 'var(--pill-red-fg)',   bd: 'var(--pill-red-bd)' },
                      }
                      const p = pillMap[v.status] ?? { bg: 'var(--pill-grey-bg)', fg: 'var(--pill-grey-fg)', bd: 'var(--pill-grey-bd)' }
                      return (
                        <span className="rounded-full px-2 py-0.5 text-[11px] inline-flex items-center gap-1" style={{
                          fontWeight: 600, background: p.bg, color: p.fg, border: `1px solid ${p.bd}`,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.fg, display: 'inline-block', flexShrink: 0 }} />
                          {v.status}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{v.location_name}</td>
                  <td className="px-4 py-3" style={{ fontWeight: 600 }}>{v.odometer.toLocaleString()} km</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
