import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

function StaticBell() {
  return (
    <button
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #333', color: '#888' }}
    >
      <Bell size={14} />
    </button>
  )
}

export async function AlertBell({ role }: { role: 'manager' | 'driver' | 'board' }) {
  if (role === 'board') return <StaticBell />

  let count = 0
  let fallback = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      fallback = true
    } else if (role === 'manager') {
      const { count: c } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
      count = c ?? 0
    } else if (role === 'driver') {
      const { data: driver } = await supabase
        .from('drivers')
        .select('assigned_vehicle_id')
        .eq('user_id', user.id)
        .single()
      if (driver?.assigned_vehicle_id) {
        const { count: c } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .eq('vehicle_id', driver.assigned_vehicle_id)
          .eq('resolved', false)
        count = c ?? 0
      }
    }
  } catch {
    fallback = true
  }

  if (fallback) return <StaticBell />

  return (
    <button
      className="w-8 h-8 rounded-lg flex items-center justify-center relative"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #333', color: '#888' }}
    >
      <Bell size={14} />
      <span
        className="absolute top-1 right-1 w-2 h-2 rounded-full"
        style={{ background: count > 0 ? '#c02020' : '#7cc242' }}
      />
    </button>
  )
}
