import { describe, it, expect } from 'vitest'
import { canTransition, createDispatchEvent } from '../state-machine'

describe('canTransition', () => {
  it('allows IDLE → DISPATCHED', () => expect(canTransition('IDLE', 'DISPATCHED')).toBe(true))
  it('allows DISPATCHED → PATROLLING', () => expect(canTransition('DISPATCHED', 'PATROLLING')).toBe(true))
  it('allows PATROLLING → ROUTING_TO_CHARGER', () => expect(canTransition('PATROLLING', 'ROUTING_TO_CHARGER')).toBe(true))
  it('allows ROUTING_TO_CHARGER → CHARGING', () => expect(canTransition('ROUTING_TO_CHARGER', 'CHARGING')).toBe(true))
  it('allows CHARGING → PATROLLING', () => expect(canTransition('CHARGING', 'PATROLLING')).toBe(true))
  it('allows PATROLLING → IDLE (shift end)', () => expect(canTransition('PATROLLING', 'IDLE')).toBe(true))
  it('allows any → OFFLINE', () => {
    for (const s of ['IDLE', 'DISPATCHED', 'PATROLLING', 'ROUTING_TO_CHARGER', 'CHARGING'] as const) {
      expect(canTransition(s, 'OFFLINE')).toBe(true)
    }
  })
  it('allows OFFLINE → IDLE', () => expect(canTransition('OFFLINE', 'IDLE')).toBe(true))
  it('rejects IDLE → PATROLLING (skips DISPATCHED)', () => expect(canTransition('IDLE', 'PATROLLING')).toBe(false))
  it('rejects CHARGING → IDLE', () => expect(canTransition('CHARGING', 'IDLE')).toBe(false))
  it('rejects IDLE → CHARGING', () => expect(canTransition('IDLE', 'CHARGING')).toBe(false))
})

describe('createDispatchEvent', () => {
  it('returns a valid event for a legal transition', () => {
    const event = createDispatchEvent('v1', 'IDLE', 'DISPATCHED', 'DISPATCH', 'SYSTEM')
    expect(event.vehicleId).toBe('v1')
    expect(event.previousStatus).toBe('IDLE')
    expect(event.newStatus).toBe('DISPATCHED')
    expect(event.triggeredBy).toBe('SYSTEM')
    expect(event.action).toBe('DISPATCH')
    expect(event.id).toBeTruthy()
    expect(event.timestamp).toBeInstanceOf(Date)
  })

  it('accepts optional metadata', () => {
    const event = createDispatchEvent('v1', 'PATROLLING', 'ROUTING_TO_CHARGER', 'REROUTE_TO_CHARGER', 'SYSTEM', { chargerId: 'c1' })
    expect(event.metadata?.chargerId).toBe('c1')
  })

  it('throws for an invalid transition', () => {
    expect(() => createDispatchEvent('v1', 'IDLE', 'CHARGING', 'DISPATCH', 'SYSTEM')).toThrow('Invalid transition: IDLE → CHARGING')
  })
})
