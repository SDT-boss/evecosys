import type { VehicleModel, ReadinessStatus } from './types'
import { VEHICLE_SPECS, MIN_BATTERY_PERCENT } from './constants'

export function percentPerKm(model: VehicleModel): number {
  return 100 / VEHICLE_SPECS[model].rangeKm
}

export function remainingRangeKm(batteryPercent: number, model: VehicleModel): number {
  return (batteryPercent - MIN_BATTERY_PERCENT) / percentPerKm(model)
}

export function classifyReadiness(batteryPercent: number): ReadinessStatus {
  if (batteryPercent > 50) return 'READY'
  if (batteryPercent > 30) return 'LOW_BATTERY'
  if (batteryPercent > 20) return 'CRITICAL_BATTERY'
  return 'NOT_READY'
}
