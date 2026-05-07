import type { Trip } from '@/types'

export interface BehaviorScore {
  overall: number
  smoothness: number   // based on avg speed variance
  efficiency: number   // energy per km
  consistency: number  // trip completion rate
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  color: string
  label: string
}

export function calcBehaviorScore(trips: Trip[]): BehaviorScore {
  if (trips.length === 0) {
    return { overall: 0, smoothness: 0, efficiency: 0, consistency: 0, grade: 'F', color: '#c02020', label: 'No data' }
  }

  // Efficiency: kWh per km — ideal is ~0.15–0.20, penalise above 0.25
  const avgEfficiency = trips.reduce((s, t) => {
    if (!t.distance_km || t.distance_km === 0) return s
    return s + (t.energy_kwh / t.distance_km)
  }, 0) / trips.length

  const effScore = Math.min(100, Math.max(0, Math.round((1 - (avgEfficiency - 0.15) / 0.15) * 100)))

  // Smoothness: penalise high avg speeds (>60 km/h = aggressive)
  const avgSpeed = trips.reduce((s, t) => s + (t.avg_speed ?? 0), 0) / trips.length
  const smoothScore = Math.min(100, Math.max(0, Math.round(100 - ((avgSpeed - 30) / 40) * 50)))

  // Consistency: ratio of completed trips (ended_at not null)
  const completed = trips.filter(t => t.ended_at).length
  const consistScore = Math.round((completed / trips.length) * 100)

  const overall = Math.round((effScore * 0.4) + (smoothScore * 0.35) + (consistScore * 0.25))

  const grade: BehaviorScore['grade'] =
    overall >= 90 ? 'A' :
    overall >= 75 ? 'B' :
    overall >= 60 ? 'C' :
    overall >= 45 ? 'D' : 'F'

  const color =
    overall >= 90 ? '#5a9e2f' :
    overall >= 75 ? '#7cc242' :
    overall >= 60 ? '#c07800' :
    overall >= 45 ? '#d06000' : '#c02020'

  const label =
    overall >= 90 ? 'Excellent' :
    overall >= 75 ? 'Good' :
    overall >= 60 ? 'Average' :
    overall >= 45 ? 'Below Average' : 'Poor'

  return { overall, smoothness: smoothScore, efficiency: effScore, consistency: consistScore, grade, color, label }
}
