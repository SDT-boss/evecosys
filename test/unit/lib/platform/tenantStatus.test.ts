import { describe, it, expect } from 'vitest'
import { mapTenantState, statusBadgeVariant } from '@/lib/platform/tenantStatus'
import type { TenantState } from '@/lib/tenant/types'
import type { DisplayStatus } from '@/lib/platform/tenantStatus'

const STATE_MAP: [TenantState, DisplayStatus | null][] = [
  ['Active',          'Active'],
  ['Registered',      'Pending'],
  ['Provisioning',    'Pending'],
  ['Suspended',       'Suspended'],
  ['Decommissioned',  null],
]

describe('mapTenantState', () => {
  it.each(STATE_MAP)('%s → %s', (state, expected) => {
    expect(mapTenantState(state)).toBe(expected)
  })
})

const BADGE_MAP: [DisplayStatus, 'default' | 'secondary' | 'destructive'][] = [
  ['Active',    'default'],
  ['Pending',   'secondary'],
  ['Suspended', 'destructive'],
]

describe('statusBadgeVariant', () => {
  it.each(BADGE_MAP)('%s → %s', (status, expected) => {
    expect(statusBadgeVariant(status)).toBe(expected)
  })
})
