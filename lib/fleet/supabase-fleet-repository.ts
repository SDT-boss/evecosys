import type { SupabaseClient } from '@supabase/supabase-js'
import type { FleetRepository } from '@/lib/fleet/fleet-repository'
import type { Vehicle, Charger, Shift, DispatchEvent } from '@/lib/fleet/types'

function toVehicle(row: Record<string, unknown>): Vehicle {
  return {
    id:                row.id as string,
    model:             row.model as Vehicle['model'],
    plateNumber:       row.plate_no as string,        // evecosys uses plate_no
    status:            row.status as Vehicle['status'],
    currentShiftId:    row.current_shift_id as string | null,
    assignedChargerId: row.assigned_charger_id as string | null,
  }
}

function toCharger(row: Record<string, unknown>): Charger {
  return {
    id:         row.id as string,
    latitude:   row.latitude as number,
    longitude:  row.longitude as number,
    type:       row.type as Charger['type'],
    isOccupied: row.is_occupied as boolean,
  }
}

function toShift(row: Record<string, unknown>): Shift {
  return {
    id:          row.id as string,
    shiftNumber: row.shift_number as 1 | 2 | 3,
    startTime:   new Date(row.start_time as string),
    endTime:     new Date(row.end_time as string),
    vehicleId:   row.vehicle_id as string,
    driverIds:   (row.driver_ids as string[] | null) ?? [],
    status:      row.status as Shift['status'],
  }
}

export class SupabaseFleetRepository implements FleetRepository {
  constructor(private client: SupabaseClient) {}

  async getVehicle(vehicleId: string): Promise<Vehicle> {
    const { data, error } = await this.client
      .from('vehicles').select('*').eq('id', vehicleId).single()
    if (error) throw new Error(`getVehicle: ${error.message}`)
    return toVehicle(data)
  }

  async getActiveVehicles(): Promise<Vehicle[]> {
    const { data, error } = await this.client
      .from('vehicles').select('*')
      .not('status', 'in', '("IDLE","OFFLINE")')
    if (error) throw new Error(`getActiveVehicles: ${error.message}`)
    return (data ?? []).map(toVehicle)
  }

  async getIdleVehicles(): Promise<Vehicle[]> {
    const { data, error } = await this.client
      .from('vehicles').select('*').eq('status', 'IDLE')
    if (error) throw new Error(`getIdleVehicles: ${error.message}`)
    return (data ?? []).map(toVehicle)
  }

  async getActiveShifts(): Promise<Shift[]> {
    const { data, error } = await this.client
      .from('shifts').select('*')
      .in('status', ['SCHEDULED', 'ACTIVE'])
    if (error) throw new Error(`getActiveShifts: ${error.message}`)
    return (data ?? []).map(toShift)
  }

  async getChargers(): Promise<Charger[]> {
    // Only return active stations with coordinates — inactive or uncoordinated stations
    // cannot be used for dispatch routing.
    const { data, error } = await this.client
      .from('charging_stations')        // evecosys table name
      .select('*')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
    if (error) throw new Error(`getChargers: ${error.message}`)
    return (data ?? []).map(toCharger)
  }

  async updateVehicleStatus(
    vehicleId: string,
    status: Vehicle['status'],
    assignedChargerId?: string | null
  ): Promise<void> {
    const update: Record<string, unknown> = { status }
    if (assignedChargerId !== undefined) update.assigned_charger_id = assignedChargerId
    const { error } = await this.client.from('vehicles').update(update).eq('id', vehicleId)
    if (error) throw new Error(`updateVehicleStatus: ${error.message}`)
  }

  async updateShiftStatus(shiftId: string, status: Shift['status']): Promise<void> {
    const { error } = await this.client.from('shifts').update({ status }).eq('id', shiftId)
    if (error) throw new Error(`updateShiftStatus: ${error.message}`)
  }

  async saveDispatchEvent(event: DispatchEvent): Promise<void> {
    const { error } = await this.client.from('dispatch_events').insert({
      id:              event.id,
      vehicle_id:      event.vehicleId,
      triggered_by:    event.triggeredBy,
      action:          event.action,
      previous_status: event.previousStatus,
      new_status:      event.newStatus,
      metadata:        event.metadata ?? null,
    })
    if (error) throw new Error(`saveDispatchEvent: ${error.message}`)
  }

  async notifyDispatcher(message: string, metadata?: Record<string, unknown>): Promise<void> {
    // Prototype: log to console. Replace with push/email/dashboard alert when ready.
    console.warn('[FleetDispatch] DISPATCHER ALERT:', message, metadata)
  }
}
