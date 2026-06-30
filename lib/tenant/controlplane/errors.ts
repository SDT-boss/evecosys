/** A control-plane action referenced a tenant that does not exist. */
export class TenantNotFoundError extends Error {
  constructor(public readonly tenantId: string) {
    super(`Tenant not found: ${tenantId}`)
    this.name = 'TenantNotFoundError'
  }
}

/** A privileged override was rejected (e.g. target is a terminal state, or no reason). */
export class OverrideError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OverrideError'
  }
}
