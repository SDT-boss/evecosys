import type { ProvisioningStepName } from '@/lib/tenant/provisioning/types'

/**
 * A single provisioning audit event. Never include credentials or secret VALUES —
 * `secretId` references are acceptable, raw secrets are not.
 */
export interface ProvisioningAuditEvent {
  tenantId: string
  runId: string
  step?: ProvisioningStepName
  action: string
  outcome: 'ok' | 'error'
  error?: string
  at: string
}

/** Sink for provisioning audit events. EVE-55 will provide a durable implementation. */
export interface AuditSink {
  record(event: ProvisioningAuditEvent): Promise<void>
}

/** No-op default — provisioning works without a durable audit log (EVE-55). */
export const noopAuditSink: AuditSink = {
  async record() {
    /* intentionally empty until EVE-55 */
  },
}
