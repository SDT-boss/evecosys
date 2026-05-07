import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Verify caller is a manager
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden — managers only' }, { status: 403 })

  const { full_name, email, password, role } = await req.json()

  if (!full_name || !email || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!['manager', 'board', 'driver'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Use service role for admin user creation
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Insert into public.users — force_password_reset_at set to now so they reset on first login
  const { error: insertError } = await adminClient.from('users').upsert({
    id: newUser.user.id,
    email,
    full_name,
    role,
    force_password_reset_at: new Date().toISOString(),
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  // If driver, also create drivers row
  if (role === 'driver') {
    await adminClient.from('drivers').insert({ user_id: newUser.user.id })
  }

  return NextResponse.json({
    user: { id: newUser.user.id, email, full_name, role, created_at: new Date().toISOString() }
  })
}
