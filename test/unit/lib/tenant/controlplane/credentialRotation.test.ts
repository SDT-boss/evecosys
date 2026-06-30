import { describe, it, expect, vi } from 'vitest'
import { CredentialRotationService } from '@/lib/tenant/controlplane/credentialRotation'
import { TenantNotFoundError } from '@/lib/tenant/controlplane/errors'
import { CredentialValidationError } from '@/lib/tenant/credentials'
import { ConnectivityError } from '@/lib/tenant/probe'
import type { ConnectivityProbe, ProbeResult } from '@/lib/tenant/probe'
import type { VaultStore } from '@/lib/tenant/vault'
import type { ControlPlaneStore, CredentialRotationStore } from '@/lib/tenant/controlplane/types'
import type { ControlPlaneAuditSink } from '@/lib/tenant/controlplane/audit'
import type { BYODBCredentialInput } from '@/lib/tenant/credentials'
import type { Tenant, TenantState } from '@/lib/tenant/types'

const NEW_INPUT: BYODBCredentialInput = {
  kind: 'structured',
  params: { engine: 'postgres', host: 'db', port: 5432, database: 'd', user: 'u', password: 'p' },
}

function tenant(state: TenantState): Tenant {
  return { id: 't1', owner_id: 'o', name: 'T', state, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
}
function makeStore(t: Tenant | null, oldSecret: string | null) {
  return {
    secretId: oldSecret as string | null,
    async getTenant() { return t },
    async setTenantState() {},
    async getVaultSecretId() { return this.secretId },
    async setVaultSecretId(_id: string, s: string | null) { this.secretId = s },
  } satisfies ControlPlaneStore & CredentialRotationStore & { secretId: string | null }
}
function probeOf(r: ProbeResult): ConnectivityProbe { return { probe: vi.fn().mockResolvedValue(r) } }
function vaultOf(): VaultStore & { store: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } {
  return { store: vi.fn().mockResolvedValue({ secretId: 'new-sec' }), delete: vi.fn().mockResolvedValue(undefined) }
}
function audit(): ControlPlaneAuditSink & { events: { outcome: string }[] } {
  const events: { outcome: string }[] = []
  return { events, async record(e) { events.push({ outcome: e.outcome }) } }
}
const fixedId = () => 'uuid-1'

describe('CredentialRotationService.rotate', () => {
  it('validates, stores the new secret under a unique name, swaps the reference, deletes the old', async () => {
    const store = makeStore(tenant('Active'), 'old-sec')
    const vault = vaultOf()
    const svc = new CredentialRotationService(store, probeOf({ reachable: true, ownsSchema: true }), vault, audit(), fixedId)

    const result = await svc.rotate('t1', NEW_INPUT, 'admin@x')

    expect(vault.store).toHaveBeenCalledWith('byodb/t1/uuid-1', expect.any(String))
    expect(store.secretId).toBe('new-sec')
    expect(vault.delete).toHaveBeenCalledWith('old-sec')
    expect(result.secretId).toBe('new-sec')
  })

  it('throws TenantNotFoundError for a missing tenant', async () => {
    const svc = new CredentialRotationService(makeStore(null, null), probeOf({ reachable: true, ownsSchema: true }), vaultOf(), audit(), fixedId)
    await expect(svc.rotate('missing', NEW_INPUT, 'admin@x')).rejects.toThrow(TenantNotFoundError)
  })

  it('refuses to rotate a non-active/suspended tenant', async () => {
    const svc = new CredentialRotationService(makeStore(tenant('Registered'), null), probeOf({ reachable: true, ownsSchema: true }), vaultOf(), audit(), fixedId)
    await expect(svc.rotate('t1', NEW_INPUT, 'admin@x')).rejects.toThrow(/Active or Suspended/)
  })

  it('rejects invalid credentials before probing or storing', async () => {
    const probe = probeOf({ reachable: true, ownsSchema: true })
    const vault = vaultOf()
    const svc = new CredentialRotationService(makeStore(tenant('Active'), 'old-sec'), probe, vault, audit(), fixedId)
    const bad: BYODBCredentialInput = { kind: 'structured', params: { engine: 'postgres', host: '', port: 5432, database: 'd', user: 'u', password: 'p' } }
    await expect(svc.rotate('t1', bad, 'admin@x')).rejects.toThrow(CredentialValidationError)
    expect(probe.probe).not.toHaveBeenCalled()
    expect(vault.store).not.toHaveBeenCalled()
  })

  it('throws ConnectivityError and stores nothing when the new credential is unreachable', async () => {
    const vault = vaultOf()
    const svc = new CredentialRotationService(makeStore(tenant('Active'), 'old-sec'), probeOf({ reachable: false, ownsSchema: false }), vault, audit(), fixedId)
    await expect(svc.rotate('t1', NEW_INPUT, 'admin@x')).rejects.toThrow(ConnectivityError)
    expect(vault.store).not.toHaveBeenCalled()
  })

  it('rolls back the new secret and keeps the old reference when persisting the new id fails', async () => {
    const store = makeStore(tenant('Active'), 'old-sec')
    const vault = vaultOf()
    store.setVaultSecretId = vi.fn().mockRejectedValueOnce(new Error('db down'))
    const svc = new CredentialRotationService(store, probeOf({ reachable: true, ownsSchema: true }), vault, audit(), fixedId)

    await expect(svc.rotate('t1', NEW_INPUT, 'admin@x')).rejects.toThrow('db down')
    expect(vault.delete).toHaveBeenCalledWith('new-sec')
    expect(vault.delete).not.toHaveBeenCalledWith('old-sec')
  })
})
