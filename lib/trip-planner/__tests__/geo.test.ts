import { describe, it, expect } from 'vitest'
import { haversineKm, getNearestChargerAlongRoute } from '../geo'
import type { Charger } from '../types'

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm({ latitude: 14.5, longitude: 121.0 }, { latitude: 14.5, longitude: 121.0 })).toBe(0)
  })

  it('returns approximate distance between two known points', () => {
    const dist = haversineKm(
      { latitude: 14.5995, longitude: 120.9842 },
      { latitude: 14.6760, longitude: 121.0437 }
    )
    expect(dist).toBeGreaterThan(9)
    expect(dist).toBeLessThan(12)
  })

  it('is symmetric', () => {
    const a = { latitude: 14.5, longitude: 121.0 }
    const b = { latitude: 14.6, longitude: 121.1 }
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 5)
  })
})

describe('getNearestChargerAlongRoute', () => {
  const destination = { latitude: 15.0, longitude: 121.5 }

  const chargers: Charger[] = [
    { id: 'c1', latitude: 14.6, longitude: 121.1, type: 'HIGHWAY', isOccupied: false },
    { id: 'c2', latitude: 14.8, longitude: 121.3, type: 'HIGHWAY', isOccupied: false },
    { id: 'c3', latitude: 14.5, longitude: 121.0, type: 'DEPOT',   isOccupied: false },
  ]

  it('returns null for empty charger list', () => {
    expect(getNearestChargerAlongRoute(destination, [])).toBeNull()
  })

  it('returns the charger closest to the destination (minimises detour)', () => {
    const result = getNearestChargerAlongRoute(destination, chargers)
    expect(result?.id).toBe('c2')
  })

  it('skips occupied chargers', () => {
    const allOccupied = chargers.map(c => ({ ...c, isOccupied: true }))
    expect(getNearestChargerAlongRoute(destination, allOccupied)).toBeNull()
  })
})
