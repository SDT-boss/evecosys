'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { Vehicle, Trip, Alert } from '@/types'
import { VehicleDrawer } from '@/components/manager/VehicleDrawer'
import { Badge } from '@/components/ui/Badge'
import { SocBar } from '@/components/ui/SocBar'

const BRAND_COLORS: Record<string, string> = {
  BYD: '#7cc242', AION: '#1a7080', JAC: '#5a9e2f', Foton: '#0d4e5a',
}

function statusVariant(s: string): 'green' | 'amber' | 'red' | 'teal' {
  if (s === 'Moving') return 'green'
  if (s === 'Parked') return 'amber'
  if (s === 'Maintenance') return 'red'
  return 'teal'
}

export function AssetManagementClient({
  vehicles,
  trips,
  alerts,
}: {
  vehicles: Vehicle[]
  trips: Trip[]
  alerts: Alert[]
}) {
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Vehicle | null>(null)

  const brands = ['all', ...Array.from(new Set(vehicles.map(v => v.brand)))]
  const statuses = ['all', 'Moving', 'Parked', 'Charging', 'Maintenance']

  const filtered = useMemo(() => vehicles.filter(v => {
    const matchSearch = !search ||
      v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      v.plate_no.toLowerCase().includes(search.toLowerCase()) ||
      v.location_name.toLowerCase().includes(search.toLowerCase())
    const matchBrand = brandFilter === 'all' || v.brand === brandFilter
    const matchStatus = statusFilter === 'all' || v.status === statusFilter
    return matchSearch && matchBrand && matchStatus
  }), [vehicles, search, brandFilter, statusFilter])

  const selectedTrips = trips.filter(t => t.vehicle_id === selected?.id)
  const selectedAlerts = alerts.filter(a => a.vehicle_id === selected?.id)

  return (
    <>
      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vehicle, plate, location…"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onFocus={e => (e.target.style.borderColor = '#7cc242')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Brand filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wide mr-1" style={{ color: 'var(--text3)' }}>Brand:</span>
          {brands.map(b => (
            <button
              key={b}
              onClick={() => setBrandFilter(b)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
              style={{
                background: brandFilter === b ? '#7cc242' : 'var(--surface)',
                color: brandFilter === b ? 'white' : 'var(--text2)',
                borderColor: brandFilter === b ? '#7cc242' : 'var(--border)',
              }}
            >
              {b === 'all' ? `All (${vehicles.length})` : `${b} (${vehicles.filter(v => v.brand === b).length})`}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wide mr-1" style={{ color: 'var(--text3)' }}>Status:</span>
          {statuses.filter(s => s === 'all' || vehicles.some(v => v.status === s)).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
              style={{
                background: statusFilter === s ? '#1a7080' : 'var(--surface)',
                color: statusFilter === s ? 'white' : 'var(--text2)',
                borderColor: statusFilter === s ? '#1a7080' : 'var(--border)',
              }}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs mb-4" style={{ color: 'var(--text3)' }}>
        Showing {filtered.length} of {vehicles.length} vehicles
      </div>

      {/* Vehicle Cards Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-3xl mb-3">🔍</div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No vehicles found</p>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(v => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              alertCount={alerts.filter(a => a.vehicle_id === v.id && !a.resolved).length}
              onClick={() => setSelected(v)}
            />
          ))}
        </div>
      )}

      {/* Drawer */}
      {selected && (
        <VehicleDrawer
          vehicle={selected}
          trips={selectedTrips}
          alerts={selectedAlerts}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

function VehicleCard({
  vehicle: v,
  alertCount,
  onClick,
}: {
  vehicle: Vehicle
  alertCount: number
  onClick: () => void
}) {
  const brandColor = BRAND_COLORS[v.brand] ?? '#7cc242'

  return (
    <div
      onClick={onClick}
      className="rounded-xl p-4.5 cursor-pointer transition-all duration-150 group"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '18px',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.borderColor = '#7cc242'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(124,194,66,0.14)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLElement).style.transform = 'none'
      }}
    >
      {/* Top row */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: brandColor }}
          >
            {v.brand.substring(0, 3)}
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{v.plate_no}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>{v.brand} {v.model}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant={statusVariant(v.status)} dot>{v.status}</Badge>
          {v.soc < 20 && <Badge variant="red">Low Battery</Badge>}
          {alertCount > 0 && <Badge variant="amber">{alertCount} alert{alertCount > 1 ? 's' : ''}</Badge>}
        </div>
      </div>

      {/* SOC / SOH bars */}
      <div className="space-y-2.5 mb-4">
        <SocBar value={v.soc} label="State of Charge (SOC)" />
        <SocBar value={v.soh} label="State of Health (SOH)" />
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-[11px]" style={{ color: 'var(--text3)' }}>📍 {v.location_name}</span>
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text2)' }}>{v.odometer.toLocaleString()} km</span>
      </div>
      <div className="text-right text-[10px] mt-2 font-semibold" style={{ color: '#1a7080', opacity: 0.7 }}>
        Click to view details →
      </div>
    </div>
  )
}
