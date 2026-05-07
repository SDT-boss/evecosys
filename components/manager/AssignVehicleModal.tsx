'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { Driver, Vehicle, AppUser } from '@/types'

type DriverWithRelations = Driver & { user?: AppUser; vehicle?: Vehicle }

type Tab = 'all' | 'assigned' | 'unassigned'

interface Props {
  driver: DriverWithRelations
  vehicles: Vehicle[]
  onClose: () => void
  onAssigned: (driverId: string, vehicleId: string | null) => void
}

export function AssignVehicleModal({ driver, vehicles, onClose, onAssigned }: Props) {
  const [tab, setTab] = useState<Tab>('all')
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentVehicle = driver.vehicle

  const filteredVehicles = vehicles.filter(v => {
    if (tab === 'assigned') return v.id === driver.assigned_vehicle_id
    if (tab === 'unassigned') return v.id !== driver.assigned_vehicle_id
    return true
  })

  async function handleAssign() {
    if (!selectedVehicleId) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/vehicles/assign', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_id: driver.id, vehicle_id: selectedVehicleId }),
    })
    const json = await res.json()
    setLoading(false)
    if (json.error) { setError(json.error); return }
    onAssigned(driver.id, selectedVehicleId)
    onClose()
  }

  async function handleUnassign() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/vehicles/assign', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_id: driver.id, vehicle_id: null }),
    })
    const json = await res.json()
    setLoading(false)
    if (json.error) { setError(json.error); return }
    onAssigned(driver.id, null)
    onClose()
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'unassigned', label: 'Unassigned' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
              Assign Vehicle
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
              {driver.user?.full_name ?? 'Driver'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current assignment */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text2)' }}>Current Assignment</p>
            {currentVehicle ? (
              <div className="flex items-center gap-2">
                <Badge variant="teal" dot>
                  {currentVehicle.brand} {currentVehicle.model}
                </Badge>
                <span className="text-xs" style={{ color: 'var(--text3)' }}>· {currentVehicle.plate_no}</span>
              </div>
            ) : (
              <Badge variant="gray">No vehicle assigned</Badge>
            )}
          </div>

          {/* Filter tabs */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text2)' }}>Select Vehicle</p>
            <div className="flex gap-2 mb-3">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setSelectedVehicleId('') }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                  style={{
                    background: tab === t.key ? '#1a7080' : 'var(--surface2)',
                    color: tab === t.key ? 'white' : 'var(--text2)',
                    borderColor: tab === t.key ? '#1a7080' : 'var(--border)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Vehicle dropdown */}
            <select
              value={selectedVehicleId}
              onChange={e => setSelectedVehicleId(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                color: selectedVehicleId ? 'var(--text)' : 'var(--text3)',
              }}
            >
              <option value="">— Select a vehicle —</option>
              {filteredVehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} · {v.plate_no}
                </option>
              ))}
            </select>

            {filteredVehicles.length === 0 && (
              <p className="text-xs mt-2" style={{ color: 'var(--text3)' }}>
                No vehicles in this category.
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#fdeaea', color: '#8a1010', border: '1px solid #f5c6c6' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {driver.assigned_vehicle_id && (
              <button
                onClick={handleUnassign}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: '#fdeaea', color: '#8a1010', border: '1px solid #f5c6c6' }}
              >
                {loading ? '…' : 'Unassign'}
              </button>
            )}
            <button
              onClick={handleAssign}
              disabled={loading || !selectedVehicleId}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: '#7cc242' }}
            >
              {loading ? '…' : 'Confirm Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
