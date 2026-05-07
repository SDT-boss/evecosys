'use client'

import { AlertTriangle } from 'lucide-react'

export function ErrorCard({ title, message, onReset }: {
  title: string
  message?: string
  onReset?: () => void
}) {
  return (
    <div className="fade-in">
      <div
        className="rounded-xl p-10 flex flex-col items-center text-center theme-transition"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <AlertTriangle size={36} className="mb-3" style={{ color: '#c02020' }} />
        <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{title}</p>
        {message && (
          <p className="text-sm mb-5" style={{ color: 'var(--text3)' }}>{message}</p>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: '#1a7080', color: 'white' }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
