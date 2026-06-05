'use client'

import { useState } from 'react'
import type { Vehicle, Alert, Driver } from '@/types'

// ── Shared sub-components ────────────────────────────────────────────────────

function KpiCard({ label, value, unit, sub, subColor, accent }: {
  label: string; value: string; unit?: string; sub?: string; subColor?: string; accent: string
}) {
  return (
    <div className="rounded-xl p-5 theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${accent}` }}>
      <div className="text-[10px] font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text3)', letterSpacing: '0.5px' }}>{label}</div>
      <div className="text-3xl font-bold font-condensed leading-none" style={{ color: 'var(--text)', letterSpacing: '-0.5px' }}>
        {value}{unit && <span className="text-base ml-1.5 font-normal" style={{ color: 'var(--text3)' }}>{unit}</span>}
      </div>
      {sub && <div className="text-xs mt-2 font-medium" style={{ color: subColor ?? 'var(--text3)' }}>{sub}</div>}
    </div>
  )
}

function HealthRing({ score, color, label, grade }: { score: number; color: string; label: string; grade: string }) {
  const r = 54; const circ = 2 * Math.PI * r; const offset = circ - (score / 100) * circ
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg width="144" height="144" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
          <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 72 72)"
            style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-condensed leading-none" style={{ color }}>{score}</span>
          <span className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>/ 100</span>
        </div>
      </div>
      <div className="text-sm font-bold mt-2" style={{ color }}>{label}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Grade {grade}</div>
    </div>
  )
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span style={{ color: 'var(--text2)' }}>{label}</span>
        <span className="font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color, transition: 'width 0.7s ease' }} />
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-5">
        <div style={{ width: 3, height: 12, background: '#7cc242', borderRadius: 2 }} />
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#1a7080', letterSpacing: '0.6px' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4 text-center theme-transition" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.4px' }}>{label}</div>
      <div className="text-2xl font-bold font-condensed" style={{ color: color ?? 'var(--text)' }}>
        {value}{unit && <span className="text-sm ml-1" style={{ color: 'var(--text3)' }}>{unit}</span>}
      </div>
    </div>
  )
}

// ── Types ────────────────────────────────────────────────────────────────────

interface TripRow {
  id: string
  origin: string
  destination: string
  distance_km: number
  energy_kwh: number
  duration_min: number
  avg_speed: number
  started_at: string
  driver?: { user?: { full_name?: string } | null } | null
  vehicle?: { plate_no?: string } | null
}

export interface BoardData {
  // Overview
  vList: Vehicle[]
  aList: Alert[]
  tList: TripRow[]
  dList: Driver[]
  health: { score: number; color: string; label: string; grade: string; breakdown: { batteryHealth: number; availability: number; alertLoad: number } }
  totalKm: number
  avgSoc: number
  totalKwh: number
  savedKg: number
  iceCo2Kg: number
  savingsPct: number
  online: number
  avgBehavior: number
  behaviorColor: string
  brandMap: Record<string, { count: number; km: number }>
  maxKm: number
  behaviorScoresMap: { id: string; name: string; overall: number; color: string; grade: string }[]
  // Fleet
  statusCounts: { Moving: number; Parked: number; Charging: number; Maintenance: number }
  socGroups: { lt20: number; s2050: number; s5080: number; gt80: number }
  sohGroups: { lt20: number; s2050: number; s5080: number; gt80: number }
  avgSoh: number
  // Carbon
  totalEnergyKwh: number
  co2SavedKg: number
  totalDistanceKm: number
  avgEfficiency: number
  thisMonthKwh: number
  lastMonthKwh: number
  thisMonthKm: number
  lastMonthKm: number
  // Trips
  totalTripsCount: number
  avgDuration: number
  topRoutes: { route: string; count: number }[]
  recentTrips: TripRow[]
}

// ── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ d }: { d: BoardData }) {
  const totalCo2Kg = Math.round(d.totalKwh * 0.654)
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total Fleet" value={String(d.vList.length)} unit="vehicles" sub={`${d.online} online · ${d.vList.length - d.online} maintenance`} accent="#7cc242" subColor="#5a9e2f" />
        <KpiCard label="Total Distance" value={d.totalKm.toLocaleString()} unit="km" sub={`${d.tList.length} trips recorded`} accent="#1a7080" subColor="#1a7080" />
        <KpiCard label="Fleet Avg SOC" value={String(d.avgSoc)} unit="%" sub={d.avgSoc >= 50 ? 'Healthy charge level' : 'Charge attention needed'} accent="#7cc242" subColor={d.avgSoc >= 50 ? '#5a9e2f' : '#c07800'} />
        <KpiCard label="Active Alerts" value={String(d.aList.length)} sub={d.aList.length === 0 ? 'All systems nominal' : 'Require attention'} accent={d.aList.length === 0 ? '#7cc242' : '#d04000'} subColor={d.aList.length === 0 ? '#5a9e2f' : '#d04000'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <SectionCard title="Fleet Health Score">
          <div className="flex flex-col items-center py-2">
            <HealthRing score={d.health.score} color={d.health.color} label={d.health.label} grade={d.health.grade} />
            <div className="w-full mt-5 space-y-3">
              <MetricBar label="Battery Health (SOH)" value={d.health.breakdown.batteryHealth} color={d.health.color} />
              <MetricBar label="Fleet Availability" value={d.health.breakdown.availability} color={d.health.color} />
              <MetricBar label="Alert Load Score" value={d.health.breakdown.alertLoad} color={d.health.color} />
            </div>
          </div>
        </SectionCard>
        <div className="lg:col-span-2">
          <SectionCard title="Carbon Footprint & Savings">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Total CO₂ Emitted', value: (totalCo2Kg / 1000).toFixed(2), unit: 'tCO₂e', color: '#1a7080' },
                { label: 'CO₂ Saved vs ICE', value: (d.savedKg / 1000).toFixed(2), unit: 'tCO₂e', color: '#5a9e2f' },
                { label: 'Saving Rate', value: `${d.savingsPct}`, unit: '%', color: '#7cc242' },
                { label: 'Energy Consumed', value: d.totalKwh.toLocaleString(), unit: 'kWh', color: '#1a7080' },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-4 text-center" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.4px' }}>{m.label}</div>
                  <div className="text-2xl font-bold font-condensed" style={{ color: m.color }}>
                    {m.value}<span className="text-sm ml-1" style={{ color: 'var(--text3)' }}>{m.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-4" style={{ background: '#f0f9e8', border: '1px solid #c0dfa0' }}>
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold" style={{ color: '#3a7010' }}>CO₂ reduction vs equivalent ICE fleet</span>
                <span className="font-bold" style={{ color: '#5a9e2f' }}>{d.savingsPct}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: '#d0eac0' }}>
                <div className="h-full rounded-full" style={{ width: `${d.savingsPct}%`, background: '#7cc242' }} />
              </div>
              <div className="text-[11px] mt-2" style={{ color: '#5a8030' }}>Grid factor: 0.654 kg CO₂/kWh (PLN Indonesia) · ICE baseline: 210g CO₂/km</div>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionCard title="Driver Behavior Score">
          {d.behaviorScoresMap.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text3)' }}>No drivers scored yet</p>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-5 p-4 rounded-xl" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div className="text-5xl font-bold font-condensed" style={{ color: d.behaviorColor }}>{d.avgBehavior}</div>
                <div>
                  <div className="text-sm font-bold" style={{ color: d.behaviorColor }}>{d.avgBehavior >= 75 ? 'Good' : d.avgBehavior >= 60 ? 'Average' : 'Needs Improvement'}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Fleet average · {d.behaviorScoresMap.length} drivers</div>
                </div>
              </div>
              <div className="space-y-3">
                {d.behaviorScoresMap.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#1a7080' }}>
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold truncate" style={{ color: 'var(--text)' }}>{s.name}</span>
                        <span className="font-bold ml-2 flex-shrink-0" style={{ color: s.color }}>{s.overall}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                        <div className="h-full rounded-full" style={{ width: `${s.overall}%`, background: s.color }} />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold flex-shrink-0" style={{ color: s.color }}>Grade {s.grade}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="Fleet by Brand">
          {Object.entries(d.brandMap).map(([brand, data]) => (
            <div key={brand} className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-bold" style={{ color: 'var(--text)' }}>{brand}</span>
                <span style={{ color: 'var(--text3)' }}>{data.count} vehicles · {data.km.toLocaleString()} km</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                <div className="h-full rounded-full" style={{ width: `${(data.km / d.maxKm) * 100}%`, background: '#7cc242' }} />
              </div>
            </div>
          ))}
          <div className="mt-4 pt-4 grid grid-cols-2 gap-2" style={{ borderTop: '1px solid var(--border)' }}>
            {d.vList.map((v: Vehicle) => (
              <div key={v.id} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: v.status === 'Moving' ? '#7cc242' : v.status === 'Maintenance' ? '#c02020' : '#c07800' }} />
                <span className="truncate" style={{ color: 'var(--text2)' }}>{v.plate_no}</span>
                <span className="ml-auto font-semibold flex-shrink-0" style={{ color: 'var(--text3)' }}>{v.soc}%</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="rounded-xl overflow-hidden theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 3, height: 12, background: '#7cc242', borderRadius: 2 }} />
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#1a7080', letterSpacing: '0.6px' }}>Recent Trips</span>
        </div>
        {d.tList.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text3)' }}>No trips recorded yet</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Date', 'Route', 'Distance', 'Duration', 'Energy', 'Avg Speed'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 uppercase tracking-wide font-bold" style={{ color: 'var(--text3)', fontSize: 10, letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.tList.slice(0, 6).map(t => (
                <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{new Date(t.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                  <td className="px-4 py-3"><span style={{ color: 'var(--text)' }}>{t.origin}</span><span className="mx-1" style={{ color: '#1a7080' }}>→</span><span style={{ color: 'var(--text)' }}>{t.destination}</span></td>
                  <td className="px-4 py-3 font-bold" style={{ color: '#5a9e2f' }}>{t.distance_km} km</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{t.duration_min}m</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{t.energy_kwh} kWh</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{t.avg_speed} km/h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// ── Tab: Fleet ───────────────────────────────────────────────────────────────

function FleetTab({ d }: { d: BoardData }) {
  const vLen = d.vList.length || 1
  const statusColors: Record<string, string> = {
    Moving: '#7cc242', Parked: '#1a7080', Charging: '#c07800', Maintenance: '#c02020',
  }
  const socGroupData = [
    { label: '< 20% (Critical)', value: d.socGroups.lt20, color: '#c02020' },
    { label: '20–50% (Low)', value: d.socGroups.s2050, color: '#c07800' },
    { label: '50–80% (Normal)', value: d.socGroups.s5080, color: '#7cc242' },
    { label: '> 80% (High)', value: d.socGroups.gt80, color: '#5a9e2f' },
  ]
  const sohGroupData = [
    { label: '< 20%', value: d.sohGroups.lt20, color: '#c02020' },
    { label: '20–50%', value: d.sohGroups.s2050, color: '#c07800' },
    { label: '50–80%', value: d.sohGroups.s5080, color: '#7cc242' },
    { label: '> 80%', value: d.sohGroups.gt80, color: '#5a9e2f' },
  ]

  return (
    <>
      {/* Status breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {(['Moving', 'Parked', 'Charging', 'Maintenance'] as const).map(s => (
          <KpiCard
            key={s}
            label={s}
            value={String(d.statusCounts[s])}
            unit="vehicles"
            sub={`${Math.round((d.statusCounts[s] / vLen) * 100)}% of fleet`}
            accent={statusColors[s]}
            subColor={statusColors[s]}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* SOC distribution */}
        <SectionCard title="State of Charge (SOC) Distribution">
          <div className="flex items-end gap-3 mb-5">
            <div className="text-4xl font-bold font-condensed" style={{ color: d.avgSoc >= 50 ? '#5a9e2f' : d.avgSoc >= 20 ? '#c07800' : '#c02020' }}>{d.avgSoc}%</div>
            <div className="text-xs mb-1" style={{ color: 'var(--text3)' }}>fleet average SOC</div>
          </div>
          <div className="space-y-3">
            {socGroupData.map(g => (
              <div key={g.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: 'var(--text2)' }}>{g.label}</span>
                  <span className="font-bold" style={{ color: g.color }}>{g.value} vehicle{g.value !== 1 ? 's' : ''}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(g.value / vLen) * 100}%`, background: g.color, transition: 'width 0.7s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* SOH distribution */}
        <SectionCard title="State of Health (SOH) Distribution">
          <div className="flex items-end gap-3 mb-5">
            <div className="text-4xl font-bold font-condensed" style={{ color: d.avgSoh >= 80 ? '#5a9e2f' : d.avgSoh >= 60 ? '#c07800' : '#c02020' }}>{d.avgSoh}%</div>
            <div className="text-xs mb-1" style={{ color: 'var(--text3)' }}>fleet average SOH</div>
          </div>
          <div className="space-y-3">
            {sohGroupData.map(g => (
              <div key={g.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: 'var(--text2)' }}>{g.label}</span>
                  <span className="font-bold" style={{ color: g.color }}>{g.value} vehicle{g.value !== 1 ? 's' : ''}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(g.value / vLen) * 100}%`, background: g.color, transition: 'width 0.7s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  )
}

// ── Tab: Carbon ──────────────────────────────────────────────────────────────

function CarbonTab({ d }: { d: BoardData }) {
  const metrics = [
    { label: 'Total Energy Consumed', value: d.totalEnergyKwh.toLocaleString(), unit: 'kWh', color: '#1a7080', icon: '⚡' },
    { label: 'CO₂ Saved vs Petrol', value: (d.co2SavedKg / 1000).toFixed(2), unit: 'tCO₂e', color: '#5a9e2f', icon: '🌿' },
    { label: 'Total Distance Driven', value: d.totalDistanceKm.toLocaleString(), unit: 'km', color: '#7cc242', icon: '🛣️' },
    { label: 'Avg Energy Efficiency', value: d.avgEfficiency.toFixed(3), unit: 'kWh/km', color: '#1a7080', icon: '📊' },
  ]

  const hasMonthData = d.thisMonthKwh > 0 || d.lastMonthKwh > 0
  const maxKwh = Math.max(d.thisMonthKwh, d.lastMonthKwh, 1)

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl p-5 theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${m.color}` }}>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text3)', letterSpacing: '0.5px' }}>{m.label}</div>
            <div className="text-3xl font-bold font-condensed leading-none" style={{ color: m.color, letterSpacing: '-0.5px' }}>
              {m.value}<span className="text-base ml-1.5 font-normal" style={{ color: 'var(--text3)' }}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Saving factor card */}
        <SectionCard title="CO₂ Savings Breakdown">
          <div className="rounded-xl p-4 mb-4" style={{ background: '#f0f9e8', border: '1px solid #c0dfa0' }}>
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold" style={{ color: '#3a7010' }}>CO₂ reduction vs equivalent petrol fleet</span>
              <span className="font-bold" style={{ color: '#5a9e2f' }}>{d.savingsPct}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: '#d0eac0' }}>
              <div className="h-full rounded-full" style={{ width: `${d.savingsPct}%`, background: '#7cc242' }} />
            </div>
            <div className="text-[11px] mt-2" style={{ color: '#5a8030' }}>
              Saving factor: 1 kWh EV ≈ saves 0.15 kg CO₂ vs petrol equivalent
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="CO₂ Emitted" value={(Math.round(d.totalEnergyKwh * 0.654) / 1000).toFixed(2)} unit="tCO₂e" color="#1a7080" />
            <StatCard label="CO₂ Saved" value={(d.co2SavedKg / 1000).toFixed(2)} unit="tCO₂e" color="#5a9e2f" />
          </div>
        </SectionCard>

        {/* Month comparison */}
        {hasMonthData ? (
          <SectionCard title="This Month vs Last Month">
            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text2)' }}>Energy Consumed (kWh)</div>
                {[
                  { label: 'This month', value: d.thisMonthKwh, color: '#7cc242' },
                  { label: 'Last month', value: d.lastMonthKwh, color: '#1a7080' },
                ].map(r => (
                  <div key={r.label} className="mb-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span style={{ color: 'var(--text2)' }}>{r.label}</span>
                      <span className="font-bold" style={{ color: r.color }}>{r.value.toLocaleString()} kWh</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(r.value / maxKwh) * 100}%`, background: r.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="This Month km" value={d.thisMonthKm.toLocaleString()} unit="km" color="#7cc242" />
                <StatCard label="Last Month km" value={d.lastMonthKm.toLocaleString()} unit="km" color="#1a7080" />
              </div>
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="This Month vs Last Month">
            <div className="text-center py-10 text-sm" style={{ color: 'var(--text3)' }}>Not enough trip data for comparison</div>
          </SectionCard>
        )}
      </div>
    </>
  )
}

// ── Tab: Trips ───────────────────────────────────────────────────────────────

function TripsTab({ d }: { d: BoardData }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <KpiCard label="Total Trips" value={String(d.totalTripsCount)} sub="all time" accent="#7cc242" subColor="#5a9e2f" />
        <KpiCard label="Total Distance" value={d.totalDistanceKm.toLocaleString()} unit="km" sub="across all trips" accent="#1a7080" subColor="#1a7080" />
        <KpiCard label="Avg Trip Duration" value={String(d.avgDuration)} unit="min" sub="per trip" accent="#7cc242" subColor="#7cc242" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Top routes */}
        <SectionCard title="Top 5 Most Frequent Routes">
          {d.topRoutes.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text3)' }}>No routes recorded yet</p>
          ) : (
            <div className="space-y-3">
              {d.topRoutes.map((r, i) => (
                <div key={r.route} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: i === 0 ? '#7cc242' : '#1a7080' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{r.route}</div>
                  </div>
                  <div className="text-xs font-bold flex-shrink-0" style={{ color: '#1a7080' }}>{r.count}×</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Stats summary */}
        <SectionCard title="Trip Statistics">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Trips" value={String(d.totalTripsCount)} color="#7cc242" />
            <StatCard label="Total Distance" value={d.totalDistanceKm.toLocaleString()} unit="km" color="#5a9e2f" />
            <StatCard label="Avg Duration" value={String(d.avgDuration)} unit="min" color="#1a7080" />
            <StatCard label="Avg Efficiency" value={d.avgEfficiency.toFixed(3)} unit="kWh/km" color="#1a7080" />
          </div>
        </SectionCard>
      </div>

      {/* Recent 10 trips */}
      <div className="rounded-xl overflow-hidden theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 3, height: 12, background: '#7cc242', borderRadius: 2 }} />
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#1a7080', letterSpacing: '0.6px' }}>Recent 10 Trips</span>
        </div>
        {d.recentTrips.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text3)' }}>No trips recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Date', 'Driver', 'Vehicle', 'Route', 'Distance'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 uppercase tracking-wide font-bold whitespace-nowrap" style={{ color: 'var(--text3)', fontSize: 10, letterSpacing: '0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.recentTrips.map((t, idx) => (
                  <tr key={t.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : undefined }}>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text2)' }}>
                      {new Date(t.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>
                      {t.driver?.user?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text2)' }}>
                      {t.vehicle?.plate_no ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: 'var(--text)' }}>{t.origin}</span>
                      <span className="mx-1" style={{ color: '#1a7080' }}>→</span>
                      <span style={{ color: 'var(--text)' }}>{t.destination}</span>
                    </td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: '#5a9e2f' }}>
                      {t.distance_km} km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'fleet',    label: 'Fleet' },
  { key: 'carbon',   label: 'Carbon' },
  { key: 'trips',    label: 'Trips' },
] as const

type TabKey = typeof TABS[number]['key']

export function BoardTabsClient({ boardData }: { boardData: BoardData }) {
  const [tab, setTab] = useState<TabKey>('overview')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-semibold font-barlow transition-all relative"
            style={{
              color: tab === t.key ? '#1a7080' : 'var(--text3)',
              borderBottom: tab === t.key ? '2px solid #1a7080' : '2px solid transparent',
              marginBottom: -1,
              background: 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab d={boardData} />}
      {tab === 'fleet'    && <FleetTab    d={boardData} />}
      {tab === 'carbon'   && <CarbonTab   d={boardData} />}
      {tab === 'trips'    && <TripsTab    d={boardData} />}
    </div>
  )
}
