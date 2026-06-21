import { describe, it, expect } from 'vitest'
import { getCurrentShiftNumber, isShiftStarting, isShiftEnding, buildShiftTimes } from '../shift-manager'
import type { Shift } from '../types'

const makeShift = (overrides: Partial<Shift> = {}): Shift => ({
  id: 's1', shiftNumber: 1,
  startTime: new Date('2026-06-20T06:00:00'),
  endTime: new Date('2026-06-20T14:00:00'),
  vehicleId: 'v1', driverIds: ['d1', 'd2', 'd3'], status: 'SCHEDULED',
  ...overrides,
})

describe('getCurrentShiftNumber', () => {
  it('returns 1 at 06:00', () => expect(getCurrentShiftNumber(new Date('2026-06-20T06:00:00'))).toBe(1))
  it('returns 1 at 13:59', () => expect(getCurrentShiftNumber(new Date('2026-06-20T13:59:00'))).toBe(1))
  it('returns 2 at 14:00', () => expect(getCurrentShiftNumber(new Date('2026-06-20T14:00:00'))).toBe(2))
  it('returns 2 at 21:59', () => expect(getCurrentShiftNumber(new Date('2026-06-20T21:59:00'))).toBe(2))
  it('returns 3 at 22:00', () => expect(getCurrentShiftNumber(new Date('2026-06-20T22:00:00'))).toBe(3))
  it('returns 3 at 02:00 (crosses midnight)', () => expect(getCurrentShiftNumber(new Date('2026-06-21T02:00:00'))).toBe(3))
  it('returns 3 at 05:59 (just before shift 1)', () => expect(getCurrentShiftNumber(new Date('2026-06-20T05:59:00'))).toBe(3))
})

describe('isShiftStarting', () => {
  it('returns true when SCHEDULED and startTime has passed', () => {
    const shift = makeShift({ status: 'SCHEDULED', startTime: new Date('2026-06-20T06:00:00') })
    expect(isShiftStarting(shift, new Date('2026-06-20T06:01:00'))).toBe(true)
  })
  it('returns false when already ACTIVE', () => {
    const shift = makeShift({ status: 'ACTIVE', startTime: new Date('2026-06-20T06:00:00') })
    expect(isShiftStarting(shift, new Date('2026-06-20T06:01:00'))).toBe(false)
  })
  it('returns false when startTime is in the future', () => {
    const shift = makeShift({ status: 'SCHEDULED', startTime: new Date('2026-06-20T08:00:00') })
    expect(isShiftStarting(shift, new Date('2026-06-20T06:00:00'))).toBe(false)
  })
})

describe('isShiftEnding', () => {
  it('returns true when ACTIVE and endTime has passed', () => {
    const shift = makeShift({ status: 'ACTIVE', endTime: new Date('2026-06-20T14:00:00') })
    expect(isShiftEnding(shift, new Date('2026-06-20T14:01:00'))).toBe(true)
  })
  it('returns false when not ACTIVE', () => {
    const shift = makeShift({ status: 'SCHEDULED', endTime: new Date('2026-06-20T14:00:00') })
    expect(isShiftEnding(shift, new Date('2026-06-20T14:01:00'))).toBe(false)
  })
})

describe('buildShiftTimes', () => {
  it('builds correct times for shift 1', () => {
    const { startTime, endTime } = buildShiftTimes(1, new Date('2026-06-20'))
    expect(startTime.getHours()).toBe(6)
    expect(endTime.getHours()).toBe(14)
    expect(endTime.getDate()).toBe(startTime.getDate())
  })
  it('shift 3 end is next day', () => {
    const { startTime, endTime } = buildShiftTimes(3, new Date('2026-06-20'))
    expect(startTime.getHours()).toBe(22)
    expect(endTime.getHours()).toBe(6)
    expect(endTime.getDate()).toBe(startTime.getDate() + 1)
  })
})
