import type { TelemetrySnapshot, VehicleModel, Charger, ReadinessStatus, RerouteResult, Coords } from './types'
import { VEHICLE_SPECS, REROUTE_THRESHOLD_PERCENT, REROUTE_PROXIMITY_KM } from './constants'
import { haversineKm, projectPosition, getNearestCharger } from './geo'

export function percentPerKm(model: VehicleModel): number {
  return 100 / VEHICLE_SPECS[model].rangeKm
}

export function remainingRangeKm(snapshot: TelemetrySnapshot, model: VehicleModel): number {
  return (snapshot.batteryPercent - REROUTE_THRESHOLD_PERCENT) / percentPerKm(model)
}

export function classifyReadiness(batteryPercent: number): ReadinessStatus {
  if (batteryPercent > 50) return 'READY'
  if (batteryPercent > 30) return 'LOW_BATTERY'
  if (batteryPercent > 20) return 'CRITICAL_BATTERY'
  return 'NOT_READY'
}

export function scoreVehicle(snapshot: TelemetrySnapshot, patrolStartCoords: Coords): number {
  const batteryScore   = (snapshot.batteryPercent / 100) * 60
  const distanceKm     = haversineKm(snapshot, patrolStartCoords)
  const proximityScore = Math.max(0, 1 - distanceKm / 200) * 40
  return batteryScore + proximityScore
}

export function shouldReroute(
  snapshot: TelemetrySnapshot,
  model: VehicleModel,
  chargers: Charger[],
  bearingDeg: number = 0
): RerouteResult {
  if (chargers.length === 0) return { reroute: false }

  const rangeKm = remainingRangeKm(snapshot, model)

  const nearestNow = getNearestCharger(snapshot, chargers)
  if (nearestNow && nearestNow.distanceKm <= REROUTE_PROXIMITY_KM && !nearestNow.charger.isOccupied) {
    return { reroute: false }
  }

  const projected = projectPosition(snapshot, bearingDeg, rangeKm)
  const nearestAtProjected = getNearestCharger(projected, chargers)

  if (nearestAtProjected && nearestAtProjected.distanceKm <= REROUTE_PROXIMITY_KM) {
    return { reroute: false }
  }

  const reachableUnoccupied = chargers
    .filter(c => !c.isOccupied && haversineKm(snapshot, c) <= rangeKm)
    .sort((a, b) => haversineKm(snapshot, a) - haversineKm(snapshot, b))

  if (reachableUnoccupied.length > 0) {
    return { reroute: true, targetChargerId: reachableUnoccupied[0].id }
  }

  const nearest = getNearestCharger(snapshot, chargers)
  return { reroute: true, targetChargerId: nearest?.charger.id }
}
