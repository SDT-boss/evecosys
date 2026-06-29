import type { ProvisioningStep, ProvisioningContext, ProvisioningDb } from '@/lib/tenant/provisioning/types'
import { DEFAULT_QUOTA_BYTES } from '@/lib/tenant/provisioning/constants'

/** bootstrap_metering — create the tenant's zeroed storage-metering row + quota. */
export function createBootstrapMeteringStep(db: ProvisioningDb): ProvisioningStep {
  return {
    name: 'bootstrap_metering',
    maxAttempts: 2,
    async run(ctx: ProvisioningContext): Promise<void> {
      await db.initMetering(ctx.tenant.id, DEFAULT_QUOTA_BYTES)
    },
    async compensate(ctx: ProvisioningContext): Promise<void> {
      await db.deleteMetering(ctx.tenant.id)
    },
  }
}
