export const TENANT_STATES = [
  'Registered',
  'Provisioning',
  'Active',
  'Suspended',
  'Decommissioned',
] as const

export type TenantState = (typeof TENANT_STATES)[number]

export const INITIAL_TENANT_STATE: TenantState = 'Registered'

export interface Tenant {
  id: string
  owner_id: string
  state: TenantState
  created_at: string
  updated_at: string
}

export interface DatabaseClient {
  getUser(): Promise<{ user: { id: string } | null; error: Error | null }>
  getTenantRow(tenantId: string): Promise<{ data: Tenant | null; error: Error | null }>
}

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly from: TenantState,
    public readonly to: TenantState,
  ) {
    super(`Invalid tenant state transition: ${from} → ${to}`)
    this.name = 'InvalidStateTransitionError'
  }
}

export class AuthSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthSessionError'
  }
}

export class TenantAccessError extends Error {
  constructor(
    public readonly requestedTenantId: string,
    public readonly authenticatedUserId: string,
  ) {
    super(`Access denied: user ${authenticatedUserId} does not own tenant ${requestedTenantId}`)
    this.name = 'TenantAccessError'
  }
}
