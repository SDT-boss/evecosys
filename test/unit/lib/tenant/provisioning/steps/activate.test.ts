import { describe, it, expect, vi } from 'vitest'
import { createActivateStep } from '@/lib/tenant/provisioning/steps/activate'
import { InvalidStateTransitionError } from '@/lib/tenant/types'
import type { ProvisioningDb, ProvisioningContext } from '@/lib/tenant/provisioning/types'
import type { Tenant } from '@/lib/tenant/types'

function tenant(state: Tenant['state']): Tenant {
  return { id: 'tenant-1', owner_id: 'o', name: 'T', state, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
}
function ctx(state: Tenant['state']): ProvisioningContext {
  return { tenant: tenant(state), byodbInput: { kind: 'structured', params: { engine: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u', password: 'p' } } }
}
function fakeDb(): ProvisioningDb {
  return {
    seedConfig: vi.fn(), deleteConfig: vi.fn(), setFeatureFlags: vi.fn(),
    initMetering: vi.fn(), deleteMetering: vi.fn(),
    setTenantState: vi.fn().mockResolvedValue(undefined),
    hasConfig: vi.fn(), hasMetering: vi.fn(), getFeatureFlags: vi.fn(),
  }
}

describe('activate step', () => {
  it('has the correct name and maxAttempts', () => {
    const step = createActivateStep(fakeDb())
    expect(step.name).toBe('activate')
    expect(step.maxAttempts).toBe(2)
  })

  it('transitions Provisioning → Active and persists', async () => {
    const db = fakeDb()
    await createActivateStep(db).run(ctx('Provisioning'))
    expect(db.setTenantState).toHaveBeenCalledWith('tenant-1', 'Active')
  })

  it('throws InvalidStateTransitionError when not in Provisioning, without persisting', async () => {
    const db = fakeDb()
    await expect(createActivateStep(db).run(ctx('Registered'))).rejects.toThrow(InvalidStateTransitionError)
    expect(db.setTenantState).not.toHaveBeenCalled()
  })

  it('compensate reverts tenant state to Provisioning (never leaves it Active)', async () => {
    const db = fakeDb()
    await createActivateStep(db).compensate(ctx('Provisioning'))
    expect(db.setTenantState).toHaveBeenCalledWith('tenant-1', 'Provisioning')
  })
})
