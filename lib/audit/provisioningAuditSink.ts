import type { AuditSink, ProvisioningAuditEvent } from '@/lib/tenant/provisioning/audit'
import type { AuditActor, AuditRecorder } from '@/lib/audit/types'

/**
 * Adapts the durable AuditRecorder to the existing provisioning AuditSink.
 * Best-effort (the orchestrator also wraps emits in safeAudit, but we keep the
 * adapter self-contained so it is safe wherever it is used). Actor comes from
 * the route layer; the run id + step are preserved in `details`.
 */
export class DurableProvisioningAuditSink implements AuditSink {
  constructor(
    private readonly recorder: AuditRecorder,
    private readonly actor: AuditActor,
  ) {}

  async record(event: ProvisioningAuditEvent): Promise<void> {
    try {
      await this.recorder.record({
        tenantId: event.tenantId,
        actor: this.actor,
        action: `provisioning.${event.action}`,
        outcome: event.outcome,
        resourceType: 'provisioning_run',
        resourceId: event.runId,
        details: event.step ? { runId: event.runId, step: event.step } : { runId: event.runId },
        error: event.error,
      })
    } catch {
      /* best-effort: audit must never break provisioning */
    }
  }
}
