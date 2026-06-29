/** Transient failure — the orchestrator should retry up to the step's maxAttempts. */
export class RetryableProvisioningError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RetryableProvisioningError'
  }
}

/** Failure that needs an operator. The run halts at AwaitingManualIntervention; no rollback. */
export class ManualInterventionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManualInterventionError'
  }
}

/** The readiness gate found a missing/invalid artifact. Fatal → rollback. */
export class ReadinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReadinessError'
  }
}

/**
 * Classify a thrown value into orchestrator behaviour.
 * - retryable: retry until maxAttempts, then treat as fatal
 * - manual: stop the run for operator intervention, no rollback
 * - neither (fatal): roll back completed steps
 */
export function classifyError(err: unknown): { retryable: boolean; manual: boolean } {
  if (err instanceof RetryableProvisioningError) return { retryable: true, manual: false }
  if (err instanceof ManualInterventionError) return { retryable: false, manual: true }
  return { retryable: false, manual: false }
}
