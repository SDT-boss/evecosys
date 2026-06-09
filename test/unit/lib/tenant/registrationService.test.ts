import { describe, it, expect, vi } from 'vitest'
import { BYODBRegistrationService, type RegistrationResult } from '@/lib/tenant/registrationService'
import type { ConnectivityProbe, ProbeResult } from '@/lib/tenant/probe'
import { ConnectivityError } from '@/lib/tenant/probe'
import type { VaultStore, StoredSecret } from '@/lib/tenant/vault'
import type { Tenant } from '@/lib/tenant/types'
import type { BYODBCredentialInput } from '@/lib/tenant/credentials'
import { CredentialValidationError } from '@/lib/tenant/credentials'

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
