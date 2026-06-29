import { describe, it, expect, vi } from 'vitest'
import { createBootstrapMeteringStep } from '@/lib/tenant/provisioning/steps/bootstrapMetering'
import { DEFAULT_QUOTA_BYTES } from '@/lib/tenant/provisioning/constants'
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
    seedConfig: vi.fn(), deleteConfig: vi.fn(), setFeatureFlags: vi.fn(),
    initMetering: vi.fn().mockResolvedValue(undefined),
    deleteMetering: vi.fn().mockResolvedValue(undefined),
    setTenantState: vi.fn(), hasConfig: vi.fn(), hasMetering: vi.fn(), getFeatureFlags: vi.fn(),
  }
}

describe('bootstrap_metering step', () => {
  it('has the correct name and maxAttempts', () => {
    const step = createBootstrapMeteringStep(fakeDb())
    expect(step.name).toBe('bootstrap_metering')
    expect(step.maxAttempts).toBe(2)
  })

  it('initializes a metering row with the default quota scoped to the tenant', async () => {
    const db = fakeDb()
    await createBootstrapMeteringStep(db).run(ctx())
    expect(db.initMetering).toHaveBeenCalledWith('tenant-1', DEFAULT_QUOTA_BYTES)
  })

  it('compensate deletes the metering row for the tenant', async () => {
    const db = fakeDb()
    await createBootstrapMeteringStep(db).compensate(ctx())
    expect(db.deleteMetering).toHaveBeenCalledWith('tenant-1')
  })
})
