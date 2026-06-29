import type { Shift } from '@/lib/fleet/types'
import { SHIFT_SCHEDULE } from '@/lib/fleet/constants'

export function getCurrentShiftNumber(now: Date = new Date()): 1 | 2 | 3 {
  const hour = now.getHours()
  for (const s of SHIFT_SCHEDULE) {
    if (s.startHour < s.endHour) {
      if (hour >= s.startHour && hour < s.endHour) return s.shiftNumber
    } else {
      if (hour >= s.startHour || hour < s.endHour) return s.shiftNumber
    }
  }
  return 1
}

export function isShiftStarting(shift: Shift, now: Date = new Date()): boolean {
  return shift.status === 'SCHEDULED' && shift.startTime <= now
}

export function isShiftEnding(shift: Shift, now: Date = new Date()): boolean {
  return shift.status === 'ACTIVE' && shift.endTime <= now
}

export function buildShiftTimes(
  shiftNumber: 1 | 2 | 3,
  date: Date
): { startTime: Date; endTime: Date } {
  const schedule = SHIFT_SCHEDULE.find(s => s.shiftNumber === shiftNumber)!
  const startTime = new Date(date)
  startTime.setHours(schedule.startHour, 0, 0, 0)
  const endTime = new Date(date)
  endTime.setHours(schedule.endHour, 0, 0, 0)
  if (schedule.startHour > schedule.endHour) {
    endTime.setDate(endTime.getDate() + 1)
  }
  return { startTime, endTime }
}
