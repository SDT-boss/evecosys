import type {
  ControlPlaneAuditEvent,
  ControlPlaneAuditSink,
} from '@/lib/tenant/controlplane/audit'
import type { AuditActor, AuditRecorder } from '@/lib/audit/types'

const ACTION_MAP: Record<ControlPlaneAuditEvent['action'], string> = {
  suspend: 'lifecycle.suspend',
  reactivate: 'lifecycle.reactivate',
  decommission: 'lifecycle.decommission',
  override: 'lifecycle.override',
  rotate_credentials: 'credentials.rotate',
  read_config: 'config.read',
}

/**
 * Adapts the durable AuditRecorder to the existing ControlPlaneAuditSink
 * interface. Best-effort: a recorder failure is swallowed so suspend/reactivate/
 * decommission/override/rotate never fail because the audit write failed
 * (consistent with "audit is observability" — orchestrator.ts:30).
 *
 * Actor identity comes from the route layer (where id + role are known), not
 * from the event's free-form `actor` string.
 */
export class DurableControlPlaneAuditSink implements ControlPlaneAuditSink {
  constructor(
    private readonly recorder: AuditRecorder,
    private readonly actor: AuditActor,
  ) {}

  async record(event: ControlPlaneAuditEvent): Promise<void> {
    try {
      await this.recorder.record({
        tenantId: event.tenantId,
        actor: this.actor,
        action: ACTION_MAP[event.action] ?? `lifecycle.${event.action}`,
        outcome: event.outcome,
        resourceType: 'tenant',
        resourceId: event.tenantId,
        details: event.reason ? { reason: event.reason } : undefined,
        error: event.error,
      })
    } catch {
      /* best-effort: audit must never break a control-plane action */
    }
  }
}
