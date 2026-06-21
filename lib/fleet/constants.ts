import type { VehicleModel, VehicleSpec, ShiftScheduleEntry } from './types'

export const VEHICLE_SPECS: Record<VehicleModel, VehicleSpec> = {
  AION_Y_PLUS:       { batteryKwh: 70.8, rangeKm: 600 },
  JAC_T9:            { batteryKwh: 81.0, rangeKm: 350 },
  FOTON_E_VIEW:      { batteryKwh: 55.0, rangeKm: 350 },
  FOTON_E_MILLER:    { batteryKwh: 60.0, rangeKm: 280 },
  FOTON_E_TRUCKMATE: { batteryKwh: 50.0, rangeKm: 230 },
}

export const CHARGE_TARGET_PERCENT = 80
export const REROUTE_THRESHOLD_PERCENT = 20
export const REROUTE_PROXIMITY_KM = 5
export const ARRIVAL_RADIUS_M = 200
export const FLEET_EVALUATE_INTERVAL_MS = 30_000

export const SHIFT_SCHEDULE: ShiftScheduleEntry[] = [
  { shiftNumber: 1, startHour: 6,  endHour: 14 },
  { shiftNumber: 2, startHour: 14, endHour: 22 },
  { shiftNumber: 3, startHour: 22, endHour: 6  },
]
