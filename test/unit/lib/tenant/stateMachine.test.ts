import {
  transition,
  transitionTenant,
  TRANSITIONS,
} from '@/lib/tenant/stateMachine'
import {
  TENANT_STATES,
  INITIAL_TENANT_STATE,
  InvalidStateTransitionError,
  type TenantState,
  type Tenant,
} from '@/lib/tenant/types'

const VALID: [TenantState, TenantState][] = [
  ['Registered', 'Provisioning'],
  ['Provisioning', 'Active'],
  ['Provisioning', 'Registered'],
  ['Active', 'Suspended'],
  ['Active', 'Decommissioned'],
  ['Suspended', 'Active'],
  ['Suspended', 'Decommissioned'],
]

function tenant(state: TenantState): Tenant {
  return { id: 't1', owner_id: 'owner-t1', name: '', state, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
}

describe('tenant state machine', () => {
  it('initial state is Registered', () => {
    expect(INITIAL_TENANT_STATE).toBe('Registered')
  })

  it('has exactly the 5 lifecycle states', () => {
    expect([...TENANT_STATES].sort()).toEqual(
      ['Active', 'Decommissioned', 'Provisioning', 'Registered', 'Suspended'],
    )
  })

  describe('valid transitions', () => {
    it.each(VALID)('%s → %s succeeds', (from, to) => {
      expect(transition(from, to)).toBe(to)
    })
  })

  describe('invalid transitions', () => {
    const invalidPairs: [TenantState, TenantState][] = []
    for (const from of TENANT_STATES) {
      for (const to of TENANT_STATES) {
        const isValid = VALID.some(([f, t]) => f === from && t === to)
        if (!isValid) invalidPairs.push([from, to])
      }
    }

    it.each(invalidPairs)('%s → %s throws InvalidStateTransitionError', (from, to) => {
      expect(() => transition(from, to)).toThrow(InvalidStateTransitionError)
    })

    it('error message contains both state names', () => {
      try {
        transition('Decommissioned', 'Active')
      } catch (e) {
        expect((e as Error).message).toContain('Decommissioned')
        expect((e as Error).message).toContain('Active')
      }
    })
  })

  describe('transitionTenant', () => {
    it('returns a new object with the next state on valid transition', () => {
      const t = tenant('Registered')
      const next = transitionTenant(t, 'Provisioning')
      expect(next.state).toBe('Provisioning')
      expect(t.state).toBe('Registered') // input not mutated
      expect(next).not.toBe(t)
    })

    it('throws and does not mutate on invalid transition', () => {
      const t = tenant('Decommissioned')
      expect(() => transitionTenant(t, 'Active')).toThrow(InvalidStateTransitionError)
      expect(t.state).toBe('Decommissioned')
    })
  })

  it('TRANSITIONS map covers all 5 states as keys', () => {
    expect(Object.keys(TRANSITIONS).sort()).toEqual(
      ['Active', 'Decommissioned', 'Provisioning', 'Registered', 'Suspended'],
    )
  })
})
