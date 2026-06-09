import {
  type TenantState,
  type Tenant,
  InvalidStateTransitionError,
} from '@/lib/tenant/types'

export const TRANSITIONS: Record<TenantState, readonly TenantState[]> = {
  Registered: ['Provisioning'],
  Provisioning: ['Active', 'Registered'], // Active on success; Registered on rollback
  Active: ['Suspended', 'Decommissioned'],
  Suspended: ['Active', 'Decommissioned'],
  Decommissioned: [], // terminal
}

export function canTransition(from: TenantState, to: TenantState): boolean {
  return TRANSITIONS[from].includes(to)
}

/**
 * Pure, synchronous transition. Returns the next state on success.
 * Throws InvalidStateTransitionError on an invalid transition.
 * Performs NO database writes — validation runs entirely in-memory.
 */
export function transition(from: TenantState, to: TenantState): TenantState {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to)
  }
  return to
}

/**
 * Returns a NEW Tenant object with the next state. Does not mutate input.
 * Throws InvalidStateTransitionError without mutating on invalid transition.
 */
export function transitionTenant(tenant: Tenant, to: TenantState): Tenant {
  const next = transition(tenant.state, to)
  return { ...tenant, state: next, updated_at: new Date().toISOString() }
}
