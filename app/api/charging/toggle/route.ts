import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden — managers only' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: current, error: fetchErr } = await supabase
    .from('charging_stations')
    .select('is_active')
    .eq('id', id)
    .single()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 })

  const { data, error } = await supabase
    .from('charging_stations')
    .update({ is_active: !current.is_active })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ data })
}
