import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queryAuditLogs } from '@/lib/audit/query'

/**
 * Tenant-owner audit retrieval. Uses the RLS user client: audit_logs_select_own
 * guarantees the caller can only ever read their own tenant's rows, even if the
 * tenantId resolution below were wrong (defense-in-depth).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'board') {
    return NextResponse.json({ error: 'Forbidden — board role required' }, { status: 403 })
  }

  const { data: tenant } = await supabase
    .from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const url = new URL(req.url)
  const cursorParam = url.searchParams.get('cursor')
  const limitParam = url.searchParams.get('limit')

  const result = await queryAuditLogs(supabase, {
    tenantId: tenant.id,
    action: url.searchParams.get('action') ?? undefined,
    actorId: url.searchParams.get('actor') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    cursor: cursorParam ? Number(cursorParam) : undefined,
    limit: limitParam ? Number(limitParam) : undefined,
  })

  return NextResponse.json(result)
}
