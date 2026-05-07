'use client'

import { useState, useMemo } from 'react'
import { MapPin } from 'lucide-react'
import type { Trip } from '@/types'

type FilterMode = 'range' | 'single'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DriverTripsClient({ trips }: { trips: Trip[] }) {
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('range')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [singleDate, setSingleDate] = useState('')

  const filtered = useMemo(() => {
    return trips.filter(t => {
      if (search) {
        const q = search.toLowerCase()
        if (!t.origin.toLowerCase().includes(q) && !t.destination.toLowerCase().includes(q)) return false
      }
      if (filterMode === 'single' && singleDate) {
        if (!t.started_at.startsWith(singleDate)) return false
      } else if (filterMode === 'range') {
        if (dateFrom && t.started_at < dateFrom) return false
        if (dateTo && t.started_at > dateTo + 'T23:59:59') return false
      }
      return true
    })
  }, [trips, search, filterMode, dateFrom, dateTo, singleDate])

  return (
    <div>
      {/* Filters */}
      <div className="rounded-xl p-4 mb-4 theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          <input
            type="text"
            placeholder="Search origin or destination…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] rounded-lg px-3 py-2 text-sm outline-none theme-transition"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode('range')}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={{
                background: filterMode === 'range' ? '#1a7080' : 'var(--surface2)',
                color: filterMode === 'range' ? 'white' : 'var(--text2)',
                borderColor: filterMode === 'range' ? '#1a7080' : 'var(--border)',
              }}
            >
              Date Range
            </button>
            <button
              onClick={() => setFilterMode('single')}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={{
                background: filterMode === 'single' ? '#1a7080' : 'var(--surface2)',
                color: filterMode === 'single' ? 'white' : 'var(--text2)',
                borderColor: filterMode === 'single' ? '#1a7080' : 'var(--border)',
              }}
            >
              Exact Date
            </button>
          </div>
          {filterMode === 'range' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none theme-transition"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <span className="text-xs" style={{ color: 'var(--text3)' }}>to</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none theme-transition"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
          ) : (
            <input
              type="date"
              value={singleDate}
              onChange={e => setSingleDate(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none theme-transition"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          )}
          {(search || dateFrom || dateTo || singleDate) && (
            <button
              onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setSingleDate('') }}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
              style={{ color: '#1a7080', borderColor: '#1a7080', background: 'transparent' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MapPin size={36} className="mb-3" style={{ color: 'var(--text3)' }} />
            <p className="font-semibold" style={{ color: 'var(--text)' }}>No trips found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text3)' }}>
              {trips.length === 0 ? 'No trips have been recorded yet.' : 'Try adjusting your search or date filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Route', 'Distance', 'Energy', 'Duration', 'Avg Speed', 'Date'].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-bold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--text3)', fontSize: 10, letterSpacing: '0.4px' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => (
                  <tr
                    key={t.id}
                    className="transition-colors"
                    style={{ borderTop: idx > 0 ? '1px solid var(--border)' : undefined }}
                  >
                    <td className="px-4 py-3">
                      <span style={{ color: 'var(--text)' }}>{t.origin}</span>
                      <span className="mx-1.5 font-bold" style={{ color: '#1a7080' }}>→</span>
                      <span style={{ color: 'var(--text)' }}>{t.destination}</span>
                    </td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: '#5a9e2f' }}>
                      {t.distance_km} km
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text2)' }}>
                      {t.energy_kwh} kWh
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text2)' }}>
                      {t.duration_min} min
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text2)' }}>
                      {t.avg_speed} km/h
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text3)' }}>
                      {formatDate(t.started_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length < trips.length && (
              <div className="px-4 py-2.5 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text3)' }}>
                Showing {filtered.length} of {trips.length} trips
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
