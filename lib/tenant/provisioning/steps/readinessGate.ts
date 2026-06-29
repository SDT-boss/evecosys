import type { ProvisioningStep, ProvisioningContext, ProvisioningDb } from '@/lib/tenant/provisioning/types'
import { ReadinessError } from '@/lib/tenant/provisioning/errors'
import { DEFAULT_FEATURE_FLAGS } from '@/lib/tenant/provisioning/constants'

/**
 * readiness_gate — verify every provisioning artifact exists before activation.
 * Read-only: performs no writes, so it never needs compensation. Fails the run
 * (ReadinessError → fatal → rollback) if any check fails.
 */
export function createReadinessGateStep(db: ProvisioningDb): ProvisioningStep {
  return {
    name: 'readiness_gate',
    maxAttempts: 1,

    async run(ctx: ProvisioningContext): Promise<void> {
      const failures: string[] = []

      if (!ctx.secretId) failures.push('BYODB secret not bound')

      if (!(await db.hasConfig(ctx.tenant.id))) failures.push('tenant_config missing')
      if (!(await db.hasMetering(ctx.tenant.id))) failures.push('tenant_storage_metering missing')

      const flags = await db.getFeatureFlags(ctx.tenant.id)
      if (!flags) {
        failures.push('feature_flags missing')
      } else {
        const missing = Object.keys(DEFAULT_FEATURE_FLAGS).filter((k) => !(k in flags))
        if (missing.length > 0) failures.push(`feature_flags missing keys: ${missing.join(', ')}`)
      }

      if (failures.length > 0) {
        throw new ReadinessError(
          `Tenant ${ctx.tenant.id} not ready for activation: ${failures.join('; ')}`,
        )
      }
    },

    async compensate(): Promise<void> {
      /* no-op: read-only gate */
    },
  }
}
