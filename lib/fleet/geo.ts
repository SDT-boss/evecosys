import type { Coords, Charger } from '@/lib/fleet/types'

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

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

// Straight-line projection along a bearing.
// Prototype: bearing defaults to 0 (north) when not provided by telematics.
// Replace with road-network projection (e.g. OSRM) for production accuracy.
export function projectPosition(
  origin: Coords,
  bearingDeg: number,
  distanceKm: number
): Coords {
  if (distanceKm === 0) return { ...origin }
  const R = 6371
  const d = distanceKm / R
  const brng = toRad(bearingDeg)
  const lat1 = toRad(origin.latitude)
  const lon1 = toRad(origin.longitude)
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    )
  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
  }
}

export function getNearestCharger(
  position: Coords,
  chargers: Charger[]
): { charger: Charger; distanceKm: number } | null {
  if (chargers.length === 0) return null
  let nearest = chargers[0]
  let minDist = haversineKm(position, chargers[0])
  for (let i = 1; i < chargers.length; i++) {
    const d = haversineKm(position, chargers[i])
    if (d < minDist) { minDist = d; nearest = chargers[i] }
  }
  return { charger: nearest, distanceKm: minDist }
}
