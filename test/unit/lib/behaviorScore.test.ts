import { calcBehaviorScore } from '@/lib/behaviorScore'
import type { Trip } from '@/types'

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 't1', vehicle_id: 'v1', driver_id: 'd1',
    origin: 'A', destination: 'B',
    distance_km: 20, energy_kwh: 3, duration_min: 30,
    avg_speed: 40, started_at: '2026-01-01T08:00:00Z',
    ended_at: '2026-01-01T08:30:00Z',
    ...overrides,
  }
}

describe('calcBehaviorScore', () => {
  it('returns zeroed F-grade values for empty trips', () => {
    const r = calcBehaviorScore([])
    expect(r.overall).toBe(0)
    expect(r.efficiency).toBe(0)
    expect(r.smoothness).toBe(0)
    expect(r.consistency).toBe(0)
    expect(r.grade).toBe('F')
    expect(r.label).toBe('No data')
  })

  it('scores are in 0–100 range for normal trips', () => {
    const r = calcBehaviorScore([trip(), trip()])
    expect(r.overall).toBeGreaterThanOrEqual(0)
    expect(r.overall).toBeLessThanOrEqual(100)
    expect(r.efficiency).toBeGreaterThanOrEqual(0)
    expect(r.efficiency).toBeLessThanOrEqual(100)
    expect(r.smoothness).toBeGreaterThanOrEqual(0)
    expect(r.smoothness).toBeLessThanOrEqual(100)
    expect(r.consistency).toBeGreaterThanOrEqual(0)
    expect(r.consistency).toBeLessThanOrEqual(100)
  })

  it('assigns grade A for excellent drivers (low speed, ideal efficiency, all completed)', () => {
    const trips = [
      trip({ energy_kwh: 3, distance_km: 20, avg_speed: 30, ended_at: '2026-01-01' }),
      trip({ energy_kwh: 3, distance_km: 20, avg_speed: 30, ended_at: '2026-01-02' }),
    ]
    const r = calcBehaviorScore(trips)
    expect(r.grade).toBe('A')
    expect(r.label).toBe('Excellent')
    expect(r.color).toBe('#5a9e2f')
  })

  it('penalises poor efficiency (high kWh per km)', () => {
    const efficient = [trip({ energy_kwh: 3, distance_km: 20, avg_speed: 30 })]
    const inefficient = [trip({ energy_kwh: 10, distance_km: 20, avg_speed: 30 })]
    const r1 = calcBehaviorScore(efficient)
    const r2 = calcBehaviorScore(inefficient)
    expect(r1.efficiency).toBeGreaterThan(r2.efficiency)
  })

  it('penalises high average speed', () => {
    const slow = [trip({ avg_speed: 30 })]
    const fast = [trip({ avg_speed: 90 })]
    const r1 = calcBehaviorScore(slow)
    const r2 = calcBehaviorScore(fast)
    expect(r1.smoothness).toBeGreaterThan(r2.smoothness)
  })

  it('penalises incomplete trips (missing ended_at)', () => {
    const allDone = [trip(), trip()]
    const halfDone = [trip(), trip({ ended_at: '' })]
    const r1 = calcBehaviorScore(allDone)
    const r2 = calcBehaviorScore(halfDone)
    expect(r1.consistency).toBeGreaterThan(r2.consistency)
  })

  it('skips distance_km === 0 trips for efficiency calculation', () => {
    const trips = [trip({ distance_km: 0 })]
    const r = calcBehaviorScore(trips)
    expect(r.overall).toBeGreaterThanOrEqual(0)
  })

  it('assigns correct grade thresholds', () => {
    expect(calcBehaviorScore([trip({ energy_kwh: 3, distance_km: 20, avg_speed: 30 })]).grade).toBe('A')
    const poorTrips = [
      trip({ energy_kwh: 12, distance_km: 20, avg_speed: 100, ended_at: '' }),
      trip({ energy_kwh: 12, distance_km: 20, avg_speed: 100, ended_at: '' }),
    ]
    expect(calcBehaviorScore(poorTrips).grade).toBe('F')
  })
})
