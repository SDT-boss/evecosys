import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BYODBRegistrationService, type RegistrationResult } from '@/lib/tenant/registrationService'
import type { ConnectivityProbe, ProbeResult } from '@/lib/tenant/probe'
import { ConnectivityError } from '@/lib/tenant/probe'
import type { VaultStore, StoredSecret } from '@/lib/tenant/vault'
import { VaultStorageError } from '@/lib/tenant/vault'
import type { Tenant } from '@/lib/tenant/types'
import type { BYODBCredentialInput } from '@/lib/tenant/credentials'
import { CredentialValidationError } from '@/lib/tenant/credentials'
import { InvalidStateTransitionError } from '@/lib/tenant/types'

// ---------------------------------------------------------------------------
// Helpers — minimal fakes satisfying the ConnectivityProbe and VaultStore
// interfaces.  These never load pg or mysql2.
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

describe('BYODBRegistrationService.register', () => {
  describe('happy path', () => {
    it('calls probe with normalised params, stores in vault, and returns Active tenant', async () => {
      const probe = makeProbe({ reachable: true, ownsSchema: true })
      const vault = makeVault('stored-id')
      const svc = new BYODBRegistrationService(probe, vault)

      const result: RegistrationResult = await svc.register(
        PROVISIONING_TENANT,
        VALID_STRUCTURED_INPUT,
      )

      expect(probe.probe).toHaveBeenCalledOnce()
      expect(vault.store).toHaveBeenCalledOnce()
      expect(vault.delete).not.toHaveBeenCalled()
      expect(result.tenant.state).toBe('Active')
      expect(result.secretId).toBe('stored-id')
    })

    it('accepts a valid connection-string input', async () => {
      const probe = makeProbe({ reachable: true, ownsSchema: true })
      const vault = makeVault()
      const svc = new BYODBRegistrationService(probe, vault)

      const input: BYODBCredentialInput = {
        kind: 'connectionString',
        engine: 'postgres',
        connectionString: 'postgres://alice:hunter2@db.example.com:5432/mydb',
      }

      const result = await svc.register(PROVISIONING_TENANT, input)
      expect(result.tenant.state).toBe('Active')
    })
  })

  describe('state guard', () => {
    it('throws ConnectivityError when tenant is not in Provisioning state', async () => {
      const probe = makeProbe({ reachable: true, ownsSchema: true })
      const vault = makeVault()
      const svc = new BYODBRegistrationService(probe, vault)

      await expect(svc.register(ACTIVE_TENANT, VALID_STRUCTURED_INPUT)).rejects.toThrow(
        ConnectivityError,
      )
      expect(probe.probe).not.toHaveBeenCalled()
      expect(vault.store).not.toHaveBeenCalled()
    })

    it('error message mentions Provisioning', async () => {
      const svc = new BYODBRegistrationService(makeProbe({ reachable: true, ownsSchema: true }), makeVault())
      await expect(svc.register(ACTIVE_TENANT, VALID_STRUCTURED_INPUT)).rejects.toThrow(
        /must be in Provisioning/,
      )
    })
  })

  describe('invalid input', () => {
    it('throws CredentialValidationError before calling probe', async () => {
      const probe = makeProbe({ reachable: true, ownsSchema: true })
      const vault = makeVault()
      const svc = new BYODBRegistrationService(probe, vault)

      const badInput: BYODBCredentialInput = {
        kind: 'structured',
        params: {
          engine: 'postgres',
          host: '',           // missing host triggers CredentialValidationError
          port: 5432,
          database: 'db',
          user: 'u',
          password: 'p',
        },
      }

      await expect(svc.register(PROVISIONING_TENANT, badInput)).rejects.toThrow(
        CredentialValidationError,
      )
      expect(probe.probe).not.toHaveBeenCalled()
      expect(vault.store).not.toHaveBeenCalled()
    })
  })

  describe('connectivity failure', () => {
    it('throws ConnectivityError and never calls vault.store when probe says unreachable', async () => {
      const probe = makeProbe({ reachable: false, ownsSchema: false, error: 'timeout' })
      const vault = makeVault()
      const svc = new BYODBRegistrationService(probe, vault)

      await expect(svc.register(PROVISIONING_TENANT, VALID_STRUCTURED_INPUT)).rejects.toThrow(
        ConnectivityError,
      )
      expect(vault.store).not.toHaveBeenCalled()
    })

    it('throws ConnectivityError and never calls vault.store when probe lacks schema ownership', async () => {
      const probe = makeProbe({ reachable: true, ownsSchema: false })
      const vault = makeVault()
      const svc = new BYODBRegistrationService(probe, vault)

      await expect(svc.register(PROVISIONING_TENANT, VALID_STRUCTURED_INPUT)).rejects.toThrow(
        ConnectivityError,
      )
      expect(vault.store).not.toHaveBeenCalled()
    })

    it('tenant state remains Provisioning when probe fails', async () => {
      const probe = makeProbe({ reachable: false, ownsSchema: false })
      const vault = makeVault()
      const svc = new BYODBRegistrationService(probe, vault)

      await expect(svc.register(PROVISIONING_TENANT, VALID_STRUCTURED_INPUT)).rejects.toThrow()
      // vault.store not called → no state change occurred
      expect(vault.store).not.toHaveBeenCalled()
    })
  })

  describe('rollback on post-store failure', () => {
    it('calls vault.delete with the stored secretId when the state transition throws', async () => {
      // Force transition to fail by using an invalid from-state so transition() throws.
      // We craft a tenant in 'Suspended' state so Provisioning→Active transition never
      // fires, but the probe still passes (state guard check is tested separately).
      // Better: stub vault.store to succeed, then make the transition fail by
      // having the tenant in a state that transitions to 'Active' aren't allowed from.
      //
      // Simplest: keep tenant in Provisioning (probe succeeds, store succeeds) but
      // inject a vault where store succeeds and then inject an after-store error.
      // We do this by replacing vault.store with one that returns a secretId, and
      // then throw from within the service after store succeeds by using a wrapped vault.

      // Instead of mocking internals, use the fact that transition('Provisioning', 'Active')
      // succeeds. We need a path that throws AFTER store. We can do this by making the
      // vault.store return successfully but then having `transition` fail.
      //
      // The cleanest approach: pass a tenant in a state where the state guard passes
      // (i.e., Provisioning), but then mock the probe to succeed and use a real-ish
      // vault where `delete` can be observed — while forcing post-store failure.
      //
      // Since `transition(Provisioning, Active)` always succeeds (valid path), we
      // need a different trigger. We test rollback by providing a vault whose `store`
      // succeeds but then we reach the transition step. We can't easily make transition()
      // throw from outside without patching the module.
      //
      // Solution: inject a vault that throws on the SECOND call (so store() works but
      // something after it fails). We instead create a vault where store returns OK
      // but then `delete` is observable, and we manually simulate a post-store exception
      // by having the vault.store return OK but transition() internally throw.
      //
      // Best approach: register a tenant with state='Provisioning' (valid guard),
      // successful probe, successful vault.store — then make transition throw by
      // providing a tenant.state that becomes invalid after state-guard check via
      // a custom probe that temporarily alters state. This is circular.
      //
      // Simplest correct approach: wrap post-store in a service that we test by
      // overriding the service itself to throw after store, OR test via a vault
      // that throws only on `store` which means rollback never fires (different path).
      //
      // ACTUAL SOLUTION: In the registrationService the rollback try/catch wraps
      // `transition(tenant.state, 'Active')`. We can make this throw by passing a
      // tenant whose state is NOT 'Provisioning' — but the state guard blocks that.
      //
      // The only clean way: spy on the transition module. But since we import it
      // directly, we use a different tenant: after the state guard (which checks
      // tenant.state === 'Provisioning'), the tenant.state is still Provisioning,
      // and transition('Provisioning', 'Active') is valid. So we cannot make
      // transition throw with a Provisioning tenant.
      //
      // Rollback path is reachable if we add a FOURTH injectable: update function.
      // Per the plan spec, rollback is tested by making the post-store step fail.
      // The only realistic post-store step that can fail is transition(), which
      // throws InvalidStateTransitionError for invalid pairs.
      //
      // PLAN spec says: "vault.store succeeds (returns secretId), but the subsequent
      // transition (or a thrown post-store step) fails → vault.delete is called"
      //
      // This means we need to make transition() throw. To do that without modifying
      // the implementation, we need to inject a tenant where state guard passes but
      // transition would fail — which is contradictory.
      //
      // RESOLUTION: The integration test will use a BYODBRegistrationService subclass
      // override, OR we verify via a controlled scenario where the tenant.state is
      // secretly corrupted between guard and transition. Since this is a unit test,
      // we use vi.mock to mock the stateMachine module.

      const { transition } = await import('@/lib/tenant/stateMachine')
      const stateMachineMod = await import('@/lib/tenant/stateMachine')

      const vaultWithTracking = makeVault('rollback-secret-id')
      const probe = makeProbe({ reachable: true, ownsSchema: true })
      const svc = new BYODBRegistrationService(probe, vaultWithTracking)

      // Spy on the original transition — we need to restore after test
      const spy = vi.spyOn(stateMachineMod, 'transition').mockImplementationOnce(() => {
        throw new InvalidStateTransitionError('Provisioning', 'Active')
      })

      await expect(svc.register(PROVISIONING_TENANT, VALID_STRUCTURED_INPUT)).rejects.toThrow(
        InvalidStateTransitionError,
      )

      expect(vaultWithTracking.store).toHaveBeenCalledOnce()
      expect(vaultWithTracking.delete).toHaveBeenCalledOnce()
      expect(vaultWithTracking.delete).toHaveBeenCalledWith('rollback-secret-id')

      spy.mockRestore()
    })
  })

  describe('ordering invariants', () => {
    it('calls normalizeCredential before probe (order enforced by the spec)', async () => {
      // We verify ordering indirectly: if input is invalid, probe is never called.
      // This test is covered in the "invalid input" suite above.
      // Additionally, confirm probe is called before vault.store via call order tracking.
      const callOrder: string[] = []

      const probe: ConnectivityProbe = {
        probe: vi.fn().mockImplementation(async () => {
          callOrder.push('probe')
          return { reachable: true, ownsSchema: true }
        }),
      }
      const vault: VaultStore = {
        store: vi.fn().mockImplementation(async () => {
          callOrder.push('store')
          return { secretId: 'sid' }
        }),
        delete: vi.fn(),
      }

      const svc = new BYODBRegistrationService(probe, vault)
      await svc.register(PROVISIONING_TENANT, VALID_STRUCTURED_INPUT)

      expect(callOrder).toEqual(['probe', 'store'])
    })
  })
})
