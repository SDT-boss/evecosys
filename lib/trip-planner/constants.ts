import type { VehicleModel, VehicleSpec } from './types'

export const VEHICLE_SPECS: Record<VehicleModel, VehicleSpec> = {
  AION_Y_PLUS:       { batteryKwh: 70.8, rangeKm: 600 },
  JAC_T9:            { batteryKwh: 81.0, rangeKm: 350 },
  FOTON_E_VIEW:      { batteryKwh: 55.0, rangeKm: 350 },
  FOTON_E_MILLER:    { batteryKwh: 60.0, rangeKm: 280 },
  FOTON_E_TRUCKMATE: { batteryKwh: 50.0, rangeKm: 230 },
}

export const CHARGE_TARGET_PERCENT = 80
export const MIN_BATTERY_PERCENT = 20
