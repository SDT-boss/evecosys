import { describe, it, expect, vi } from 'vitest'
import { DurableProvisioningAuditSink } from '@/lib/audit/provisioningAuditSink'
import type { AuditRecorder, AuditRecordInput } from '@/lib/audit/types'
import type { ProvisioningAuditEvent } from '@/lib/tenant/provisioning/audit'

function makeRecorder(impl?: (i: AuditRecordInput) => Promise<void>) {
  const record = vi.fn(impl ?? (async () => undefined))
  return { recorder: { record } as AuditRecorder, record }
}
const ACTOR = { id: '22222222-2222-2222-2222-222222222222', label: 'admin@x.com', role: 'platform_admin' }

describe('DurableProvisioningAuditSink', () => {
  it('namespaces the action and carries runId + step in details', async () => {
    const { recorder, record } = makeRecorder()
    const sink = new DurableProvisioningAuditSink(recorder, ACTOR)
    const ev: ProvisioningAuditEvent = {
      tenantId: 't1', runId: 'r1', step: 'bind_byodb', action: 'step.complete', outcome: 'ok', at: 'now',
    }
    await sink.record(ev)
    expect(record).toHaveBeenCalledWith({
      tenantId: 't1',
      actor: ACTOR,
      action: 'provisioning.step.complete',
      outcome: 'ok',
      resourceType: 'provisioning_run',
      resourceId: 'r1',
      details: { runId: 'r1', step: 'bind_byodb' },
      error: undefined,
    })
  })

  it('handles run-level events with no step and forwards errors', async () => {
    const { recorder, record } = makeRecorder()
    const sink = new DurableProvisioningAuditSink(recorder, ACTOR)
    await sink.record({ tenantId: 't1', runId: 'r1', action: 'run.rollback', outcome: 'error', error: 'x', at: 'now' })
    expect(record.mock.calls[0][0]).toMatchObject({
      action: 'provisioning.run.rollback',
      outcome: 'error',
      error: 'x',
      details: { runId: 'r1' },
    })
  })

  it('swallows recorder failures', async () => {
    const { recorder } = makeRecorder(async () => { throw new Error('db down') })
    const sink = new DurableProvisioningAuditSink(recorder, ACTOR)
    await expect(
      sink.record({ tenantId: 't1', runId: 'r1', action: 'run.start', outcome: 'ok', at: 'now' }),
    ).resolves.toBeUndefined()
  })
})
