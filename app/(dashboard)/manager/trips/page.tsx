import { createClient } from '@/lib/supabase/server'
import type { Trip, Driver, Vehicle } from '@/types'

export default async function TripsPage() {
  const supabase = await createClient()

  const { data: trips } = await supabase
    .from('trips')
    .select('*, vehicle:vehicles(brand,model,plate_no), driver:drivers(user:users(full_name))')
    .order('started_at', { ascending: false })
    .limit(100)

  const tList = (trips ?? []) as Trip[]

  const totalKm = tList.reduce((s, t) => s + (t.distance_km ?? 0), 0)
  const totalKwh = tList.reduce((s, t) => s + (t.energy_kwh ?? 0), 0)

  return (
    <div className="fade-in">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Trip History</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{tList.length} trips recorded · All vehicles</p>
        </div>
        <div className="flex gap-3">
          {[
            { label: 'Total Distance', value: `${totalKm.toFixed(0)} km`, color: '#7cc242' },
            { label: 'Total Energy', value: `${totalKwh.toFixed(1)} kWh`, color: '#1a7080' },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-2 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-[10px] uppercase tracking-wide font-bold mb-0.5" style={{ color: 'var(--text3)' }}>{s.label}</div>
              <div className="text-base font-bold font-condensed" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {tList.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🗺</div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No trips yet</p>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>Trips will appear here once drivers log them.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Date', 'Vehicle', 'Driver', 'Route', 'Distance', 'Duration', 'Energy', 'Avg Speed'].map(h => (
                  <th key={h} className="text-left px-4 py-3 uppercase tracking-wide font-bold" style={{ color: 'var(--text3)', fontSize: 10, letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tList.map(t => (
                <tr key={t.id} className="transition-colors" style={{ borderTop: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>
                    {new Date(t.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: 'var(--text)' }}>{t.vehicle?.plate_no ?? '—'}</div>
                    <div style={{ color: 'var(--text3)' }}>{t.vehicle ? `${t.vehicle.brand} ${t.vehicle.model}` : ''}</div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{t.driver?.user?.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span style={{ color: 'var(--text)' }}>{t.origin}</span>
                    <span className="mx-1" style={{ color: '#1a7080' }}>→</span>
                    <span style={{ color: 'var(--text)' }}>{t.destination}</span>
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: '#5a9e2f' }}>{t.distance_km} km</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{t.duration_min}m</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{t.energy_kwh} kWh</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{t.avg_speed} km/h</td>
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
