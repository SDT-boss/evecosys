import type { Vehicle, Alert } from '@/types'

export interface FleetHealth {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  color: string
  label: string
  breakdown: {
    batteryHealth: number
    availability: number
    alertLoad: number
  }
}

export function calcFleetHealth(vehicles: Vehicle[], alerts: Alert[]): FleetHealth {
  if (vehicles.length === 0) {
    return { score: 0, grade: 'F', color: '#c02020', label: 'No data', breakdown: { batteryHealth: 0, availability: 0, alertLoad: 0 } }
  }

  // Battery health — avg SOH across fleet
  const avgSoh = vehicles.reduce((s, v) => s + v.soh, 0) / vehicles.length
  const batteryHealth = Math.round((avgSoh / 100) * 100)

  // Availability — % not in maintenance
  const available = vehicles.filter(v => v.status !== 'OFFLINE').length
  const availability = Math.round((available / vehicles.length) * 100)

  // Alert load — penalise active alerts per vehicle
  const alertsPerVehicle = alerts.length / vehicles.length
  const alertLoad = Math.round(Math.max(0, 100 - alertsPerVehicle * 20))

  const score = Math.round((batteryHealth * 0.4) + (availability * 0.35) + (alertLoad * 0.25))

  const grade: FleetHealth['grade'] =
    score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F'

  const color =
    score >= 90 ? '#5a9e2f' : score >= 75 ? '#7cc242' : score >= 60 ? '#c07800' : score >= 45 ? '#d06000' : '#c02020'

  const label =
    score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : score >= 45 ? 'At Risk' : 'Critical'

  return { score, grade, color, label, breakdown: { batteryHealth, availability, alertLoad } }
}
