import { describe, it, expect, vi } from 'vitest'
import { BYODBRegistrationService } from '@/lib/tenant/registrationService'
import type { ConnectivityProbe, ProbeResult } from '@/lib/tenant/probe'
import type { VaultStore, StoredSecret } from '@/lib/tenant/vault'
import { VaultStorageError } from '@/lib/tenant/vault'
import type { Tenant } from '@/lib/tenant/types'
import { InvalidStateTransitionError, ProvisioningRollbackError } from '@/lib/tenant/types'
import type { BYODBCredentialInput } from '@/lib/tenant/credentials'

// ---------------------------------------------------------------------------
// Helpers — minimal fakes satisfying ConnectivityProbe and VaultStore interfaces.
// These never load pg or mysql2.
// ---------------------------------------------------------------------------

function makeProbe(result: ProbeResult): ConnectivityProbe {
  return { probe: vi.fn().mockResolvedValue(result) }
}

function makeVault(secretId = 'secret-uuid-1'): VaultStore & {
  store: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
} {
  return {
    store: vi.fn().mockResolvedValue({ secretId } satisfies StoredSecret),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

const PROVISIONING_TENANT: Tenant = {
  id: 'tenant-abc',
  owner_id: 'owner-abc',
  state: 'Provisioning',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const ACTIVE_TENANT: Tenant = { ...PROVISIONING_TENANT, state: 'Active' }

const VALID_STRUCTURED_INPUT: BYODBCredentialInput = {
  kind: 'structured',
  params: {
    engine: 'postgres',
    host: 'db.example.com',
    port: 5432,
    database: 'mydb',
    user: 'alice',
    password: 'hunter2',
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BYODBRegistrationService rollback', () => {
  // ROLLBACK-01: post-store failure triggers vault.delete
  it('calls vault.delete with the stored secretId when a post-store transition fails', async () => {
    const stateMachineMod = await import('@/lib/tenant/stateMachine')
    const vault = makeVault('rollback-secret-id')
    const probe = makeProbe({ reachable: true, ownsSchema: true })
    const svc = new BYODBRegistrationService(probe, vault)

    const spy = vi.spyOn(stateMachineMod, 'transition').mockImplementationOnce(() => {
      throw new InvalidStateTransitionError('Provisioning', 'Active')
    })

    await expect(svc.register(PROVISIONING_TENANT, VALID_STRUCTURED_INPUT)).rejects.toThrow(
      InvalidStateTransitionError,
    )

    expect(vault.store).toHaveBeenCalledOnce()
    expect(vault.delete).toHaveBeenCalledOnce()
    expect(vault.delete).toHaveBeenCalledWith('rollback-secret-id')

    spy.mockRestore()
  })

  // ROLLBACK-01 (clean exit): pre-store probe failure never reaches vault.delete
  it('does NOT call vault.delete when the connectivity probe fails (pre-store)', async () => {
    const vault = makeVault()
    const probe = makeProbe({ reachable: false, ownsSchema: false })
    const svc = new BYODBRegistrationService(probe, vault)

    await expect(svc.register(PROVISIONING_TENANT, VALID_STRUCTURED_INPUT)).rejects.toThrow()

    expect(vault.store).not.toHaveBeenCalled()
    expect(vault.delete).not.toHaveBeenCalled()
  })

  // ROLLBACK-01 (clean exit): state guard rejection never reaches vault.delete
  it('does NOT call vault.delete when the state guard rejects a non-Provisioning tenant', async () => {
    const vault = makeVault()
    const probe = makeProbe({ reachable: true, ownsSchema: true })
    const svc = new BYODBRegistrationService(probe, vault)

    await expect(svc.register(ACTIVE_TENANT, VALID_STRUCTURED_INPUT)).rejects.toThrow()

    expect(vault.store).not.toHaveBeenCalled()
    expect(vault.delete).not.toHaveBeenCalled()
  })

  // ROLLBACK-02: rollback calls transitionTenant(tenant, 'Registered') in memory
  it("invokes transitionTenant(tenant, 'Registered') during rollback", async () => {
    const stateMachineMod = await import('@/lib/tenant/stateMachine')
    const vault = makeVault('rollback-secret-id')
    const probe = makeProbe({ reachable: true, ownsSchema: true })
    const svc = new BYODBRegistrationService(probe, vault)

    const transitionSpy = vi.spyOn(stateMachineMod, 'transitionTenant')
    const transitionSpy2 = vi.spyOn(stateMachineMod, 'transition').mockImplementationOnce(() => {
      throw new InvalidStateTransitionError('Provisioning', 'Active')
    })

    await expect(svc.register(PROVISIONING_TENANT, VALID_STRUCTURED_INPUT)).rejects.toThrow()

    expect(transitionSpy).toHaveBeenCalledOnce()
    expect(transitionSpy).toHaveBeenCalledWith(PROVISIONING_TENANT, 'Registered')

    transitionSpy.mockRestore()
    transitionSpy2.mockRestore()
  })

  // ROLLBACK-03: when vault.delete succeeds, re-throw original error unchanged
  it('re-throws the original error (not wrapped) when vault.delete succeeds during rollback', async () => {
    const stateMachineMod = await import('@/lib/tenant/stateMachine')
    const vault = makeVault('rollback-secret-id')
    const probe = makeProbe({ reachable: true, ownsSchema: true })
    const svc = new BYODBRegistrationService(probe, vault)

    const originalError = new InvalidStateTransitionError('Provisioning', 'Active')
    const spy = vi.spyOn(stateMachineMod, 'transition').mockImplementationOnce(() => {
      throw originalError
    })

    const thrownError = await svc.register(PROVISIONING_TENANT, VALID_STRUCTURED_INPUT).catch(e => e)

    expect(thrownError).toBe(originalError)
    expect(thrownError).toBeInstanceOf(InvalidStateTransitionError)

    spy.mockRestore()
  })

  // ROLLBACK-03: when vault.delete also fails, throw ProvisioningRollbackError wrapping both
  it('throws ProvisioningRollbackError wrapping both errors when vault.delete also fails', async () => {
    const stateMachineMod = await import('@/lib/tenant/stateMachine')
    const vaultDeleteError = new VaultStorageError('vault gone')
    const vault: VaultStore = {
      store: vi.fn().mockResolvedValue({ secretId: 'rollback-secret-id' } satisfies StoredSecret),
      delete: vi.fn().mockRejectedValue(vaultDeleteError),
    }
    const probe = makeProbe({ reachable: true, ownsSchema: true })
    const svc = new BYODBRegistrationService(probe, vault)

    const spy = vi.spyOn(stateMachineMod, 'transition').mockImplementationOnce(() => {
      throw new InvalidStateTransitionError('Provisioning', 'Active')
    })

    await expect(svc.register(PROVISIONING_TENANT, VALID_STRUCTURED_INPUT)).rejects.toBeInstanceOf(
      ProvisioningRollbackError,
    )

    await svc
      .register(PROVISIONING_TENANT, VALID_STRUCTURED_INPUT)
      .catch(e => e)

    // The spy was already consumed — restore and re-spy for the second call
    spy.mockRestore()
    const spy2 = vi.spyOn(stateMachineMod, 'transition').mockImplementationOnce(() => {
      throw new InvalidStateTransitionError('Provisioning', 'Active')
    })

    const dualError = await svc.register(PROVISIONING_TENANT, VALID_STRUCTURED_INPUT).catch(e => e)

    expect(dualError).toBeInstanceOf(ProvisioningRollbackError)
    expect((dualError as ProvisioningRollbackError).originalError).toBeInstanceOf(
      InvalidStateTransitionError,
    )
    expect((dualError as ProvisioningRollbackError).rollbackError).toBeInstanceOf(VaultStorageError)

    spy2.mockRestore()
  })
})
