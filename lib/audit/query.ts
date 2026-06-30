import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuditQueryFilters {
  tenantId: string
  action?: string
  actorId?: string
  /** ISO date/time lower bound (inclusive) on created_at. */
  from?: string
  /** ISO date/time upper bound (inclusive) on created_at. */
  to?: string
  /** Keyset cursor: return rows with seq < cursor. */
  cursor?: number
  /** Page size, clamped to [1, 100]. Defaults to 50. */
  limit?: number
}

export interface AuditQueryResult {
  rows: Array<Record<string, unknown>>
  /** Pass as `cursor` to fetch the next page; null when there are no more rows. */
  nextCursor: number | null
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)))
}

/**
 * Tenant-scoped, filtered, keyset-paginated read of audit_logs.
 *
 * The caller chooses the client and is responsible for the trust boundary:
 *  - platform admin: service-role client + a path-validated tenantId.
 *  - tenant owner: RLS user client (RLS enforces the tenant scope regardless of
 *    the tenantId passed here — defense-in-depth).
 */
export async function queryAuditLogs(
  client: SupabaseClient,
  filters: AuditQueryFilters,
): Promise<AuditQueryResult> {
  const limit = clampLimit(filters.limit)

  let q = client.from('audit_logs').select('*').eq('tenant_id', filters.tenantId)
  if (filters.action) q = q.eq('action', filters.action)
  if (filters.actorId) q = q.eq('actor_id', filters.actorId)
  if (filters.from) q = q.gte('created_at', filters.from)
  if (filters.to) q = q.lte('created_at', filters.to)
  if (filters.cursor !== undefined && !Number.isNaN(filters.cursor)) q = q.lt('seq', filters.cursor)

  q = q.order('seq', { ascending: false }).limit(limit)

  const { data, error } = await q
  if (error) throw new Error(`audit query failed — ${error.message}`)

  const rows = (data ?? []) as Array<Record<string, unknown>>
  const nextCursor =
    rows.length === limit ? (rows[rows.length - 1].seq as number) : null
  return { rows, nextCursor }
}
