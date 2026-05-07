'use client'

import { useState } from 'react'
import { CheckCircle, AlertTriangle, Wrench, MapPin, Zap, Gauge } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import type { Alert, Vehicle } from '@/types'

const ALERT_META: Record<string, { icon: React.ReactNode; bg: string; variant: 'red' | 'amber' | 'green' | 'teal'; label: string }> = {
  low_battery:     { icon: <Zap size={14} />,           bg: '#fdeaea', variant: 'red',   label: 'Low Battery' },
  maintenance:     { icon: <Wrench size={14} />,         bg: '#fef3dc', variant: 'amber', label: 'Maintenance' },
  charge_complete: { icon: <CheckCircle size={14} />,    bg: '#eaf5d8', variant: 'green', label: 'Charge Complete' },
  geofence:        { icon: <MapPin size={14} />,         bg: '#fdeaea', variant: 'red',   label: 'Geofence' },
  speeding:        { icon: <Gauge size={14} />,          bg: '#fdeaea', variant: 'red',   label: 'Speeding' },
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

export function AlertsClient({ initialAlerts, vehicles }: { initialAlerts: (Alert & { vehicle?: Vehicle })[]; vehicles: Vehicle[] }) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active')
  const [resolving, setResolving] = useState<string | null>(null)

  const filtered = alerts.filter(a => {
    if (filter === 'active') return !a.resolved
    if (filter === 'resolved') return a.resolved
    return true
  })

  async function resolve(id: string) {
    setResolving(id)
    const supabase = createClient()
    await supabase.from('alerts').update({ resolved: true }).eq('id', id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a))
    setResolving(null)
  }

  const activeCount = alerts.filter(a => !a.resolved).length

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {[
          { key: 'all', label: `All (${alerts.length})` },
          { key: 'active', label: `Active (${activeCount})` },
          { key: 'resolved', label: `Resolved (${alerts.length - activeCount})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all border"
            style={{
              background: filter === f.key ? '#7cc242' : 'var(--surface)',
              color: filter === f.key ? 'white' : 'var(--text2)',
              borderColor: filter === f.key ? '#7cc242' : 'var(--border)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle size={40} className="mx-auto mb-3" style={{ color: '#7cc242' }} />
            <p className="font-semibold" style={{ color: 'var(--text)' }}>No alerts</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text3)' }}>
              {filter === 'active' ? 'All clear — no active alerts' : 'No resolved alerts yet'}
            </p>
          </div>
        ) : (
          filtered.map((a, idx) => {
            const meta = ALERT_META[a.type] ?? ALERT_META.low_battery
            return (
              <div
                key={a.id}
                className="flex items-center gap-4 px-5 py-4 transition-colors"
                style={{
                  borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  background: a.resolved ? 'transparent' : undefined,
                  opacity: a.resolved ? 0.6 : 1,
                }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: meta.bg, color: meta.variant === 'green' ? '#3a7010' : meta.variant === 'amber' ? '#8a5500' : '#8a1010' }}
                >
                  {meta.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{a.message}</span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    {a.resolved && <Badge variant="gray">Resolved</Badge>}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
                    {a.vehicle
                      ? `${a.vehicle.brand} ${a.vehicle.model} · ${a.vehicle.plate_no}`
                      : a.vehicle_id
                    }
                    {' · '}
                    {timeAgo(a.created_at)}
                  </div>
                </div>

                {/* Action */}
                {!a.resolved && (
                  <button
                    onClick={() => resolve(a.id)}
                    disabled={resolving === a.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text2)',
                      opacity: resolving === a.id ? 0.5 : 1,
                    }}
                  >
                    {resolving === a.id ? '…' : '✓ Resolve'}
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
