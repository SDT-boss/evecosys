import { normalizeCredential } from '@/lib/tenant/credentials'
import type { ConnectivityProbe } from '@/lib/tenant/probe'
import type { VaultStore } from '@/lib/tenant/vault'
import type { ProvisioningStep, ProvisioningContext } from '@/lib/tenant/provisioning/types'
import {
  RetryableProvisioningError,
  ManualInterventionError,
} from '@/lib/tenant/provisioning/errors'

/**
 * bind_byodb — validate + connectivity-probe BYODB credentials, then store them in
 * Vault. Writes the resulting secretId onto ctx. Does NOT change tenant state.
 *
 * Error mapping:
 *   - invalid input        → CredentialValidationError (fatal, thrown by normalize)
 *   - unreachable database  → RetryableProvisioningError (transient)
 *   - no schema ownership   → ManualInterventionError (operator must grant access)
 */
export function createBindByodbStep(probe: ConnectivityProbe, vault: VaultStore): ProvisioningStep {
  return {
    name: 'bind_byodb',
    maxAttempts: 3,

    async run(ctx: ProvisioningContext): Promise<void> {
      const params = normalizeCredential(ctx.byodbInput)

      const result = await probe.probe(params)
      if (!result.reachable) {
        throw new RetryableProvisioningError(
          `BYODB unreachable for tenant ${ctx.tenant.id}: ${result.error ?? 'unreachable'}`,
        )
      }
      if (!result.ownsSchema) {
        throw new ManualInterventionError(
          `BYODB for tenant ${ctx.tenant.id} reachable but lacks schema ownership`,
        )
      }

      const stored = await vault.store(`byodb/${ctx.tenant.id}`, JSON.stringify(params))
      ctx.secretId = stored.secretId
    },

    async compensate(ctx: ProvisioningContext): Promise<void> {
      if (ctx.secretId) {
        await vault.delete(ctx.secretId)
      }
    },
  }
}
