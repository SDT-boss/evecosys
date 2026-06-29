import type { Coords, Charger } from '@/lib/trip-planner/types'

export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Returns the unoccupied charger closest to the destination — minimises total trip detour.
export function getNearestChargerAlongRoute(
  destination: Coords,
  chargers: Charger[]
): Charger | null {
  const candidates = chargers.filter(c => !c.isOccupied)
  if (candidates.length === 0) return null
  return candidates.reduce((best, c) =>
    haversineKm(c, destination) < haversineKm(best, destination) ? c : best
  )
}
