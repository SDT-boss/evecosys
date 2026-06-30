import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type AuditRecorder,
  type AuditRecordInput,
  AuditValidationError,
  AuditWriteError,
  isUuid,
} from '@/lib/audit/types'
import { redactSensitive } from '@/lib/audit/redact'

/**
 * Strict, durable audit recorder. Validates required metadata, redacts sensitive
 * fields, and inserts one row into public.audit_logs. The DB trigger fills
 * seq/prev_hash/row_hash/created_at — the application never computes the chain.
 *
 * Pass a SERVICE-ROLE client: writes must succeed regardless of the actor's RLS
 * scope, and the append-only trigger still guarantees tamper-evidence even for
 * the service role (RLS is bypassed; triggers are not).
 *
 * This recorder THROWS on bad input or write failure so it is fully testable.
 * Integration call-sites wrap it in a best-effort adapter (Tasks 5, 6, 8).
 */
export class SupabaseAuditRecorder implements AuditRecorder {
  constructor(private readonly client: SupabaseClient) {}

  async record(input: AuditRecordInput): Promise<void> {
    if (!input.tenantId) throw new AuditValidationError('audit: tenantId is required')
    if (!input.action) throw new AuditValidationError('audit: action is required')
    if (!input.actor || !input.actor.label) {
      throw new AuditValidationError('audit: actor.label is required')
    }
    if (!input.actor.role) throw new AuditValidationError('audit: actor.role is required')
    if (input.outcome !== 'ok' && input.outcome !== 'error') {
      throw new AuditValidationError(`audit: invalid outcome ${String(input.outcome)}`)
    }

    const { error } = await this.client.from('audit_logs').insert({
      tenant_id: input.tenantId,
      actor_id: isUuid(input.actor.id) ? input.actor.id : null,
      actor_label: input.actor.label,
      actor_role: input.actor.role,
      action: input.action,
      outcome: input.outcome,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      details: input.details ? redactSensitive(input.details) : null,
      error: input.error ?? null,
    })

    if (error) throw new AuditWriteError(`audit: insert failed — ${error.message}`)
  }
}
