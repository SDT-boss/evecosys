import { test, expect } from '../../fixtures/index'

// Auth guards for the trip-planner / fleet-dispatch API endpoints.
// page.request carries whatever session the storageState provides.
const TRIP_BODY = {
  vehicleModel: 'AION_Y_PLUS',
  batteryPercent: 90,
  origin: { latitude: 3.139, longitude: 101.6869 },
  destination: { latitude: 3.158, longitude: 101.711 },
}

test.describe('Trip/Fleet API — unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('POST /api/trips/plan requires auth (401)', async ({ page }) => {
    const res = await page.request.post('/api/trips/plan', { data: TRIP_BODY })
    expect(res.status()).toBe(401)
  })

  test('POST /api/fleet/evaluate requires auth (401)', async ({ page }) => {
    const res = await page.request.post('/api/fleet/evaluate')
    expect(res.status()).toBe(401)
  })
})

test.describe('Fleet API — non-manager is forbidden', () => {
  test.use({ storageState: 'e2e/.auth/driver.json' })

  // fleet/evaluate is manager-only; the 403 fires before any fleet mutation,
  // so this is safe to run against staging.
  test('driver POST /api/fleet/evaluate → 403', async ({ page }) => {
    const res = await page.request.post('/api/fleet/evaluate')
    expect(res.status()).toBe(403)
  })
})
