import { describe, it, expect } from 'vitest'
import { percentPerKm, remainingRangeKm, classifyReadiness } from '../battery'

describe('percentPerKm', () => {
  it('returns 100/rangeKm for AION_Y_PLUS', () => {
    expect(percentPerKm('AION_Y_PLUS')).toBeCloseTo(100 / 600, 5)
  })
  it('returns 100/rangeKm for FOTON_E_TRUCKMATE', () => {
    expect(percentPerKm('FOTON_E_TRUCKMATE')).toBeCloseTo(100 / 230, 5)
  })
})

describe('remainingRangeKm', () => {
  it('calculates km available before hitting MIN_BATTERY_PERCENT', () => {
    expect(remainingRangeKm(80, 'AION_Y_PLUS')).toBeCloseTo(360, 0)
  })
  it('returns 0 when battery is exactly at minimum', () => {
    expect(remainingRangeKm(20, 'AION_Y_PLUS')).toBeCloseTo(0, 1)
  })
  it('returns 0 when battery is below minimum', () => {
    expect(remainingRangeKm(10, 'AION_Y_PLUS')).toBeLessThanOrEqual(0)
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
