import { normalizeCredential, type BYODBCredentialInput } from '@/lib/tenant/credentials'
import { type ConnectivityProbe, ConnectivityError } from '@/lib/tenant/probe'
import type { VaultStore } from '@/lib/tenant/vault'
import type { ControlPlaneStore, CredentialRotationStore } from '@/lib/tenant/controlplane/types'
import { TenantNotFoundError } from '@/lib/tenant/controlplane/errors'
import {
  type ControlPlaneAuditSink,
  noopControlPlaneAuditSink,
} from '@/lib/tenant/controlplane/audit'

function nowIso(): string {
  return new Date().toISOString()
}

export interface RotationResult {
  secretId: string
}

/**
 * Rotates a tenant's BYODB credential safely: validate + probe the new credential,
 * store it under a fresh unique Vault name, swap the tenant's vault_secret_id, then
 * delete the old secret. If the swap fails after the new secret is stored, the new
 * secret is deleted and the old reference is left intact. Credentials are never
 * logged or placed in audit events.
 */
export class CredentialRotationService {
  constructor(
    private readonly store: ControlPlaneStore & CredentialRotationStore,
    private readonly probe: ConnectivityProbe,
    private readonly vault: VaultStore,
    private readonly audit: ControlPlaneAuditSink = noopControlPlaneAuditSink,
    private readonly makeId: () => string = () => crypto.randomUUID(),
  ) {}

  async rotate(tenantId: string, input: BYODBCredentialInput, actor: string): Promise<RotationResult> {
    try {
      const tenant = await this.store.getTenant(tenantId)
      if (!tenant) throw new TenantNotFoundError(tenantId)
      if (tenant.state !== 'Active' && tenant.state !== 'Suspended') {
        throw new ConnectivityError(
          `Tenant ${tenantId} must be Active or Suspended to rotate credentials, got ${tenant.state}`,
        )
      }

      const params = normalizeCredential(input) // throws CredentialValidationError

      const result = await this.probe.probe(params)
      if (!result.reachable || !result.ownsSchema) {
        throw new ConnectivityError(
          `New BYODB credential failed validation for tenant ${tenantId}: ${
            result.error ?? (!result.reachable ? 'unreachable' : 'no schema ownership')
          }`,
        )
      }

      const oldSecretId = await this.store.getVaultSecretId(tenantId)
      const stored = await this.vault.store(`byodb/${tenantId}/${this.makeId()}`, JSON.stringify(params))

      try {
        await this.store.setVaultSecretId(tenantId, stored.secretId)
      } catch (swapErr) {
        await this.vault.delete(stored.secretId).catch(() => undefined)
        throw swapErr
      }

      if (oldSecretId) {
        await this.vault.delete(oldSecretId).catch(() => undefined)
      }

      await this.audit.record({ tenantId, actor, action: 'rotate_credentials', outcome: 'ok', at: nowIso() })
      return { secretId: stored.secretId }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await this.audit.record({ tenantId, actor, action: 'rotate_credentials', outcome: 'error', error: message, at: nowIso() })
      throw err
    }
  }
}
