import { describe, it, expect, vi } from 'vitest'
import { queryAuditLogs } from '@/lib/audit/query'

// Chainable Supabase query-builder stub recording each call.
function makeClient(rows: unknown[]) {
  const calls: Array<[string, unknown[]]> = []
  const builder: Record<string, unknown> = {}
  const chain = (name: string) => (...args: unknown[]) => { calls.push([name, args]); return builder }
  builder.select = chain('select')
  builder.eq = chain('eq')
  builder.gte = chain('gte')
  builder.lte = chain('lte')
  builder.lt = chain('lt')
  builder.order = chain('order')
  builder.limit = chain('limit')
  // resolve when awaited (thenable): return { data, error }
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null })
  const from = vi.fn().mockReturnValue(builder)
  return { client: { from } as never, from, calls }
}

describe('queryAuditLogs', () => {
  it('scopes to tenant, applies filters, orders by seq desc, and caps the limit', async () => {
    const { client, from, calls } = makeClient([])
    await queryAuditLogs(client, {
      tenantId: 't1', action: 'lifecycle.suspend',
      from: '2026-01-01', to: '2026-12-31', actorId: 'a1', limit: 25,
    })
    expect(from).toHaveBeenCalledWith('audit_logs')
    const names = calls.map((c) => c[0])
    expect(names).toContain('eq')   // tenant_id + action + actor_id
    expect(names).toContain('gte')  // from
    expect(names).toContain('lte')  // to
    expect(names).toContain('order')
    expect(names).toContain('limit')
    const eqArgs = calls.filter((c) => c[0] === 'eq').map((c) => c[1][0])
    expect(eqArgs).toEqual(expect.arrayContaining(['tenant_id', 'action', 'actor_id']))
  })

  it('clamps limit to the [1,100] range and defaults to 50', async () => {
    const { client, calls } = makeClient([])
    await queryAuditLogs(client, { tenantId: 't1', limit: 9999 })
    const limitCall = calls.find((c) => c[0] === 'limit')!
    expect(limitCall[1][0]).toBe(100)

    const { client: c2, calls: calls2 } = makeClient([])
    await queryAuditLogs(c2, { tenantId: 't1' })
    expect(calls2.find((c) => c[0] === 'limit')![1][0]).toBe(50)
  })

  it('applies the keyset cursor via lt(seq, cursor) and returns nextCursor', async () => {
    const { client, calls } = makeClient([{ seq: 5 }, { seq: 4 }])
    const res = await queryAuditLogs(client, { tenantId: 't1', limit: 2, cursor: 10 })
    const ltCall = calls.find((c) => c[0] === 'lt')!
    expect(ltCall[1]).toEqual(['seq', 10])
    expect(res.rows).toHaveLength(2)
    expect(res.nextCursor).toBe(4) // smallest seq in the page
  })

  it('returns nextCursor=null when the page is not full', async () => {
    const { client } = makeClient([{ seq: 4 }])
    const res = await queryAuditLogs(client, { tenantId: 't1', limit: 2 })
    expect(res.nextCursor).toBeNull()
  })

  it('ignores a NaN cursor and does not call lt', async () => {
    const { client, calls } = makeClient([])
    await queryAuditLogs(client, { tenantId: 't1', cursor: NaN })
    expect(calls.some(c => c[0] === 'lt')).toBe(false)
  })
})
