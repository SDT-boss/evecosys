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

export type VehicleStatus =
  | 'IDLE'
  | 'DISPATCHED'
  | 'PATROLLING'
  | 'ROUTING_TO_CHARGER'
  | 'CHARGING'
  | 'OFFLINE'

export type ReadinessStatus = 'READY' | 'LOW_BATTERY' | 'CRITICAL_BATTERY' | 'NOT_READY'

export type DispatchAction =
  | 'DISPATCH'
  | 'REROUTE_TO_CHARGER'
  | 'RETURN_TO_PATROL'
  | 'OVERRIDE'

export interface Vehicle {
  id: string
  model: VehicleModel
  plateNumber: string
  status: VehicleStatus
  currentShiftId: string | null
  assignedChargerId: string | null
}

export interface TelemetrySnapshot extends Coords {
  vehicleId: string
  batteryPercent: number   // 0–100
  speedKmh: number
  bearingDeg?: number      // 0–360, optional — populated by real telematics adapter
  timestamp: Date
}

export interface Charger extends Coords {
  id: string
  type: 'DEPOT' | 'HIGHWAY'
  isOccupied: boolean
}

export interface Shift {
  id: string
  shiftNumber: 1 | 2 | 3
  startTime: Date
  endTime: Date
  vehicleId: string
  driverIds: string[]
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED'
}

export interface DispatchEvent {
  id: string
  vehicleId: string
  triggeredBy: 'SYSTEM' | 'DISPATCHER'
  action: DispatchAction
  previousStatus: VehicleStatus
  newStatus: VehicleStatus
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface VehicleSpec {
  batteryKwh: number
  rangeKm: number
}

export interface ShiftScheduleEntry {
  shiftNumber: 1 | 2 | 3
  startHour: number
  endHour: number
}

export interface RerouteResult {
  reroute: boolean
  targetChargerId?: string
}

export interface ScoredVehicle {
  vehicleId: string
  score: number
  readiness: ReadinessStatus
  snapshot: TelemetrySnapshot
}
