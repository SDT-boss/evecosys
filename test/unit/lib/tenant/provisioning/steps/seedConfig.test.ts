import { describe, it, expect, vi } from 'vitest'
import { createSeedConfigStep } from '@/lib/tenant/provisioning/steps/seedConfig'
import { DEFAULT_TENANT_CONFIG } from '@/lib/tenant/provisioning/constants'
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
    seedConfig: vi.fn().mockResolvedValue(undefined),
    deleteConfig: vi.fn().mockResolvedValue(undefined),
    setFeatureFlags: vi.fn(), initMetering: vi.fn(), deleteMetering: vi.fn(),
    setTenantState: vi.fn(), hasConfig: vi.fn(), hasMetering: vi.fn(), getFeatureFlags: vi.fn(),
  }
}

describe('seed_config step', () => {
  it('has the correct name and maxAttempts', () => {
    const step = createSeedConfigStep(fakeDb())
    expect(step.name).toBe('seed_config')
    expect(step.maxAttempts).toBe(2)
  })

  it('seeds default config scoped to the tenant id', async () => {
    const db = fakeDb()
    await createSeedConfigStep(db).run(ctx())
    expect(db.seedConfig).toHaveBeenCalledWith('tenant-1', DEFAULT_TENANT_CONFIG)
  })

  it('compensate deletes the config for the tenant', async () => {
    const db = fakeDb()
    await createSeedConfigStep(db).compensate(ctx())
    expect(db.deleteConfig).toHaveBeenCalledWith('tenant-1')
  })
})
