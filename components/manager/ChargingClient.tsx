'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { AddStationModal } from './AddStationModal'
import type { ChargingStation } from '@/types'

const StationMap = dynamic(() => import('./StationMap'), { ssr: false })

export function ChargingClient({ initialStations }: { initialStations: ChargingStation[] }) {
  const [stations, setStations] = useState(initialStations)
  const [showAdd, setShowAdd] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggle(id: string) {
    setToggling(id)
    const res = await fetch('/api/charging/toggle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    if (!json.error) {
      setStations(prev => prev.map(s => s.id === id ? { ...s, is_active: json.data.is_active } : s))
    }
    setToggling(null)
  }

  const activeCount = stations.filter(s => s.is_active).length

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-condensed" style={{ color: 'var(--text)' }}>Charging Stations</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text3)' }}>
            {stations.length} stations · {activeCount} active
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: '#7cc242' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#5a9e2f')}
          onMouseLeave={e => (e.currentTarget.style.background = '#7cc242')}
        >
          <Plus size={16} />
          Add Station
        </button>
      </div>

      {/* Cards grid */}
      {stations.length === 0 ? (
        <div className="rounded-xl p-12 text-center mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-4xl mb-3">⚡</div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No charging stations added yet</p>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>Click "Add Station" to add your first charging location.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {stations.map(s => (
            <StationCard
              key={s.id}
              station={s}
              toggling={toggling === s.id}
              onToggle={() => toggle(s.id)}
            />
          ))}
        </div>
      )}

      {/* Leaflet map */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <StationMap stations={stations} />
      </div>

      {/* Add modal */}
      {showAdd && (
        <AddStationModal
          onClose={() => setShowAdd(false)}
          onCreated={station => setStations(prev => [station, ...prev])}
        />
      )}
    </>
  )
}

function StationCard({
  station: s,
  toggling,
  onToggle,
}: {
  station: ChargingStation
  toggling: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: s.is_active ? '#eaf5d8' : 'var(--surface2)' }}
          >
            <Zap size={16} style={{ color: s.is_active ? '#3a7010' : 'var(--text3)' }} />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>{s.name}</div>
            <div className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text3)' }}>{s.address}</div>
          </div>
        </div>
        <Badge variant={s.is_active ? 'green' : 'gray'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
      </div>

      {/* Power */}
      <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text3)' }}>Power output</span>
        <span className="text-xs font-bold ml-auto" style={{ color: 'var(--text)' }}>{s.power_kw} kW</span>
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        disabled={toggling}
        className="w-full py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
        style={{
          background: s.is_active ? '#fdeaea' : '#eaf5d8',
          color: s.is_active ? '#8a1010' : '#3a7010',
          border: `1px solid ${s.is_active ? '#f5c6c6' : '#c0dfa0'}`,
        }}
      >
        {toggling ? '…' : s.is_active ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  )
}
