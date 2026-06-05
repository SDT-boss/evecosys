import { createClient } from '@/lib/supabase/server'
import { calcBehaviorScore } from '@/lib/behaviorScore'
import type { Trip, ChargingStation } from '@/types'

function GaugeBox({ label, value, color, unit }: { label: string; value: number; color: string; unit: string }) {
  return (
    <div className="rounded-xl p-4 text-center flex-1" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.4px' }}>{label}</div>
      <div className="text-4xl font-bold font-condensed leading-none" style={{ color, letterSpacing: '-1px' }}>{value}</div>
      <div className="text-xs mt-1.5" style={{ color: 'var(--text3)' }}>{unit}</div>
      <div className="h-2 rounded-full mt-3 overflow-hidden" style={{ background: 'var(--border)' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 9999, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2.5 text-sm" style={{ borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text2)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div style={{ width: 3, height: 12, background: '#7cc242', borderRadius: 2 }} />
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#1a7080', letterSpacing: '0.6px' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

export default async function DriverOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: driver }, { data: stations }] = await Promise.all([
    supabase.from('drivers').select('*, vehicle:vehicles(*), user:users(full_name)').eq('user_id', user!.id).single(),
    supabase.from('charging_stations').select('*').eq('is_active', true).limit(3),
  ])

  const vehicle = driver?.vehicle
  const socColor = vehicle ? (vehicle.soc >= 50 ? '#5a9e2f' : vehicle.soc >= 20 ? '#c07800' : '#c02020') : '#888'
  const sohColor = vehicle ? (vehicle.soh >= 90 ? '#5a9e2f' : vehicle.soh >= 75 ? '#c07800' : '#c02020') : '#888'

  // Today's trips
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const { data: allTrips } = await supabase
    .from('trips').select('*')
    .eq('driver_id', driver?.id ?? '')
    .order('started_at', { ascending: false })
    .limit(20)

  const tList = (allTrips ?? []) as Trip[]
  const todayTrips = tList.filter(t => new Date(t.started_at) >= today)
  const recentTrips = tList.slice(0, 5)

  const todayKm = todayTrips.reduce((s, t) => s + (t.distance_km ?? 0), 0)
  const todayKwh = todayTrips.reduce((s, t) => s + (t.energy_kwh ?? 0), 0)

  const score = calcBehaviorScore(tList)

  return (
    <div className="fade-in">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>My Vehicle</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
            {driver?.user?.full_name ?? 'Driver'} · Your assigned vehicle status
          </p>
        </div>
        {vehicle && (
          <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: vehicle.soc < 20 ? '#fdeaea' : '#eaf5d8', border: `1px solid ${vehicle.soc < 20 ? '#f5c0c0' : '#c0dfa0'}`, color: vehicle.soc < 20 ? '#8a1010' : '#3a7010' }}>
            {vehicle.soc < 20 ? '⚠️ Low Battery' : '✅ Battery OK'} · {vehicle.soc}% SOC
          </div>
        )}
      </div>

      {!vehicle ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-5xl mb-4">🚗</div>
          <p className="font-semibold mb-2 text-lg" style={{ color: 'var(--text)' }}>No vehicle assigned yet</p>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>Your fleet manager will assign you a vehicle shortly.</p>
        </div>
      ) : (
        <>
          {/* Battery + Details row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <SectionCard title="Battery Status">
              <div className="flex gap-3 mb-4">
                <GaugeBox label="State of Charge" value={vehicle.soc} color={socColor} unit="SOC %" />
                <GaugeBox label="State of Health" value={vehicle.soh} color={sohColor} unit="SOH %" />
              </div>
              {vehicle.soc < 20 && (
                <div className="rounded-lg px-4 py-3 text-sm font-semibold flex items-center gap-2"
                  style={{ background: '#fdeaea', border: '1px solid #f5c0c0', color: '#8a1010' }}>
                  ⚠️ Battery critically low — please charge immediately
                </div>
              )}
            </SectionCard>

            <SectionCard title="Vehicle Details">
              <InfoRow label="Vehicle" value={`${vehicle.brand} ${vehicle.model}`} />
              <InfoRow label="Plate No" value={vehicle.plate_no} />
              <InfoRow label="Year" value={String(vehicle.year ?? '—')} />
              <InfoRow label="Status" value={vehicle.status} />
              <InfoRow label="Location" value={vehicle.location_name ?? '—'} />
              <InfoRow label="Odometer" value={`${vehicle.odometer.toLocaleString()} km`} />
            </SectionCard>
          </div>

          {/* Today's summary + Behavior score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl p-5 theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div style={{ width: 3, height: 12, background: '#7cc242', borderRadius: 2 }} />
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#1a7080', letterSpacing: '0.6px' }}>Today</span>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Trips', value: String(todayTrips.length), color: '#7cc242' },
                  { label: 'Distance', value: `${todayKm.toFixed(1)} km`, color: '#1a7080' },
                  { label: 'Energy Used', value: `${todayKwh.toFixed(1)} kWh`, color: '#5a9e2f' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--text2)' }}>{s.label}</span>
                    <span className="text-lg font-bold font-condensed" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-5 theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div style={{ width: 3, height: 12, background: '#7cc242', borderRadius: 2 }} />
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#1a7080', letterSpacing: '0.6px' }}>My Behavior Score</span>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold font-condensed mb-1" style={{ color: score.color }}>{score.overall}</div>
                <div className="text-sm font-semibold mb-1" style={{ color: score.color }}>{score.label}</div>
                <div className="text-xs mb-4" style={{ color: 'var(--text3)' }}>Grade {score.grade} · {tList.length} trips</div>
                <div className="space-y-2 text-left">
                  {[
                    { label: 'Efficiency', value: score.efficiency },
                    { label: 'Smoothness', value: score.smoothness },
                    { label: 'Consistency', value: score.consistency },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--text2)' }}>{s.label}</span>
                        <span className="font-bold" style={{ color: score.color }}>{s.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                        <div style={{ width: `${s.value}%`, height: '100%', background: score.color, borderRadius: 9999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Nearest Charger */}
            <div className="rounded-xl p-5 theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div style={{ width: 3, height: 12, background: '#7cc242', borderRadius: 2 }} />
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#1a7080', letterSpacing: '0.6px' }}>Nearest Chargers</span>
              </div>
              {(stations ?? []).length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">⚡</div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>No stations yet</p>
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>Your manager will add charging stations as they are installed.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(stations ?? []).map((s: ChargingStation, i: number) => (
                    <div key={s.id} className="rounded-lg p-3" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start gap-2">
                        <span className="text-base flex-shrink-0">{i === 0 ? '⚡' : '🔌'}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{s.name}</div>
                          <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text3)' }}>{s.address}</div>
                          <div className="text-[11px] mt-1 font-semibold" style={{ color: '#7cc242' }}>
                            {s.power_kw} kW · {s.connector_type}
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-auto">
                          <span className="text-[10px] font-bold rounded-full px-2 py-0.5"
                            style={{ background: s.is_active ? '#eaf5d8' : '#fdeaea', color: s.is_active ? '#3a7010' : '#8a1010' }}>
                            {s.is_active ? 'Active' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent trips */}
          <div className="rounded-xl overflow-hidden theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 3, height: 12, background: '#7cc242', borderRadius: 2 }} />
              <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#1a7080', letterSpacing: '0.6px' }}>Recent Trips</span>
            </div>
            {recentTrips.length === 0 ? (
              <div className="text-center py-10 text-sm" style={{ color: 'var(--text3)' }}>No trips recorded yet</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    {['Date', 'Route', 'Distance', 'Duration', 'Energy'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 uppercase tracking-wide font-bold" style={{ color: 'var(--text3)', fontSize: 10, letterSpacing: '0.4px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentTrips.map(t => (
                    <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{new Date(t.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                      <td className="px-4 py-3">
                        <span style={{ color: 'var(--text)' }}>{t.origin}</span>
                        <span className="mx-1" style={{ color: '#1a7080' }}>→</span>
                        <span style={{ color: 'var(--text)' }}>{t.destination}</span>
                      </td>
                      <td className="px-4 py-3 font-bold" style={{ color: '#5a9e2f' }}>{t.distance_km} km</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{t.duration_min}m</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{t.energy_kwh} kWh</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
