import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function DELETE(req: NextRequest) {
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
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const admin = createServiceClient()

  // Delete the users row scoped by tenant_id to prevent cross-tenant deletes
  const { error: deleteRowError } = await admin
    .from('users')
    .delete()
    .eq('id', userId)
    .eq('tenant_id', tenant.id)
  if (deleteRowError) return NextResponse.json({ error: deleteRowError.message }, { status: 400 })

  // Delete the auth user after the public row is removed
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId)
  if (deleteAuthError) return NextResponse.json({ error: deleteAuthError.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
