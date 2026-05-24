import { calcBehaviorScore } from '@/lib/behaviorScore'

test('calcBehaviorScore returns zeroed values for empty trips', () => {
  const r = calcBehaviorScore([])
  expect(r.overall).toBe(0)
  expect(r.efficiency).toBe(0)
})

test('calcBehaviorScore computes reasonable values', () => {
  const trips = [
    { energy_kwh: 2, distance_km: 20, avg_speed: 40, ended_at: '2026-01-01' },
    { energy_kwh: 3, distance_km: 30, avg_speed: 35, ended_at: '2026-01-02' },
  ] as any
  const r = calcBehaviorScore(trips)
  expect(typeof r.overall).toBe('number')
  expect(r.overall).toBeGreaterThanOrEqual(0)
  expect(r.overall).toBeLessThanOrEqual(100)
})
