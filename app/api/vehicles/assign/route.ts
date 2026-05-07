import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden — managers only' }, { status: 403 })

  const { driver_id, vehicle_id } = await req.json()
  if (!driver_id) return NextResponse.json({ error: 'Missing driver_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('drivers')
    .update({ assigned_vehicle_id: vehicle_id ?? null })
    .eq('id', driver_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data })
}
