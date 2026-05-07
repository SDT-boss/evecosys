import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { alertId } = await req.json()
  if (!alertId) return NextResponse.json({ error: 'Missing alertId' }, { status: 400 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: alert } = await supabase
    .from('alerts')
    .select('vehicle_id')
    .eq('id', alertId)
    .single()
  if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })

  if (profile.role === 'driver') {
    const { data: driver } = await supabase
      .from('drivers')
      .select('assigned_vehicle_id')
      .eq('user_id', user.id)
      .single()
    if (!driver || driver.assigned_vehicle_id !== alert.vehicle_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('alerts')
    .update({
      resolved: true,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', alertId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
