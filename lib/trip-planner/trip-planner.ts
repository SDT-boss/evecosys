import type { TripRequest, TripPlan, TripSegment, ChargingStop, Coords, Charger, VehicleModel } from '@/lib/trip-planner/types'
import { haversineKm, getNearestChargerAlongRoute } from '@/lib/trip-planner/geo'
import { percentPerKm, remainingRangeKm } from '@/lib/trip-planner/battery'
import { CHARGE_TARGET_PERCENT } from '@/lib/trip-planner/constants'

export function planTrip(request: TripRequest, availableChargers: Charger[]): TripPlan {
  const totalDistanceKm = haversineKm(request.origin, request.destination)
  return planLeg(
    request.origin,
    request.destination,
    request.vehicleModel,
    request.batteryPercent,
    availableChargers,
    totalDistanceKm
  )
}

function planLeg(
  from: Coords,
  to: Coords,
  model: VehicleModel,
  batteryPercent: number,
  chargers: Charger[],
  totalDistanceKm: number,
  accumulatedSegments: TripSegment[] = [],
  accumulatedStops: ChargingStop[] = [],
  accumulatedBatteryUsed: number = 0
): TripPlan {
  const legDistanceKm = haversineKm(from, to)
  const range = remainingRangeKm(batteryPercent, model)
  const batteryNeeded = legDistanceKm * percentPerKm(model)

  if (range >= legDistanceKm) {
    const segment: TripSegment = {
      from, to,
      distanceKm: legDistanceKm,
      batteryUsedPercent: batteryNeeded,
    }
    return {
      feasible: true,
      totalDistanceKm,
      segments: [...accumulatedSegments, segment],
      chargingStops: accumulatedStops,
      estimatedChargeRequired: accumulatedBatteryUsed + batteryNeeded,
    }
  }

  // Need a charging stop — find the best reachable charger.
  // Use full battery capacity (not remainingRangeKm) for charger reachability:
  // the 20% MIN_BATTERY reserve is a destination-arrival constraint, not an
  // intermediate-charger constraint — the vehicle will recharge at this stop.
  const rawRange = batteryPercent / percentPerKm(model)
  const reachable = chargers.filter(c => haversineKm(from, c) <= rawRange)
  const best = getNearestChargerAlongRoute(to, reachable)

  if (!best) {
    return {
      feasible: false,
      totalDistanceKm,
      segments: [],
      chargingStops: [],
      estimatedChargeRequired: accumulatedBatteryUsed + batteryNeeded,
    }
  }

  const legToCharger = haversineKm(from, best)
  const batteryAtCharger = Math.max(0, batteryPercent - legToCharger * percentPerKm(model))
  const segmentToCharger: TripSegment = {
    from, to: best,
    distanceKm: legToCharger,
    batteryUsedPercent: batteryPercent - batteryAtCharger,
  }
  const stop: ChargingStop = {
    charger: best,
    arrivalBatteryPercent: batteryAtCharger,
    chargeToPercent: CHARGE_TARGET_PERCENT,
  }

  return planLeg(
    best, to, model,
    CHARGE_TARGET_PERCENT,
    chargers,
    totalDistanceKm,
    [...accumulatedSegments, segmentToCharger],
    [...accumulatedStops, stop],
    accumulatedBatteryUsed + segmentToCharger.batteryUsedPercent
  )
}
