import type { AuditRecorder, AuditRecordInput } from '@/lib/audit/types'

/**
 * Best-effort audit write for route call-sites that don't go through a sink
 * adapter (e.g. board config changes). Swallows all errors so the user-facing
 * operation is never broken by an audit failure.
 */
export async function safeRecord(recorder: AuditRecorder, input: AuditRecordInput): Promise<void> {
  try {
    await recorder.record(input)
  } catch {
    /* best-effort: audit is observability, not a blocking dependency */
  }
}
