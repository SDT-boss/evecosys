import {
  normalizeCredential,
  type BYODBCredentialInput,
} from '@/lib/tenant/credentials'
import { type ConnectivityProbe, ConnectivityError } from '@/lib/tenant/probe'
import type { VaultStore } from '@/lib/tenant/vault'
import { transition, transitionTenant } from '@/lib/tenant/stateMachine'
import type { Tenant } from '@/lib/tenant/types'
import { ProvisioningRollbackError } from '@/lib/tenant/types'

export interface RegistrationResult {
  tenant: Tenant
  secretId: string
}

/**
 * BYODBRegistrationService
 *
 * Orchestrates the BYODB credential registration workflow:
 *
 * 1. Guard — tenant must be in Provisioning state.
 * 2. Parse  — normalizeCredential validates and normalises the input.
 * 3. Probe  — real connectivity probe before any storage (BYODB-02).
 * 4. Store  — valid credentials written to Supabase Vault (BYODB-04).
 * 5. Transition — tenant moves Provisioning → Active (BYODB-05).
 * 6. Rollback — if step 5 throws, the stored secret is deleted before
 *    re-throwing so no orphaned secrets are left in the Vault.
 *
 * Credentials (params / input) are never logged or included in error messages.
 */
export class BYODBRegistrationService {
  constructor(
    private readonly probe: ConnectivityProbe,
    private readonly vault: VaultStore,
  ) {}

  async register(tenant: Tenant, input: BYODBCredentialInput): Promise<RegistrationResult> {
    // Step 1 — state guard
    if (tenant.state !== 'Provisioning') {
      throw new ConnectivityError(
        `Tenant ${tenant.id} must be in Provisioning to register credentials, got ${tenant.state}`,
      )
    }

    // Step 2 — normalise + validate input (CredentialValidationError propagates naturally)
    const params = normalizeCredential(input)

    // Step 3 — connectivity probe (must pass before anything is stored)
    const result = await this.probe.probe(params)
    if (!result.reachable || !result.ownsSchema) {
      throw new ConnectivityError(
        `BYODB connectivity probe failed for tenant ${tenant.id}: ${
          result.error ?? (!result.reachable ? 'unreachable' : 'no schema ownership')
        }`,
      )
    }

    // Step 4 — store in Vault (serialise the normalised params; password travels only here)
    const stored = await this.vault.store(`byodb/${tenant.id}`, JSON.stringify(params))

    // Step 5 — transition with rollback if anything after store fails
    try {
      const nextState = transition(tenant.state, 'Active')
      return {
        tenant: { ...tenant, state: nextState, updated_at: new Date().toISOString() },
        secretId: stored.secretId,
      }
    } catch (originalErr) {
      // Rollback: reset state to Registered in memory (explicit + testable intent)
      transitionTenant(tenant, 'Registered')

      // Clean up the orphaned Vault secret; wrap a dual failure in ProvisioningRollbackError
      try {
        await this.vault.delete(stored.secretId)
      } catch (rollbackErr) {
        throw new ProvisioningRollbackError(
          originalErr instanceof Error ? originalErr : new Error(String(originalErr)),
          rollbackErr instanceof Error ? rollbackErr : new Error(String(rollbackErr)),
        )
      }
      throw originalErr
    }
  }
}
