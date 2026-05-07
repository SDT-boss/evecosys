'use client'

import { useState } from 'react'
import { X, MapPin, Zap, Route, BarChart2 } from 'lucide-react'
import type { Vehicle, Trip, Alert } from '@/types'
import { GaugeBox } from '@/components/ui/SocBar'
import { Badge } from '@/components/ui/Badge'
import { SectionTitle } from '@/components/ui/Card'

type Tab = 'overview' | 'location' | 'carbon' | 'trips'

const BRAND_COLORS: Record<string, string> = {
  BYD: '#7cc242', AION: '#1a7080', JAC: '#5a9e2f', Foton: '#0d4e5a',
}

function statusVariant(s: string): 'green' | 'amber' | 'red' | 'teal' {
  if (s === 'Moving') return 'green'
  if (s === 'Parked') return 'amber'
  if (s === 'Maintenance') return 'red'
  return 'teal'
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 text-sm" style={{ borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text2)' }}>{label}</span>
      <span className="font-semibold text-right" style={{ color: 'var(--text)' }}>{children}</span>
    </div>
  )
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

export function VehicleDrawer({
  vehicle,
  trips,
  alerts,
  onClose,
}: {
  vehicle: Vehicle | null
  trips: Trip[]
  alerts: Alert[]
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('overview')

  if (!vehicle) return null

  const brandColor = BRAND_COLORS[vehicle.brand] ?? '#7cc242'
  const socColor = vehicle.soc >= 50 ? '#5a9e2f' : vehicle.soc >= 20 ? '#c07800' : '#c02020'
  const sohColor = vehicle.soh >= 90 ? '#5a9e2f' : vehicle.soh >= 75 ? '#c07800' : '#c02020'

  const totalKwh = Math.round(vehicle.odometer * 0.18)
  const totalCo2 = Math.round(totalKwh * 0.654)
  const iceCo2 = Math.round(vehicle.odometer * 0.21 * 1000)
  const saved = iceCo2 - totalCo2

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={12} /> },
    { id: 'location', label: 'Location', icon: <MapPin size={12} /> },
    { id: 'carbon',   label: 'Carbon',   icon: <Zap size={12} /> },
    { id: 'trips',    label: 'Trips',    icon: <Route size={12} /> },
  ]

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col slide-in-right"
        style={{
          width: 490,
          maxWidth: '97vw',
          background: 'var(--surface)',
          boxShadow: '-10px 0 50px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div
          className="h-[62px] flex items-center justify-between px-5 flex-shrink-0"
          style={{ background: 'var(--topbar-bg)', borderBottom: '1px solid var(--topbar-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: brandColor }}
            >
              {vehicle.brand.substring(0, 3)}
            </div>
            <div>
              <div className="text-base font-bold text-white">{vehicle.plate_no}</div>
              <div className="text-xs" style={{ color: '#888' }}>{vehicle.brand} {vehicle.model} · {vehicle.year}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: '#2a2a2a', border: '1px solid #333', color: '#aaa' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-shrink-0" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold uppercase tracking-wide transition-all"
              style={{
                color: tab === t.id ? '#1a7080' : 'var(--text3)',
                borderBottom: tab === t.id ? '2px solid #7cc242' : '2px solid transparent',
                background: tab === t.id ? 'var(--surface)' : 'transparent',
                letterSpacing: '0.4px',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-5">
              <div>
                <SectionTitle>Battery Status</SectionTitle>
                <div className="flex gap-3">
                  <GaugeBox label="State of Charge" value={vehicle.soc} unit="SOC %" color={socColor} />
                  <GaugeBox label="State of Health" value={vehicle.soh} unit="SOH %" color={sohColor} />
                </div>
              </div>
              <div>
                <SectionTitle>Vehicle Details</SectionTitle>
                <InfoRow label="Vehicle ID">{vehicle.id.substring(0, 8)}…</InfoRow>
                <InfoRow label="Brand / Model">{vehicle.brand} / {vehicle.model}</InfoRow>
                <InfoRow label="Plate No">{vehicle.plate_no}</InfoRow>
                <InfoRow label="Year">{vehicle.year ?? '—'}</InfoRow>
                <InfoRow label="Status">
                  <Badge variant={statusVariant(vehicle.status)} dot>{vehicle.status}</Badge>
                </InfoRow>
                <InfoRow label="Total Odometer">{vehicle.odometer.toLocaleString()} km</InfoRow>
              </div>
              {alerts.length > 0 && (
                <div>
                  <SectionTitle>Active Alerts</SectionTitle>
                  {alerts.map(a => (
                    <div key={a.id} className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="text-base">{a.type === 'low_battery' ? '⚠️' : a.type === 'maintenance' ? '🔧' : '📍'}</span>
                      <div className="flex-1">
                        <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{a.message}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>{timeAgo(a.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── LOCATION ── */}
          {tab === 'location' && (
            <div className="space-y-5">
              <div>
                <SectionTitle>Last Known Location</SectionTitle>
                <div className="rounded-xl p-4" style={{ background: '#f0f7f0', border: '1px solid #c0dfc0' }}>
                  <div className="text-2xl mb-2">📍</div>
                  <div className="font-bold text-base mb-1" style={{ color: '#0d4e5a' }}>{vehicle.location_name}</div>
                  <div className="text-sm" style={{ color: 'var(--text2)' }}>{vehicle.location_detail}</div>
                  {vehicle.coordinates && (
                    <div className="text-xs mt-2 font-mono" style={{ color: 'var(--text3)' }}>
                      🌐 {vehicle.coordinates}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <SectionTitle>Geofence & Signal</SectionTitle>
                <InfoRow label="GPS Status"><Badge variant="green" dot>Active</Badge></InfoRow>
                <InfoRow label="Coordinates">{vehicle.coordinates ?? '—'}</InfoRow>
              </div>
            </div>
          )}

          {/* ── CARBON ── */}
          {tab === 'carbon' && (
            <div className="space-y-5">
              <div>
                <SectionTitle>Carbon Footprint</SectionTitle>
                <div className="rounded-xl p-5 text-center" style={{ background: '#f0f9e8', border: '1px solid #c0dfa0' }}>
                  <div className="text-5xl font-bold font-condensed mb-1" style={{ color: '#5a9e2f', letterSpacing: '-1px' }}>
                    {totalCo2.toLocaleString()}
                  </div>
                  <div className="text-sm mb-3" style={{ color: 'var(--text2)' }}>kg CO₂ total (lifetime)</div>
                  <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#eaf5d8', color: '#3a7010' }}>
                    ~{saved.toLocaleString()} kg CO₂ saved vs ICE
                  </span>
                </div>
              </div>
              <div>
                <SectionTitle>Emissions Breakdown</SectionTitle>
                <InfoRow label="Grid factor (PLN Indonesia)">0.654 kg CO₂/kWh</InfoRow>
                <InfoRow label="Est. total energy consumed">{totalKwh.toLocaleString()} kWh</InfoRow>
                <InfoRow label="CO₂ this month">{Math.round(totalCo2 * 0.16).toLocaleString()} kg</InfoRow>
                <InfoRow label="CO₂ saved vs ICE equiv." >
                  <span style={{ color: '#5a9e2f' }}>{saved.toLocaleString()} kg</span>
                </InfoRow>
                <InfoRow label="Avg energy efficiency">~180 Wh/km</InfoRow>
              </div>
            </div>
          )}

          {/* ── TRIPS ── */}
          {tab === 'trips' && (
            <div>
              <SectionTitle>Trip History</SectionTitle>
              {trips.length === 0 ? (
                <div className="text-center py-12 text-sm" style={{ color: 'var(--text3)' }}>
                  No trips recorded yet
                </div>
              ) : (
                <div className="space-y-2">
                  {trips.map(t => (
                    <TripCard key={t.id} trip={t} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}
          >
            Close
          </button>
          <button
            className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-white transition-all"
            style={{ background: '#7cc242', border: '1px solid #7cc242' }}
            onClick={() => alert('Live tracking — coming in Week 2 with Google Maps integration')}
          >
            Track Live ›
          </button>
        </div>
      </div>
    </>
  )
}

function TripCard({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-xl p-3.5 cursor-pointer transition-all"
      style={{
        background: open ? 'var(--surface)' : 'var(--surface2)',
        border: `1px solid ${open ? '#1a7080' : 'var(--border)'}`,
      }}
      onClick={() => setOpen(!open)}
    >
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold" style={{ color: '#0d4e5a' }}>
          {new Date(trip.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <span className="text-xs font-bold" style={{ color: '#5a9e2f' }}>{trip.distance_km} km</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 text-xs flex-wrap" style={{ color: 'var(--text2)' }}>
        <span>{trip.origin}</span>
        <span style={{ color: '#1a7080' }}>→</span>
        <span>{trip.destination}</span>
      </div>
      {open && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { val: `${trip.duration_min}m`, key: 'Duration' },
            { val: `${trip.avg_speed} km/h`, key: 'Avg Speed' },
            { val: `${trip.energy_kwh} kWh`, key: 'Energy' },
          ].map(s => (
            <div key={s.key} className="rounded-lg p-2 text-center" style={{ background: '#f0f7f0' }}>
              <div className="text-sm font-bold font-condensed" style={{ color: '#0d4e5a' }}>{s.val}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>{s.key}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
