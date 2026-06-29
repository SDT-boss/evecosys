import type { Vehicle, Charger, Shift, DispatchEvent } from '@/lib/fleet/types'

export interface FleetRepository {
  getVehicle(vehicleId: string): Promise<Vehicle>
  getActiveVehicles(): Promise<Vehicle[]>
  getIdleVehicles(): Promise<Vehicle[]>
  getActiveShifts(): Promise<Shift[]>
  getChargers(): Promise<Charger[]>
  updateVehicleStatus(
    vehicleId: string,
    status: Vehicle['status'],
    assignedChargerId?: string | null
  ): Promise<void>
  updateShiftStatus(shiftId: string, status: Shift['status']): Promise<void>
  saveDispatchEvent(event: DispatchEvent): Promise<void>
  notifyDispatcher(message: string, metadata?: Record<string, unknown>): Promise<void>
}
