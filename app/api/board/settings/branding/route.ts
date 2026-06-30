import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import { safeRecord } from '@/lib/audit/safeRecord'

export async function POST(req: NextRequest) {
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

  const admin = createServiceClient()
  const formData = await req.formData()
  const file = formData.get('logo') as File | null

  if (file && file.size > 0) {
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 2 MB)' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = `tenant-logos/${tenant.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await admin.storage
      .from('tenant-assets')
      .upload(filePath, buffer, { contentType: file.type, upsert: true })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 })
    const { data: { publicUrl } } = admin.storage.from('tenant-assets').getPublicUrl(filePath)
    const { error: updateLogoError } = await admin.from('tenants').update({ logo_url: publicUrl }).eq('id', tenant.id)
    if (updateLogoError) return NextResponse.json({ error: updateLogoError.message }, { status: 400 })
  }

  const name = formData.get('name') as string | null
  const primary_color = formData.get('primary_color') as string | null

  const updates: Record<string, string> = {}
  if (name) updates.name = name
  if (primary_color) {
    if (!/^#[0-9a-fA-F]{6}$/.test(primary_color)) {
      return NextResponse.json({ error: 'Invalid hex colour' }, { status: 400 })
    }
    updates.primary_color = primary_color
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from('tenants').update(updates).eq('id', tenant.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await safeRecord(new SupabaseAuditRecorder(admin), {
    tenantId: tenant.id,
    actor: { id: user.id, label: user.email ?? user.id, role: 'board' },
    action: 'config.branding',
    outcome: 'ok',
    resourceType: 'tenant',
    resourceId: tenant.id,
    details: {
      changedName: Boolean(name),
      changedColor: Boolean(primary_color),
      changedLogo: Boolean(file && file.size > 0),
    },
  })
  return NextResponse.json({ ok: true })
}
