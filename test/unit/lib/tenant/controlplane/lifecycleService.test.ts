import { describe, it, expect, vi } from 'vitest'
import { TenantLifecycleService } from '@/lib/tenant/controlplane/lifecycleService'
import { TenantNotFoundError, OverrideError } from '@/lib/tenant/controlplane/errors'
import { InvalidStateTransitionError } from '@/lib/tenant/types'
import type { ControlPlaneStore, CredentialRotationStore } from '@/lib/tenant/controlplane/types'
import type { ControlPlaneAuditSink } from '@/lib/tenant/controlplane/audit'
import type { VaultStore } from '@/lib/tenant/vault'
import type { Tenant, TenantState } from '@/lib/tenant/types'

function tenant(state: TenantState): Tenant {
  return { id: 't1', owner_id: 'o', name: 'T', state, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
}

function makeStore(initial: Tenant | null): ControlPlaneStore & CredentialRotationStore & { state: TenantState | null; secretId: string | null } {
  let current = initial
  return {
    state: initial?.state ?? null,
    secretId: 'sec-1',
    async getTenant() { return current },
    async setTenantState(_id, s) { if (current) current = { ...current, state: s }; this.state = s },
    async getVaultSecretId() { return this.secretId },
    async setVaultSecretId(_id, s) { this.secretId = s },
  }
}

function makeAudit(): ControlPlaneAuditSink & { events: { action: string; outcome: string; reason?: string; error?: string }[] } {
  const events: { action: string; outcome: string; reason?: string; error?: string }[] = []
  return { events, async record(e) { events.push({ action: e.action, outcome: e.outcome, reason: e.reason, error: e.error }) } }
}

function makeVault(): VaultStore & { delete: ReturnType<typeof vi.fn> } {
  return { store: vi.fn(), delete: vi.fn().mockResolvedValue(undefined) }
}

describe('TenantLifecycleService', () => {
  it('suspend transitions Active → Suspended, persists, and audits ok', async () => {
    const store = makeStore(tenant('Active'))
    const audit = makeAudit()
    const svc = new TenantLifecycleService(store, makeVault(), audit)

    const result = await svc.suspend('t1', 'admin@x')

    expect(result.state).toBe('Suspended')
    expect(store.state).toBe('Suspended')
    expect(audit.events).toContainEqual({ action: 'suspend', outcome: 'ok', reason: undefined, error: undefined })
  })

  it('reactivate transitions Suspended → Active', async () => {
    const store = makeStore(tenant('Suspended'))
    const svc = new TenantLifecycleService(store, makeVault(), makeAudit())
    expect((await svc.reactivate('t1', 'admin@x')).state).toBe('Active')
  })

  it('suspend on a non-Active tenant throws InvalidStateTransitionError and audits error', async () => {
    const store = makeStore(tenant('Registered'))
    const audit = makeAudit()
    const svc = new TenantLifecycleService(store, makeVault(), audit)
    await expect(svc.suspend('t1', 'admin@x')).rejects.toThrow(InvalidStateTransitionError)
    expect(audit.events.at(-1)?.outcome).toBe('error')
    expect(store.state).toBe('Registered') // unchanged
  })

  it('throws TenantNotFoundError when the tenant does not exist', async () => {
    const svc = new TenantLifecycleService(makeStore(null), makeVault(), makeAudit())
    await expect(svc.suspend('missing', 'admin@x')).rejects.toThrow(TenantNotFoundError)
  })

  it('decommission transitions, deletes the vault secret, and clears the reference', async () => {
    const store = makeStore(tenant('Suspended'))
    const vault = makeVault()
    const svc = new TenantLifecycleService(store, vault, makeAudit())
    const result = await svc.decommission('t1', 'admin@x')
    expect(result.state).toBe('Decommissioned')
    expect(vault.delete).toHaveBeenCalledWith('sec-1')
    expect(store.secretId).toBeNull()
  })

  it('override sets a target state with a reason and audits the reason', async () => {
    const store = makeStore(tenant('Provisioning'))
    const audit = makeAudit()
    const svc = new TenantLifecycleService(store, makeVault(), audit)
    const result = await svc.override('t1', 'Decommissioned', 'admin@x', 'stuck provisioning run')
    expect(result.state).toBe('Decommissioned')
    expect(audit.events.at(-1)).toMatchObject({ action: 'override', outcome: 'ok', reason: 'stuck provisioning run' })
  })

  it('override rejects an empty reason', async () => {
    const svc = new TenantLifecycleService(makeStore(tenant('Active')), makeVault(), makeAudit())
    await expect(svc.override('t1', 'Suspended', 'admin@x', '   ')).rejects.toThrow(OverrideError)
  })

  it('override cannot resurrect a Decommissioned tenant', async () => {
    const svc = new TenantLifecycleService(makeStore(tenant('Decommissioned')), makeVault(), makeAudit())
    await expect(svc.override('t1', 'Active', 'admin@x', 'oops')).rejects.toThrow(OverrideError)
  })
})
