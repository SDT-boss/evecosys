import { describe, it, expect } from 'vitest'
import { percentPerKm, remainingRangeKm, classifyReadiness, scoreVehicle, shouldReroute } from '../battery'
import type { TelemetrySnapshot, Charger } from '../types'

const makeSnapshot = (overrides: Partial<TelemetrySnapshot> = {}): TelemetrySnapshot => ({
  vehicleId: 'v1',
  batteryPercent: 80,
  latitude: 14.5,
  longitude: 121.0,
  speedKmh: 60,
  timestamp: new Date(),
  ...overrides,
})

const depot: Charger = { id: 'depot', latitude: 14.5, longitude: 121.0, type: 'DEPOT', isOccupied: false }
const farCharger: Charger = { id: 'far', latitude: 15.5, longitude: 122.0, type: 'HIGHWAY', isOccupied: false }

describe('percentPerKm', () => {
  it('returns 100/rangeKm for AION_Y_PLUS', () => {
    expect(percentPerKm('AION_Y_PLUS')).toBeCloseTo(100 / 600, 5)
  })
  it('returns 100/rangeKm for FOTON_E_TRUCKMATE', () => {
    expect(percentPerKm('FOTON_E_TRUCKMATE')).toBeCloseTo(100 / 230, 5)
  })
})

describe('remainingRangeKm', () => {
  it('calculates km left before hitting 20% threshold', () => {
    const snapshot = makeSnapshot({ batteryPercent: 80 })
    expect(remainingRangeKm(snapshot, 'AION_Y_PLUS')).toBeCloseTo(360, 0)
  })

  it('returns 0 when battery is exactly at threshold', () => {
    const snapshot = makeSnapshot({ batteryPercent: 20 })
    expect(remainingRangeKm(snapshot, 'AION_Y_PLUS')).toBeCloseTo(0, 1)
  })
})

describe('classifyReadiness', () => {
  it('returns READY above 50%', () => expect(classifyReadiness(51)).toBe('READY'))
  it('returns LOW_BATTERY between 30–50%', () => expect(classifyReadiness(35)).toBe('LOW_BATTERY'))
  it('returns CRITICAL_BATTERY between 20–30%', () => expect(classifyReadiness(25)).toBe('CRITICAL_BATTERY'))
  it('returns NOT_READY at or below 20%', () => {
    expect(classifyReadiness(20)).toBe('NOT_READY')
    expect(classifyReadiness(10)).toBe('NOT_READY')
  })
  it('returns LOW_BATTERY at exactly 50%', () => expect(classifyReadiness(50)).toBe('LOW_BATTERY'))
})

describe('scoreVehicle', () => {
  it('gives higher score to vehicle with more battery', () => {
    const patrol = { latitude: 14.5, longitude: 121.0 }
    const high = makeSnapshot({ batteryPercent: 90, latitude: 14.5, longitude: 121.0 })
    const low  = makeSnapshot({ batteryPercent: 40, latitude: 14.5, longitude: 121.0 })
    expect(scoreVehicle(high, patrol)).toBeGreaterThan(scoreVehicle(low, patrol))
  })

  it('gives higher score to vehicle closer to patrol start', () => {
    const patrol = { latitude: 14.5, longitude: 121.0 }
    const near = makeSnapshot({ batteryPercent: 60, latitude: 14.5, longitude: 121.0 })
    const far  = makeSnapshot({ batteryPercent: 60, latitude: 16.0, longitude: 123.0 })
    expect(scoreVehicle(near, patrol)).toBeGreaterThan(scoreVehicle(far, patrol))
  })

  it('proximity score never goes below 0', () => {
    const patrol = { latitude: 14.5, longitude: 121.0 }
    const veryFar = makeSnapshot({ batteryPercent: 50, latitude: 20.0, longitude: 130.0 })
    expect(scoreVehicle(veryFar, patrol)).toBeGreaterThanOrEqual(0)
  })
})

describe('shouldReroute', () => {
  it('returns false when vehicle is near a charger with sufficient battery', () => {
    const snapshot = makeSnapshot({ batteryPercent: 80, latitude: 14.5, longitude: 121.0 })
    const result = shouldReroute(snapshot, 'AION_Y_PLUS', [depot], 0)
    expect(result.reroute).toBe(false)
  })

  it('returns true with targetChargerId when projected position is far from all chargers', () => {
    const snapshot = makeSnapshot({ batteryPercent: 25, latitude: 14.5, longitude: 121.0 })
    const result = shouldReroute(snapshot, 'FOTON_E_TRUCKMATE', [farCharger], 90)
    expect(result.reroute).toBe(true)
    expect(result.targetChargerId).toBeDefined()
  })

  it('falls back to nearest charger when all are occupied', () => {
    const snapshot = makeSnapshot({ batteryPercent: 25, latitude: 14.5, longitude: 121.0 })
    const occupiedFar: Charger = { ...farCharger, isOccupied: true }
    const result = shouldReroute(snapshot, 'FOTON_E_TRUCKMATE', [occupiedFar], 90)
    expect(result.reroute).toBe(true)
  })

  it('returns false with empty charger list', () => {
    const snapshot = makeSnapshot({ batteryPercent: 50 })
    expect(shouldReroute(snapshot, 'AION_Y_PLUS', [], 0).reroute).toBe(false)
  })
})
