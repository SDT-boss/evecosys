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
  state: TenantState
  created_at: string
  updated_at: string
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
