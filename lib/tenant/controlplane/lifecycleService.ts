import type { Tenant, TenantState } from '@/lib/tenant/types'
import { transition } from '@/lib/tenant/stateMachine'
import type { ControlPlaneStore, CredentialRotationStore } from '@/lib/tenant/controlplane/types'
import { TenantNotFoundError, OverrideError } from '@/lib/tenant/controlplane/errors'
import {
  type ControlPlaneAuditSink,
  noopControlPlaneAuditSink,
} from '@/lib/tenant/controlplane/audit'
import type { VaultStore } from '@/lib/tenant/vault'

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Orchestrates the non-provisioning tenant lifecycle: suspend, reactivate,
 * decommission, and a privileged override. Each command validates the transition,
 * persists the new state, and audits the outcome. Only Active is routable, so a
 * suspended/decommissioned tenant is non-routable by construction.
 */
export class TenantLifecycleService {
  constructor(
    private readonly store: ControlPlaneStore & CredentialRotationStore,
    private readonly vault: VaultStore,
    private readonly audit: ControlPlaneAuditSink = noopControlPlaneAuditSink,
  ) {}

  private async loadOrThrow(tenantId: string): Promise<Tenant> {
    const tenant = await this.store.getTenant(tenantId)
    if (!tenant) throw new TenantNotFoundError(tenantId)
    return tenant
  }

  private async run(
    tenantId: string,
    actor: string,
    action: 'suspend' | 'reactivate' | 'decommission',
    to: TenantState,
    after?: (tenant: Tenant) => Promise<void>,
  ): Promise<Tenant> {
    try {
      const tenant = await this.loadOrThrow(tenantId)
      const next = transition(tenant.state, to) // throws InvalidStateTransitionError
      await this.store.setTenantState(tenantId, next)
      if (after) await after(tenant)
      await this.audit.record({ tenantId, actor, action, outcome: 'ok', at: nowIso() })
      return { ...tenant, state: next, updated_at: nowIso() }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await this.audit.record({ tenantId, actor, action, outcome: 'error', error: message, at: nowIso() })
      throw err
    }
  }

  suspend(tenantId: string, actor: string): Promise<Tenant> {
    return this.run(tenantId, actor, 'suspend', 'Suspended')
  }

  reactivate(tenantId: string, actor: string): Promise<Tenant> {
    return this.run(tenantId, actor, 'reactivate', 'Active')
  }

  decommission(tenantId: string, actor: string): Promise<Tenant> {
    return this.run(tenantId, actor, 'decommission', 'Decommissioned', async () => {
      const secretId = await this.store.getVaultSecretId(tenantId)
      if (secretId) {
        await this.vault.delete(secretId)
        await this.store.setVaultSecretId(tenantId, null)
      }
    })
  }

  async override(
    tenantId: string,
    to: TenantState,
    actor: string,
    reason: string,
  ): Promise<Tenant> {
    try {
      if (!reason || reason.trim() === '') {
        throw new OverrideError('A non-empty reason is required for a privileged override')
      }
      const tenant = await this.loadOrThrow(tenantId)
      if (tenant.state === 'Decommissioned') {
        throw new OverrideError('Cannot override a Decommissioned tenant (terminal state)')
      }
      await this.store.setTenantState(tenantId, to)
      await this.audit.record({ tenantId, actor, action: 'override', outcome: 'ok', reason, at: nowIso() })
      return { ...tenant, state: to, updated_at: nowIso() }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await this.audit.record({ tenantId, actor, action: 'override', outcome: 'error', reason, error: message, at: nowIso() })
      throw err
    }
  }
}
