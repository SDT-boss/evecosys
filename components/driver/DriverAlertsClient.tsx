'use client'

import { useState } from 'react'
import { CheckCircle, Zap, Wrench, MapPin, Gauge, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { Alert } from '@/types'

type AlertWithResolvedName = Alert & { resolved_by_name?: string | null }

const ALERT_META: Record<string, { icon: React.ReactNode; bg: string; variant: 'red' | 'amber' | 'green' | 'teal'; label: string }> = {
  low_battery:     { icon: <Zap size={14} />,        bg: '#fdeaea', variant: 'red',   label: 'Low Battery' },
  maintenance:     { icon: <Wrench size={14} />,      bg: '#fef3dc', variant: 'amber', label: 'Maintenance' },
  charge_complete: { icon: <CheckCircle size={14} />, bg: '#eaf5d8', variant: 'green', label: 'Charge Complete' },
  geofence:        { icon: <MapPin size={14} />,      bg: '#fdeaea', variant: 'red',   label: 'Geofence' },
  speeding:        { icon: <Gauge size={14} />,       bg: '#fdeaea', variant: 'red',   label: 'Speeding' },
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function DriverAlertsClient({ alerts, userId }: { alerts: AlertWithResolvedName[]; userId: string }) {
  const [items, setItems] = useState(alerts)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active')
  const [resolving, setResolving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeCount = items.filter(a => !a.resolved).length
  const filtered = items.filter(a => {
    if (filter === 'active') return !a.resolved
    if (filter === 'resolved') return a.resolved
    return true
  })

  async function resolve(alertId: string) {
    setResolving(alertId)
    setError(null)
    // Optimistic update
    setItems(prev => prev.map(a => a.id === alertId
      ? { ...a, resolved: true, resolved_at: new Date().toISOString(), resolved_by_name: 'You' }
      : a
    ))
    const res = await fetch('/api/alerts/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId }),
    })
    if (!res.ok) {
      // Revert
      setItems(prev => prev.map(a => a.id === alertId
        ? { ...a, resolved: false, resolved_at: null, resolved_by_name: null }
        : a
      ))
      setError('Failed to resolve alert. Please try again.')
    }
    setResolving(null)
  }

  return (
    <div>
      {error && (
        <div className="flex items-center gap-2 rounded-lg px-4 py-3 mb-4 text-sm"
          style={{ background: '#fdeaea', border: '1px solid #f0b0b0', color: '#8a1010' }}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[
          { key: 'all',      label: `All (${items.length})` },
          { key: 'active',   label: `Active (${activeCount})` },
          { key: 'resolved', label: `Resolved (${items.length - activeCount})` },
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
      <div className="rounded-xl overflow-hidden theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle size={40} className="mx-auto mb-3" style={{ color: '#7cc242' }} />
            <p className="font-semibold" style={{ color: 'var(--text)' }}>No alerts</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text3)' }}>
              {filter === 'active' ? 'All clear — no active alerts' : `No ${filter} alerts`}
            </p>
          </div>
        ) : (
          filtered.map((a, idx) => {
            const meta = ALERT_META[a.type] ?? ALERT_META.low_battery
            const iconColor = meta.variant === 'green' ? '#3a7010' : meta.variant === 'amber' ? '#8a5500' : '#8a1010'
            return (
              <div
                key={a.id}
                className="flex items-start gap-4 px-5 py-4 transition-colors"
                style={{
                  borderTop: idx > 0 ? '1px solid var(--border)' : undefined,
                  opacity: a.resolved ? 0.65 : 1,
                }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: meta.bg, color: iconColor }}
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
                    {timeAgo(a.created_at)}
                  </div>
                  {a.resolved && a.resolved_at && (
                    <div className="text-xs mt-1" style={{ color: '#5a9e2f' }}>
                      Resolved{a.resolved_by_name ? ` by ${a.resolved_by_name}` : ''} at {formatDateTime(a.resolved_at)}
                    </div>
                  )}
                </div>

                {/* Action */}
                {!a.resolved && (
                  <button
                    onClick={() => resolve(a.id)}
                    disabled={resolving === a.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 mt-0.5"
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text2)',
                      opacity: resolving === a.id ? 0.5 : 1,
                      cursor: resolving === a.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {resolving === a.id ? '…' : '✓ Mark Resolved'}
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
