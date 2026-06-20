import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  // Three-step auth guard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'board') return NextResponse.json({ error: 'Forbidden — board role required' }, { status: 403 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Parse and validate body
  const { email, role } = await req.json()
  if (!email) return NextResponse.json({ error: 'Invalid request — email is required' }, { status: 400 })
  if (!['manager', 'driver'].includes(role)) {
    return NextResponse.json({ error: 'Invalid request — role must be manager or driver' }, { status: 400 })
  }

  // Invite via service-role client — inviteUserByEmail sends the email
  const admin = createServiceClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role, tenant_id: tenant.id },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
