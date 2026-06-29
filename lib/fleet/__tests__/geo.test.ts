import { describe, it, expect } from 'vitest'
import { haversineKm, projectPosition, getNearestCharger } from '../geo'
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

describe('projectPosition', () => {
  it('returns origin when distance is 0', () => {
    const origin = { latitude: 14.5, longitude: 121.0 }
    const result = projectPosition(origin, 0, 0)
    expect(result.latitude).toBeCloseTo(14.5, 4)
    expect(result.longitude).toBeCloseTo(121.0, 4)
  })

  it('projects north by ~111km and increases latitude by ~1 degree', () => {
    const origin = { latitude: 14.0, longitude: 121.0 }
    const result = projectPosition(origin, 0, 111)
    expect(result.latitude).toBeCloseTo(15.0, 0)
    expect(result.longitude).toBeCloseTo(121.0, 1)
  })
})

describe('getNearestCharger', () => {
  const chargers: Charger[] = [
    { id: 'c1', latitude: 14.5, longitude: 121.0, type: 'DEPOT',   isOccupied: false },
    { id: 'c2', latitude: 14.6, longitude: 121.1, type: 'HIGHWAY', isOccupied: false },
    { id: 'c3', latitude: 15.0, longitude: 122.0, type: 'HIGHWAY', isOccupied: false },
  ]

  it('returns null for empty charger list', () => {
    expect(getNearestCharger({ latitude: 14.5, longitude: 121.0 }, [])).toBeNull()
  })

  it('returns the closest charger', () => {
    const result = getNearestCharger({ latitude: 14.5, longitude: 121.0 }, chargers)
    expect(result?.charger.id).toBe('c1')
    expect(result?.distanceKm).toBeCloseTo(0, 1)
  })

  it('picks closer charger', () => {
    const result = getNearestCharger({ latitude: 14.55, longitude: 121.05 }, chargers)
    expect(['c1', 'c2']).toContain(result?.charger.id)
  })
})
