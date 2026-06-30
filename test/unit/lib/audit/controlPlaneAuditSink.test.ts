import { describe, it, expect, vi } from 'vitest'
import { DurableControlPlaneAuditSink } from '@/lib/audit/controlPlaneAuditSink'
import type { AuditRecorder, AuditRecordInput } from '@/lib/audit/types'
import type { ControlPlaneAuditEvent } from '@/lib/tenant/controlplane/audit'

function makeRecorder(impl?: (i: AuditRecordInput) => Promise<void>): { recorder: AuditRecorder; record: ReturnType<typeof vi.fn> } {
  const record = vi.fn(impl ?? (async () => undefined))
  return { recorder: { record }, record }
}

const ACTOR = { id: '22222222-2222-2222-2222-222222222222', label: 'admin@x.com', role: 'platform_admin' }

describe('DurableControlPlaneAuditSink', () => {
  it('maps a suspend event to a namespaced action with actor + resource', async () => {
    const { recorder, record } = makeRecorder()
    const sink = new DurableControlPlaneAuditSink(recorder, ACTOR)
    const ev: ControlPlaneAuditEvent = {
      tenantId: 't1', actor: 'admin@x.com', action: 'suspend', outcome: 'ok', at: '2026-06-30T00:00:00Z',
    }
    await sink.record(ev)
    expect(record).toHaveBeenCalledWith({
      tenantId: 't1',
      actor: ACTOR,
      action: 'lifecycle.suspend',
      outcome: 'ok',
      resourceType: 'tenant',
      resourceId: 't1',
      details: undefined,
      error: undefined,
    })
  })

  it('maps rotate_credentials and override (carrying reason in details)', async () => {
    const { recorder, record } = makeRecorder()
    const sink = new DurableControlPlaneAuditSink(recorder, ACTOR)
    await sink.record({ tenantId: 't1', actor: 'a', action: 'rotate_credentials', outcome: 'ok', at: 'now' })
    expect(record.mock.calls[0][0].action).toBe('credentials.rotate')

    await sink.record({ tenantId: 't1', actor: 'a', action: 'override', outcome: 'ok', reason: 'incident #5', at: 'now' })
    expect(record.mock.calls[1][0]).toMatchObject({
      action: 'lifecycle.override',
      details: { reason: 'incident #5' },
    })
  })

  it('forwards the error message for error outcomes', async () => {
    const { recorder, record } = makeRecorder()
    const sink = new DurableControlPlaneAuditSink(recorder, ACTOR)
    await sink.record({ tenantId: 't1', actor: 'a', action: 'decommission', outcome: 'error', error: 'boom', at: 'now' })
    expect(record.mock.calls[0][0]).toMatchObject({ action: 'lifecycle.decommission', outcome: 'error', error: 'boom' })
  })

  it('swallows recorder failures (audit must never break the operation)', async () => {
    const { recorder } = makeRecorder(async () => { throw new Error('db down') })
    const sink = new DurableControlPlaneAuditSink(recorder, ACTOR)
    await expect(
      sink.record({ tenantId: 't1', actor: 'a', action: 'suspend', outcome: 'ok', at: 'now' }),
    ).resolves.toBeUndefined()
  })
})
