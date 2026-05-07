'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
import type { ChargingStation } from '@/types'

const PickerMap = dynamic(() => import('./StationPickerMap'), { ssr: false })

interface Props {
  onClose: () => void
  onCreated: (station: ChargingStation) => void
}

export function AddStationModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [powerKw, setPowerKw] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!picked) { setError('Click the map to place a station pin'); return }
    if (!name.trim() || !address.trim() || !powerKw) { setError('All fields are required'); return }

    setLoading(true)
    setError('')

    const res = await fetch('/api/charging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        address: address.trim(),
        coordinates: `${picked.lat},${picked.lng}`,
        power_kw: Number(powerKw),
        is_active: isActive,
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (json.error) { setError(json.error); return }

    onCreated(json.data as ChargingStation)
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--surface2)',
    color: 'var(--text)',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Add Charging Station</h2>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>Station Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. KLCC Charging Hub"
              style={inputStyle}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>Address *</label>
            <input
              type="text"
              required
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. Kuala Lumpur City Centre, 50088 KL"
              style={inputStyle}
            />
          </div>

          {/* Power kW */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>Power (kW) *</label>
            <input
              type="number"
              required
              min="1"
              step="0.1"
              value={powerKw}
              onChange={e => setPowerKw(e.target.value)}
              placeholder="e.g. 50"
              style={inputStyle}
            />
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-ev-green"
            />
            <label htmlFor="isActive" className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
              Active (available for charging)
            </label>
          </div>

          {/* Map */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>
              Pin Location * <span className="font-normal opacity-70">(click map to place, drag to adjust)</span>
            </label>
            <PickerMap picked={picked} onPick={(lat, lng) => setPicked({ lat, lng })} />
            {picked ? (
              <p className="text-xs mt-1.5 font-mono" style={{ color: 'var(--text3)' }}>
                {picked.lat.toFixed(6)}, {picked.lng.toFixed(6)}
              </p>
            ) : (
              <p className="text-xs mt-1.5" style={{ color: 'var(--text3)' }}>No location selected</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#fdeaea', color: '#8a1010', border: '1px solid #f5c6c6' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !picked}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: '#7cc242' }}
            >
              {loading ? 'Creating…' : 'Add Station'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
