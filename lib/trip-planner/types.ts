export interface Coords {
  latitude: number
  longitude: number
}

export type VehicleModel =
  | 'AION_Y_PLUS'
  | 'JAC_T9'
  | 'FOTON_E_VIEW'
  | 'FOTON_E_MILLER'
  | 'FOTON_E_TRUCKMATE'

export type ReadinessStatus = 'READY' | 'LOW_BATTERY' | 'CRITICAL_BATTERY' | 'NOT_READY'

export interface Charger extends Coords {
  id: string
  type: 'DEPOT' | 'HIGHWAY'
  isOccupied: boolean
}

export interface VehicleSpec {
  batteryKwh: number
  rangeKm: number
}

export interface TripRequest {
  vehicleModel: VehicleModel
  batteryPercent: number
  origin: Coords
  destination: Coords
}

export interface TripSegment {
  from: Coords
  to: Coords
  distanceKm: number
  batteryUsedPercent: number
}

export interface ChargingStop {
  charger: Charger
  arrivalBatteryPercent: number
  chargeToPercent: number
}

export interface TripPlan {
  feasible: boolean
  totalDistanceKm: number
  segments: TripSegment[]
  chargingStops: ChargingStop[]
  estimatedChargeRequired: number
}
