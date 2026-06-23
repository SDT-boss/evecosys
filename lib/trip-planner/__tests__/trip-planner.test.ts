import { describe, it, expect } from 'vitest'
import { planTrip } from '../trip-planner'
import type { TripRequest, Charger } from '../types'

const origin      = { latitude: 14.5, longitude: 121.0 }
const nearDest    = { latitude: 14.6, longitude: 121.1 }   // ~14km away
const farDest     = { latitude: 16.5, longitude: 123.0 }   // ~340km away

const midCharger: Charger = {
  id: 'mid', latitude: 15.0, longitude: 121.5, type: 'HIGHWAY', isOccupied: false,
}

function request(overrides: Partial<TripRequest> = {}): TripRequest {
  return {
    vehicleModel: 'AION_Y_PLUS',
    batteryPercent: 80,
    origin,
    destination: nearDest,
    ...overrides,
  }
}

describe('planTrip — direct trip (no stops)', () => {
  it('returns feasible plan with one segment and no charging stops', () => {
    const plan = planTrip(request(), [])
    expect(plan.feasible).toBe(true)
    expect(plan.chargingStops).toHaveLength(0)
    expect(plan.segments).toHaveLength(1)
    expect(plan.totalDistanceKm).toBeGreaterThan(0)
  })

  it('segment distanceKm matches totalDistanceKm', () => {
    const plan = planTrip(request(), [])
    expect(plan.segments[0].distanceKm).toBeCloseTo(plan.totalDistanceKm, 2)
  })

  it('estimatedChargeRequired is positive and less than batteryPercent', () => {
    const plan = planTrip(request(), [])
    expect(plan.estimatedChargeRequired).toBeGreaterThan(0)
    expect(plan.estimatedChargeRequired).toBeLessThan(80)
  })
})

describe('planTrip — trip requiring a charging stop', () => {
  it('returns feasible plan with one charging stop when battery is too low for full route', () => {
    const plan = planTrip(
      request({ destination: farDest, batteryPercent: 30 }),
      [midCharger]
    )
    expect(plan.feasible).toBe(true)
    expect(plan.chargingStops).toHaveLength(1)
    expect(plan.chargingStops[0].charger.id).toBe('mid')
    expect(plan.chargingStops[0].chargeToPercent).toBe(80)
    expect(plan.segments.length).toBeGreaterThanOrEqual(2)
  })

  it('charging stop arrivalBatteryPercent is less than chargeToPercent', () => {
    const plan = planTrip(
      request({ destination: farDest, batteryPercent: 30 }),
      [midCharger]
    )
    const stop = plan.chargingStops[0]
    expect(stop.arrivalBatteryPercent).toBeLessThan(stop.chargeToPercent)
  })
})

describe('planTrip — infeasible routes', () => {
  it('returns feasible: false when no chargers exist and battery is too low', () => {
    const plan = planTrip(request({ destination: farDest, batteryPercent: 10 }), [])
    expect(plan.feasible).toBe(false)
    expect(plan.segments).toHaveLength(0)
    expect(plan.chargingStops).toHaveLength(0)
  })

  it('returns feasible: false when all chargers are occupied', () => {
    const occupied: Charger = { ...midCharger, isOccupied: true }
    const plan = planTrip(
      request({ destination: farDest, batteryPercent: 10 }),
      [occupied]
    )
    expect(plan.feasible).toBe(false)
  })
})
