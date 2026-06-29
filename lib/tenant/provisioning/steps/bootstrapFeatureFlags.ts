import type { ProvisioningStep, ProvisioningContext, ProvisioningDb } from '@/lib/tenant/provisioning/types'
import { DEFAULT_FEATURE_FLAGS } from '@/lib/tenant/provisioning/constants'

/**
 * bootstrap_feature_flags — write the canonical default feature-flag set so
 * provisioning is the source of truth (idempotent; safe to re-run).
 * Compensation is a no-op: flags are non-routable metadata on the tenant row.
 */
export function createBootstrapFeatureFlagsStep(db: ProvisioningDb): ProvisioningStep {
  return {
    name: 'bootstrap_feature_flags',
    maxAttempts: 2,
    async run(ctx: ProvisioningContext): Promise<void> {
      await db.setFeatureFlags(ctx.tenant.id, DEFAULT_FEATURE_FLAGS)
    },
    async compensate(): Promise<void> {
      /* no-op: flags carry no routing meaning and are reset on re-provision */
    },
  }
}
