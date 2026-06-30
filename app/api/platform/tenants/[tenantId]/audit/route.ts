import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePlatformAdmin } from '@/lib/platform/requirePlatformAdmin'
import { queryAuditLogs } from '@/lib/audit/query'

/**
 * Platform-admin audit retrieval for enterprise review. Path-scoped to one
 * tenant; platform_admin may read any tenant. Records were redacted at write
 * time, so responses carry no raw secrets.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const guard = await requirePlatformAdmin()
  if ('error' in guard) return guard.error

  const url = new URL(req.url)
  const cursorParam = url.searchParams.get('cursor')
  const limitParam = url.searchParams.get('limit')

  const admin = createServiceClient()
  const result = await queryAuditLogs(admin, {
    tenantId,
    action: url.searchParams.get('action') ?? undefined,
    actorId: url.searchParams.get('actor') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    cursor: cursorParam ? Number(cursorParam) : undefined,
    limit: limitParam ? Number(limitParam) : undefined,
  })

  return NextResponse.json(result)
}
