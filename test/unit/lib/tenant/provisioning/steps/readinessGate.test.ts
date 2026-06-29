import { describe, it, expect, vi } from 'vitest'
import { createReadinessGateStep } from '@/lib/tenant/provisioning/steps/readinessGate'
import { ReadinessError } from '@/lib/tenant/provisioning/errors'
import { DEFAULT_FEATURE_FLAGS } from '@/lib/tenant/provisioning/constants'
import type { ProvisioningDb, ProvisioningContext } from '@/lib/tenant/provisioning/types'
import type { Tenant } from '@/lib/tenant/types'

const TENANT: Tenant = {
  id: 'tenant-1', owner_id: 'o', name: 'T', state: 'Provisioning',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
function ctx(secretId: string | undefined = 'sec-1'): ProvisioningContext {
  return { tenant: TENANT, secretId, byodbInput: { kind: 'structured', params: { engine: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u', password: 'p' } } }
}
function fakeDb(over: Partial<ProvisioningDb> = {}): ProvisioningDb {
  return {
    seedConfig: vi.fn(), deleteConfig: vi.fn(), setFeatureFlags: vi.fn(),
    initMetering: vi.fn(), deleteMetering: vi.fn(), setTenantState: vi.fn(),
    hasConfig: vi.fn().mockResolvedValue(true),
    hasMetering: vi.fn().mockResolvedValue(true),
    getFeatureFlags: vi.fn().mockResolvedValue(DEFAULT_FEATURE_FLAGS),
    ...over,
  }
}

describe('readiness_gate step', () => {
  it('has the correct name and maxAttempts', () => {
    const step = createReadinessGateStep(fakeDb())
    expect(step.name).toBe('readiness_gate')
    expect(step.maxAttempts).toBe(1)
  })

  it('passes when all artifacts are present', async () => {
    await expect(createReadinessGateStep(fakeDb()).run(ctx())).resolves.toBeUndefined()
  })

  it('throws ReadinessError when BYODB secret is not bound', async () => {
    // Note: ctx(undefined) triggers the JS default param ('sec-1'), so we build the context
    // directly to produce a context that genuinely has no secretId bound.
    const noSecretCtx: ProvisioningContext = {
      tenant: TENANT,
      byodbInput: { kind: 'structured', params: { engine: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u', password: 'p' } },
    }
    await expect(createReadinessGateStep(fakeDb()).run(noSecretCtx)).rejects.toThrow(ReadinessError)
  })

  it('throws ReadinessError when config is missing', async () => {
    const db = fakeDb({ hasConfig: vi.fn().mockResolvedValue(false) })
    await expect(createReadinessGateStep(db).run(ctx())).rejects.toThrow(ReadinessError)
  })

  it('throws ReadinessError when metering row is missing', async () => {
    const db = fakeDb({ hasMetering: vi.fn().mockResolvedValue(false) })
    await expect(createReadinessGateStep(db).run(ctx())).rejects.toThrow(ReadinessError)
  })

  it('throws ReadinessError when feature flags are missing a canonical key', async () => {
    const partial = { ...DEFAULT_FEATURE_FLAGS }
    delete (partial as Record<string, boolean>).fleet
    const db = fakeDb({ getFeatureFlags: vi.fn().mockResolvedValue(partial) })
    await expect(createReadinessGateStep(db).run(ctx())).rejects.toThrow(ReadinessError)
  })

  it('compensate is a no-op (the gate performs no writes)', async () => {
    await expect(createReadinessGateStep(fakeDb()).compensate(ctx())).resolves.toBeUndefined()
  })
})
