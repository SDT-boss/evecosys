import { test, expect } from '../../fixtures/index'

// Trip planner is backend-only (no UI yet), so we exercise the API directly.
// These run in the `manager` project, so page.request carries a manager session.
const VALID_BODY = {
  vehicleModel: 'AION_Y_PLUS',
  batteryPercent: 90,
  origin: { latitude: 3.139, longitude: 101.6869 },      // ~KLCC
  destination: { latitude: 3.158, longitude: 101.711 },  // a few km away
}

test.describe('Manager — Trip Planner API', () => {
  test('POST /api/trips/plan returns a plan for valid input', async ({ page }) => {
    const res = await page.request.post('/api/trips/plan', { data: VALID_BODY })
    expect(res.status()).toBe(200)
    const plan = await res.json()
    expect(typeof plan.feasible).toBe('boolean')
    expect(typeof plan.totalDistanceKm).toBe('number')
    expect(plan.totalDistanceKm).toBeGreaterThan(0)
    expect(Array.isArray(plan.segments)).toBe(true)
    expect(Array.isArray(plan.chargingStops)).toBe(true)
  })

  test('POST /api/trips/plan rejects an unknown vehicle model (400)', async ({ page }) => {
    const res = await page.request.post('/api/trips/plan', {
      data: { ...VALID_BODY, vehicleModel: 'TESLA_MODEL_3' },
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/trips/plan rejects out-of-range battery (400)', async ({ page }) => {
    const res = await page.request.post('/api/trips/plan', {
      data: { ...VALID_BODY, batteryPercent: 250 },
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/trips/plan rejects missing coordinates (400)', async ({ page }) => {
    const res = await page.request.post('/api/trips/plan', {
      data: { ...VALID_BODY, destination: {} },
    })
    expect(res.status()).toBe(400)
  })
})
