import type { Vehicle, Charger, Shift, Coords, ScoredVehicle } from '@/lib/fleet/types'
import type { TelemetryAdapter } from '@/lib/fleet/adapters/telemetry-adapter'
import type { FleetRepository } from '@/lib/fleet/fleet-repository'
import { shouldReroute, classifyReadiness, scoreVehicle } from '@/lib/fleet/battery'
import { createDispatchEvent } from '@/lib/fleet/state-machine'
import { isShiftStarting, isShiftEnding } from '@/lib/fleet/shift-manager'

export class DispatchEngine {
  constructor(
    private telemetry: TelemetryAdapter,
    private repo: FleetRepository,
    private patrolStartCoords: Coords
  ) {}

  async evaluateFleet(): Promise<void> {
    const [vehicles, chargers, shifts] = await Promise.all([
      this.repo.getActiveVehicles(),
      this.repo.getChargers(),
      this.repo.getActiveShifts(),
    ])
    // Sequenced — not parallel — to prevent write/write race on vehicle status
    await this.evaluatePatrollingVehicles(vehicles, chargers)
    await this.evaluateShifts(shifts)
  }

  private async evaluatePatrollingVehicles(vehicles: Vehicle[], chargers: Charger[]): Promise<void> {
    const patrolling = vehicles.filter(v => v.status === 'PATROLLING')
    await Promise.all(patrolling.map(async (vehicle) => {
      const snapshot = await this.telemetry.getSnapshot(vehicle.id)
      const result = shouldReroute(snapshot, vehicle.model, chargers, snapshot.bearingDeg ?? 0)

      if (!result.reroute) return

      if (!result.targetChargerId) {
        await this.repo.notifyDispatcher(
          `CRITICAL: Vehicle ${vehicle.id} has no reachable charger`,
          { vehicleId: vehicle.id, batteryPercent: snapshot.batteryPercent }
        )
        return
      }

      const event = createDispatchEvent(
        vehicle.id, 'PATROLLING', 'ROUTING_TO_CHARGER',
        'REROUTE_TO_CHARGER', 'SYSTEM',
        { targetChargerId: result.targetChargerId }
      )
      await Promise.all([
        this.repo.updateVehicleStatus(vehicle.id, 'ROUTING_TO_CHARGER', result.targetChargerId),
        this.repo.saveDispatchEvent(event),
      ])
    }))
  }

  private async evaluateShifts(shifts: Shift[]): Promise<void> {
    const now = new Date()
    await Promise.all(shifts.map(async (shift) => {
      try {
        if (isShiftStarting(shift, now)) return await this.startShift(shift)
        if (isShiftEnding(shift, now))   return await this.endShift(shift)
      } catch (err) {
        this.repo.notifyDispatcher(
          `Shift ${shift.id} evaluation failed: ${err instanceof Error ? err.message : String(err)}`,
          { shiftId: shift.id }
        ).catch(() => { /* notification failure is non-fatal */ })
      }
    }))
  }

  private async startShift(shift: Shift): Promise<void> {
    const [snapshot, vehicle] = await Promise.all([
      this.telemetry.getSnapshot(shift.vehicleId),
      this.repo.getVehicle(shift.vehicleId),
    ])

    if (vehicle.status !== 'IDLE') {
      await this.repo.notifyDispatcher(
        `Shift ${shift.id} vehicle ${shift.vehicleId} cannot be dispatched — current status: ${vehicle.status}`,
        { shiftId: shift.id, vehicleId: shift.vehicleId, actualStatus: vehicle.status }
      )
      return
    }

    const readiness = classifyReadiness(snapshot.batteryPercent)
    if (readiness === 'NOT_READY') {
      await this.repo.notifyDispatcher(
        `Shift ${shift.id} vehicle ${shift.vehicleId} is NOT_READY at shift start`,
        { shiftId: shift.id, vehicleId: shift.vehicleId, batteryPercent: snapshot.batteryPercent }
      )
      return
    }

    const event = createDispatchEvent(
      shift.vehicleId, 'IDLE', 'DISPATCHED', 'DISPATCH', 'SYSTEM', { shiftId: shift.id }
    )
    await Promise.all([
      this.repo.updateVehicleStatus(shift.vehicleId, 'DISPATCHED', undefined),
      this.repo.saveDispatchEvent(event),
      this.repo.updateShiftStatus(shift.id, 'ACTIVE'),
    ])
  }

  private async endShift(shift: Shift): Promise<void> {
    const vehicle = await this.repo.getVehicle(shift.vehicleId)

    if (vehicle.status === 'IDLE') {
      await this.repo.updateShiftStatus(shift.id, 'COMPLETED')
      return
    }

    if (vehicle.status === 'CHARGING' || vehicle.status === 'ROUTING_TO_CHARGER') {
      await Promise.all([
        this.repo.updateShiftStatus(shift.id, 'COMPLETED'),
        this.repo.notifyDispatcher(
          `Shift ${shift.id} ended while vehicle ${vehicle.id} is ${vehicle.status} — vehicle returns to IDLE after charge completes`,
          { shiftId: shift.id, vehicleId: vehicle.id }
        ),
      ])
      return
    }

    const event = createDispatchEvent(
      shift.vehicleId, vehicle.status, 'IDLE', 'DISPATCH', 'SYSTEM',
      { shiftId: shift.id, reason: 'shift_end' }
    )
    await Promise.all([
      this.repo.updateVehicleStatus(shift.vehicleId, 'IDLE'),
      this.repo.saveDispatchEvent(event),
      this.repo.updateShiftStatus(shift.id, 'COMPLETED'),
    ])
  }

  async selectVehicleForDispatch(): Promise<ScoredVehicle | null> {
    const idleVehicles = await this.repo.getIdleVehicles()
    if (idleVehicles.length === 0) return null

    const snapshots = await Promise.all(idleVehicles.map(v => this.telemetry.getSnapshot(v.id)))

    const scored: ScoredVehicle[] = snapshots.map((snapshot, i) => ({
      vehicleId: idleVehicles[i].id,
      score:     scoreVehicle(snapshot, this.patrolStartCoords),
      readiness: classifyReadiness(snapshot.batteryPercent),
      snapshot,
    }))

    const eligible = scored.filter(s => s.readiness !== 'NOT_READY')
    if (eligible.length === 0) {
      await this.repo.notifyDispatcher(
        'coverage gap: no vehicles above minimum battery threshold',
        { vehicleIds: scored.map(s => s.vehicleId) }
      )
      return null
    }

    return eligible.sort((a, b) => b.score - a.score)[0]
  }
}
