import { describe, it, expect } from 'vitest'
import { isRoutable } from '@/lib/tenant/controlplane/types'
import type { TenantState } from '@/lib/tenant/types'

describe('isRoutable', () => {
  it('is true only for Active', () => {
    expect(isRoutable('Active')).toBe(true)
  })

  it('is false for every non-Active state', () => {
    const nonActive: TenantState[] = ['Registered', 'Provisioning', 'Suspended', 'Decommissioned']
    for (const s of nonActive) expect(isRoutable(s)).toBe(false)
  })
})
