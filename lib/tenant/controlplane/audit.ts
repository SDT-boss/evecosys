import type { LifecycleAction } from '@/lib/tenant/controlplane/types'

/**
 * A control-plane audit event. NEVER include credentials or secret VALUES —
 * a `vault_secret_id` reference is acceptable, raw secrets are not.
 */
export interface ControlPlaneAuditEvent {
  tenantId: string
  actor: string
  action: LifecycleAction | 'rotate_credentials' | 'read_config'
  outcome: 'ok' | 'error'
  reason?: string
  error?: string
  at: string
}

/** Sink for control-plane audit events. EVE-55 provides a durable implementation. */
export interface ControlPlaneAuditSink {
  record(event: ControlPlaneAuditEvent): Promise<void>
}

/** No-op default — control-plane actions work without a durable audit log (EVE-55). */
export const noopControlPlaneAuditSink: ControlPlaneAuditSink = {
  async record() {
    /* intentionally empty until EVE-55 */
  },
}
