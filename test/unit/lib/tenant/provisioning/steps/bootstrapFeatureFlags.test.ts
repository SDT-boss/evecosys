import { describe, it, expect, vi } from 'vitest'
import { createBootstrapFeatureFlagsStep } from '@/lib/tenant/provisioning/steps/bootstrapFeatureFlags'
import { DEFAULT_FEATURE_FLAGS } from '@/lib/tenant/provisioning/constants'
import type { ProvisioningDb, ProvisioningContext } from '@/lib/tenant/provisioning/types'
import type { Tenant } from '@/lib/tenant/types'

const TENANT: Tenant = {
  id: 'tenant-1', owner_id: 'o', name: 'T', state: 'Provisioning',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
function ctx(): ProvisioningContext {
  return { tenant: TENANT, byodbInput: { kind: 'structured', params: { engine: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u', password: 'p' } } }
}
function fakeDb(): ProvisioningDb {
  return {
    seedConfig: vi.fn(), deleteConfig: vi.fn(),
    setFeatureFlags: vi.fn().mockResolvedValue(undefined),
    initMetering: vi.fn(), deleteMetering: vi.fn(),
    setTenantState: vi.fn(), hasConfig: vi.fn(), hasMetering: vi.fn(), getFeatureFlags: vi.fn(),
  }
}

describe('bootstrap_feature_flags step', () => {
  it('has the correct name and maxAttempts', () => {
    const step = createBootstrapFeatureFlagsStep(fakeDb())
    expect(step.name).toBe('bootstrap_feature_flags')
    expect(step.maxAttempts).toBe(2)
  })

  it('writes the canonical default flags scoped to the tenant id', async () => {
    const db = fakeDb()
    await createBootstrapFeatureFlagsStep(db).run(ctx())
    expect(db.setFeatureFlags).toHaveBeenCalledWith('tenant-1', DEFAULT_FEATURE_FLAGS)
  })

  it('compensate is a no-op (flags removed with the tenant row on full teardown)', async () => {
    const db = fakeDb()
    await expect(createBootstrapFeatureFlagsStep(db).compensate(ctx())).resolves.toBeUndefined()
    expect(db.setFeatureFlags).not.toHaveBeenCalled()
  })
})
