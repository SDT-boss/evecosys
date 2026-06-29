import { describe, it, expect, vi } from 'vitest'
import { createBindByodbStep } from '@/lib/tenant/provisioning/steps/bindByodb'
import {
  RetryableProvisioningError,
  ManualInterventionError,
} from '@/lib/tenant/provisioning/errors'
import { CredentialValidationError } from '@/lib/tenant/credentials'
import type { ConnectivityProbe, ProbeResult } from '@/lib/tenant/probe'
import type { VaultStore } from '@/lib/tenant/vault'
import type { ProvisioningContext } from '@/lib/tenant/provisioning/types'
import type { Tenant } from '@/lib/tenant/types'

const TENANT: Tenant = {
  id: 'tenant-1',
  owner_id: 'owner-1',
  name: 'T',
  state: 'Provisioning',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function ctx(): ProvisioningContext {
  return {
    tenant: TENANT,
    byodbInput: {
      kind: 'structured',
      params: { engine: 'postgres', host: 'db', port: 5432, database: 'd', user: 'u', password: 'p' },
    },
  }
}

function probeOf(result: ProbeResult): ConnectivityProbe {
  return { probe: vi.fn().mockResolvedValue(result) }
}

function vaultOf(secretId = 'sec-1'): VaultStore & { store: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } {
  return {
    store: vi.fn().mockResolvedValue({ secretId }),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

describe('bind_byodb step', () => {
  it('has the correct name and maxAttempts', () => {
    const step = createBindByodbStep(probeOf({ reachable: true, ownsSchema: true }), vaultOf())
    expect(step.name).toBe('bind_byodb')
    expect(step.maxAttempts).toBe(3)
  })

  it('probes, stores in vault, and writes secretId to ctx on success', async () => {
    const probe = probeOf({ reachable: true, ownsSchema: true })
    const vault = vaultOf('stored-id')
    const step = createBindByodbStep(probe, vault)
    const c = ctx()

    await step.run(c)

    expect(probe.probe).toHaveBeenCalledOnce()
    expect(vault.store).toHaveBeenCalledWith('byodb/tenant-1', expect.any(String))
    expect(c.secretId).toBe('stored-id')
  })

  it('throws CredentialValidationError (fatal) on invalid input, before probe', async () => {
    const probe = probeOf({ reachable: true, ownsSchema: true })
    const vault = vaultOf()
    const step = createBindByodbStep(probe, vault)
    const c: ProvisioningContext = {
      tenant: TENANT,
      byodbInput: { kind: 'structured', params: { engine: 'postgres', host: '', port: 5432, database: 'd', user: 'u', password: 'p' } },
    }

    await expect(step.run(c)).rejects.toThrow(CredentialValidationError)
    expect(probe.probe).not.toHaveBeenCalled()
  })

  it('throws RetryableProvisioningError when db unreachable, without storing', async () => {
    const probe = probeOf({ reachable: false, ownsSchema: false, error: 'timeout' })
    const vault = vaultOf()
    const step = createBindByodbStep(probe, vault)

    await expect(step.run(ctx())).rejects.toThrow(RetryableProvisioningError)
    expect(vault.store).not.toHaveBeenCalled()
  })

  it('throws ManualInterventionError when reachable but no schema ownership', async () => {
    const probe = probeOf({ reachable: true, ownsSchema: false })
    const vault = vaultOf()
    const step = createBindByodbStep(probe, vault)

    await expect(step.run(ctx())).rejects.toThrow(ManualInterventionError)
    expect(vault.store).not.toHaveBeenCalled()
  })

  it('compensate deletes the stored secret when secretId is set', async () => {
    const vault = vaultOf()
    const step = createBindByodbStep(probeOf({ reachable: true, ownsSchema: true }), vault)
    const c = ctx()
    c.secretId = 'sec-9'

    await step.compensate(c)
    expect(vault.delete).toHaveBeenCalledWith('sec-9')
  })

  it('compensate is a no-op when no secretId was stored', async () => {
    const vault = vaultOf()
    const step = createBindByodbStep(probeOf({ reachable: true, ownsSchema: true }), vault)

    await step.compensate(ctx())
    expect(vault.delete).not.toHaveBeenCalled()
  })
})
