import { normalizeCredential } from '@/lib/tenant/credentials'
import type { ConnectivityProbe } from '@/lib/tenant/probe'
import type { VaultStore } from '@/lib/tenant/vault'
import type { ProvisioningStep, ProvisioningContext } from '@/lib/tenant/provisioning/types'
import {
  RetryableProvisioningError,
  ManualInterventionError,
} from '@/lib/tenant/provisioning/errors'

/**
 * bind_byodb — validate + connectivity-probe BYODB credentials, store them in Vault,
 * and (optionally) persist the resulting secret id on the tenant so rotation and
 * decommission can later reference / delete it. Does NOT change tenant state.
 *
 * `persistSecretId` is optional: when omitted (the EVE-45 default) the step behaves
 * exactly as before. buildOrchestrator wires it to SupabaseProvisioningDb.setVaultSecretId.
 */
export function createBindByodbStep(
  probe: ConnectivityProbe,
  vault: VaultStore,
  persistSecretId?: (tenantId: string, secretId: string | null) => Promise<void>,
): ProvisioningStep {
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
      if (persistSecretId) await persistSecretId(ctx.tenant.id, stored.secretId)
    },

    async compensate(ctx: ProvisioningContext): Promise<void> {
      if (ctx.secretId) {
        if (persistSecretId) await persistSecretId(ctx.tenant.id, null)
        await vault.delete(ctx.secretId)
      }
    },
  }
}
