import type { ProvisioningStep, ProvisioningContext, ProvisioningDb } from '@/lib/tenant/provisioning/types'
import { DEFAULT_TENANT_CONFIG } from '@/lib/tenant/provisioning/constants'

/** seed_config — insert the tenant's default configuration row. */
export function createSeedConfigStep(db: ProvisioningDb): ProvisioningStep {
  return {
    name: 'seed_config',
    maxAttempts: 2,
    async run(ctx: ProvisioningContext): Promise<void> {
      await db.seedConfig(ctx.tenant.id, DEFAULT_TENANT_CONFIG)
    },
    async compensate(ctx: ProvisioningContext): Promise<void> {
      await db.deleteConfig(ctx.tenant.id)
    },
  }
}
