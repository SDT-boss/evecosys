import { describe, it, expect } from 'vitest'
import { ControlPlaneConfigResolver } from '@/lib/tenant/controlplane/configResolver'
import type { ControlPlaneReadStore } from '@/lib/tenant/controlplane/types'

function store(over: Partial<ControlPlaneReadStore> = {}): ControlPlaneReadStore {
  return {
    async getStateAndFlags() { return { state: 'Active', featureFlags: { fleet: true } } },
    async getConfig() { return { locale: 'en-MY' } },
    async getMetering() { return { bytesUsed: 0, quotaBytes: 100 } },
    ...over,
  }
}

describe('ControlPlaneConfigResolver.resolve', () => {
  it('assembles a snapshot with routable derived from status', async () => {
    const snap = await new ControlPlaneConfigResolver(store()).resolve('t1')
    expect(snap).toEqual({
      tenantId: 't1',
      status: 'Active',
      routable: true,
      featureFlags: { fleet: true },
      config: { locale: 'en-MY' },
      metering: { bytesUsed: 0, quotaBytes: 100 },
    })
  })

  it('marks a Suspended tenant non-routable', async () => {
    const s = store({ async getStateAndFlags() { return { state: 'Suspended', featureFlags: {} } } })
    const snap = await new ControlPlaneConfigResolver(s).resolve('t1')
    expect(snap?.routable).toBe(false)
  })

  it('returns null when the tenant is unknown', async () => {
    const s = store({ async getStateAndFlags() { return null } })
    expect(await new ControlPlaneConfigResolver(s).resolve('missing')).toBeNull()
  })

  it('degrades missing config and metering without throwing', async () => {
    const s = store({ async getConfig() { return null }, async getMetering() { return null } })
    const snap = await new ControlPlaneConfigResolver(s).resolve('t1')
    expect(snap?.config).toEqual({})
    expect(snap?.metering).toBeNull()
  })
})
