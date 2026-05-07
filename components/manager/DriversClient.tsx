'use client'

import { useState } from 'react'
import { calcBehaviorScore } from '@/lib/behaviorScore'
import { Badge } from '@/components/ui/Badge'
import { Card, PageHeader } from '@/components/ui/Card'
import { AssignVehicleModal } from './AssignVehicleModal'
import type { Driver, Trip, Vehicle, AppUser } from '@/types'

type DriverWithRelations = Driver & { user?: AppUser; vehicle?: Vehicle }

function ScoreRing({ score, color }: { score: number; color: string; grade: string }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-condensed leading-none" style={{ color }}>{score}</span>
        <span className="text-[10px] font-bold" style={{ color }}>/ 100</span>
      </div>
    </div>
  )
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--text2)' }}>{label}</span>
        <span className="font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

export function DriversClient({
  initialDrivers,
  trips,
  vehicles,
}: {
  initialDrivers: DriverWithRelations[]
  trips: Trip[]
  vehicles: Vehicle[]
}) {
  const [drivers, setDrivers] = useState(initialDrivers)
  const [assigning, setAssigning] = useState<DriverWithRelations | null>(null)

  const allScores = drivers.map(d => calcBehaviorScore(trips.filter(t => t.driver_id === d.id)).overall)
  const fleetAvg = allScores.length
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0

  function handleAssigned(driverId: string, vehicleId: string | null) {
    setDrivers(prev =>
      prev.map(d => {
        if (d.id !== driverId) return d
        const vehicle = vehicleId ? vehicles.find(v => v.id === vehicleId) : undefined
        return { ...d, assigned_vehicle_id: vehicleId ?? undefined, vehicle }
      }),
    )
  }

  return (
    <>
      <PageHeader
        title="Driver Management"
        subtitle={`${drivers.length} registered drivers · Behavior scoring active`}
      >
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ background: 'var(--ev-green-light)', border: '1px solid #c0dfa0', color: '#3a7010' }}
        >
          Fleet avg score: <strong>{fleetAvg}/100</strong>
        </div>
      </PageHeader>

      {drivers.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-3">👤</div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No drivers registered yet</p>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              Go to <strong>Users</strong> to create driver accounts, then assign vehicles here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {drivers.map(d => {
            const driverTrips = trips.filter(t => t.driver_id === d.id)
            const score = calcBehaviorScore(driverTrips)
            const totalKm = driverTrips.reduce((s, t) => s + (t.distance_km ?? 0), 0)
            const totalTrips = driverTrips.length

            return (
              <Card key={d.id}>
                {/* Driver header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                      style={{ background: '#1a7080' }}
                    >
                      {d.user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <div className="font-bold" style={{ color: 'var(--text)' }}>{d.user?.full_name ?? 'Unknown'}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{d.user?.email}</div>
                      <div className="text-[11px] mt-1" style={{ color: 'var(--text3)' }}>
                        {d.license_no ? `License: ${d.license_no}` : 'No license on file'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant={score.overall >= 75 ? 'green' : score.overall >= 60 ? 'amber' : 'red'}>
                      Grade {score.grade}
                    </Badge>
                    {d.vehicle ? (
                      <Badge variant={d.vehicle.status === 'Moving' ? 'green' : 'amber'} dot>
                        {d.vehicle.plate_no}
                      </Badge>
                    ) : (
                      <Badge variant="gray">No vehicle</Badge>
                    )}
                  </div>
                </div>

                {/* Score + breakdown */}
                <div className="flex items-center gap-4 mb-4">
                  <ScoreRing score={score.overall} color={score.color} grade={score.grade} />
                  <div className="flex-1 space-y-2.5">
                    <ScoreBar label="Driving Efficiency" value={score.efficiency} color={score.color} />
                    <ScoreBar label="Smoothness" value={score.smoothness} color={score.color} />
                    <ScoreBar label="Consistency" value={score.consistency} color={score.color} />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  {[
                    { val: totalTrips.toString(), key: 'Trips' },
                    { val: `${totalKm.toFixed(0)} km`, key: 'Total Distance' },
                    { val: score.label, key: 'Rating' },
                  ].map(s => (
                    <div key={s.key} className="text-center">
                      <div className="text-sm font-bold font-condensed" style={{ color: 'var(--text)' }}>{s.val}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>{s.key}</div>
                    </div>
                  ))}
                </div>

                {/* Assign Vehicle button */}
                <div className="pt-3 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => setAssigning(d)}
                    className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text2)',
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLElement).style.borderColor = '#1a7080'
                      ;(e.currentTarget as HTMLElement).style.color = '#1a7080'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text2)'
                    }}
                  >
                    {d.assigned_vehicle_id ? '🔄 Reassign Vehicle' : '+ Assign Vehicle'}
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {assigning && (
        <AssignVehicleModal
          driver={assigning}
          vehicles={vehicles}
          onClose={() => setAssigning(null)}
          onAssigned={handleAssigned}
        />
      )}
    </>
  )
}
