import { Suspense } from 'react'
import { Bell } from 'lucide-react'
import { AlertBell } from './AlertBell'

function BellFallback() {
  return (
    <button
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #333', color: '#888' }}
    >
      <Bell size={14} />
    </button>
  )
}

export function AlertBellWrapper({ role }: { role: 'manager' | 'driver' | 'board' }) {
  return (
    <Suspense fallback={<BellFallback />}>
      <AlertBell role={role} />
    </Suspense>
  )
}
