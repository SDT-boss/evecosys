import type { ProvisioningStep, ProvisioningContext, ProvisioningDb } from '@/lib/tenant/provisioning/types'
import { transition } from '@/lib/tenant/stateMachine'

/**
 * activate — the ONLY step that makes a tenant routable. Validates the transition
 * with the state machine, then persists Active. Compensation reverts to Provisioning
 * so rollback can never leave a tenant Active.
 */
export function createActivateStep(db: ProvisioningDb): ProvisioningStep {
  return {
    name: 'activate',
    maxAttempts: 2,
    async run(ctx: ProvisioningContext): Promise<void> {
      const next = transition(ctx.tenant.state, 'Active')
      await db.setTenantState(ctx.tenant.id, next)
    },
    async compensate(ctx: ProvisioningContext): Promise<void> {
      await db.setTenantState(ctx.tenant.id, 'Provisioning')
    },
  }
}
