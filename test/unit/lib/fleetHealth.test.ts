import { calcFleetHealth } from '@/lib/fleetHealth'

test('calcFleetHealth returns base values for empty arrays', () => {
  const r = calcFleetHealth([], [])
  expect(r.score).toBe(0)
})

test('calcFleetHealth computes within expected range', () => {
  const vehicles = [{ soh: 90, status: 'Active' }, { soh: 80, status: 'Maintenance' }] as any
  const alerts = [{}, {}] as any
  const r = calcFleetHealth(vehicles, alerts)
  expect(typeof r.score).toBe('number')
  expect(r.score).toBeGreaterThanOrEqual(0)
  expect(r.score).toBeLessThanOrEqual(100)
})
