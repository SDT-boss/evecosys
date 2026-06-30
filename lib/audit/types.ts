/**
 * Shared audit-logging contracts (EVE-55).
 *
 * An audit record attributes a single sensitive platform action to an actor,
 * within a tenant context, with an outcome. Raw secrets/credentials must NEVER
 * appear in `details` — the recorder redacts known-sensitive keys defensively,
 * but callers must not pass secret VALUES in the first place.
 */

/** The acting principal, captured at the route layer where identity is known. */
export interface AuditActor {
  /** auth.uid() of the actor, when known. Stored verbatim (no FK — forensic). */
  id: string
  /** Human-readable identifier snapshot (email or id). Immutable in the record. */
  label: string
  /** Role snapshot at action time, e.g. 'platform_admin' | 'board'. */
  role: string
}

/** Namespaced action taxonomy. Free-form string, these are the known values. */
export type AuditAction =
  | 'provisioning.run.start'
  | 'provisioning.run.complete'
  | 'provisioning.run.rollback'
  | 'provisioning.run.manual'
  | 'provisioning.step.complete'
  | 'provisioning.step.retry'
  | 'provisioning.step.fail'
  | 'provisioning.compensate.fail'
  | 'lifecycle.suspend'
  | 'lifecycle.reactivate'
  | 'lifecycle.decommission'
  | 'lifecycle.override'
  | 'credentials.rotate'
  | 'config.branding'
  | 'config.feature_flags'
  | 'config.byodb_register'
  | 'config.read'

/** A normalized, ready-to-persist audit record (before hash-chain enrichment). */
export interface AuditRecordInput {
  tenantId: string
  actor: AuditActor
  action: AuditAction | string
  outcome: 'ok' | 'error'
  resourceType?: string
  resourceId?: string
  details?: Record<string, unknown>
  error?: string
}

/** Strict writer. Throws AuditValidationError on bad input, on DB/write failure. */
export interface AuditRecorder {
  record(input: AuditRecordInput): Promise<void>
}

/** Thrown when a record is missing required metadata or has an invalid outcome. */
export class AuditValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuditValidationError'
  }
}

/** Thrown when the underlying insert fails. */
export class AuditWriteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuditWriteError'
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True when `value` is a canonical UUID string. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
