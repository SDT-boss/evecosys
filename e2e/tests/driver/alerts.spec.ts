import { test, expect } from '../../fixtures/index'
import { AlertsPage } from '../../page-objects/AlertsPage'
import { createTestAlert, deleteTestAlert, adminClient } from '../../helpers/supabase.admin'

test.describe('Driver — Alerts', () => {
  let alertsPage: AlertsPage

  test.beforeEach(async ({ page }) => {
    alertsPage = new AlertsPage(page)
  })

  // ─── Smoke ───────────────────────────────────────────────────────────────

  test('driver alerts page loads without error', async ({ page }) => {
    await alertsPage.gotoDriver()
    await expect(page.locator('body')).not.toContainText(/error|500|not found/i)
  })

  test('driver alerts page shows filter tabs', async ({ driverVehicle }) => {
    // Filter tabs only render when a vehicle is assigned; use driverVehicle fixture
    await alertsPage.gotoDriver()
    await expect(alertsPage.allFilterBtn).toBeVisible({ timeout: 8_000 })
    await expect(alertsPage.activeFilterBtn).toBeVisible()
    await expect(alertsPage.resolvedFilterBtn).toBeVisible()
  })

  // ─── Happy paths ──────────────────────────────────────────────────────────

  test('driver can resolve their own vehicle alert', async ({ driverVehicle }) => {
    // Create an alert for the driver's own vehicle
    const alert = await createTestAlert(driverVehicle.id, {
      message: `Driver own-vehicle alert ${Date.now()}`,
    })
    try {
      await alertsPage.gotoDriver()
      await alertsPage.resolveAlert(alert.message)
      // Alert should disappear from active list
      await alertsPage.filterBy('resolved')
      await expect(alertsPage.page.getByText(alert.message)).toBeVisible({ timeout: 8_000 })
    } finally {
      await deleteTestAlert(alert.id)
    }
  })

  test('active filter shows only unresolved alerts', async ({ driverVehicle }) => {
    const alert = await createTestAlert(driverVehicle.id, {
      message: `Active filter test ${Date.now()}`,
    })
    try {
      await alertsPage.gotoDriver()
      await alertsPage.filterBy('active')
      await expect(alertsPage.page.getByText(alert.message)).toBeVisible({ timeout: 8_000 })
    } finally {
      await deleteTestAlert(alert.id)
    }
  })

  test('resolved filter shows resolved alerts', async ({ driverVehicle }) => {
    // Create an already-resolved alert for this vehicle
    const alert = await createTestAlert(driverVehicle.id, {
      message: `Resolved filter test ${Date.now()}`,
      resolved: true,
    })
    try {
      await alertsPage.gotoDriver()
      await alertsPage.filterBy('resolved')
      await expect(alertsPage.page.getByText(alert.message)).toBeVisible({ timeout: 8_000 })
    } finally {
      await deleteTestAlert(alert.id)
    }
  })

  // ─── Authorization enforcement ────────────────────────────────────────────

  test('driver cannot see alerts for vehicles not assigned to them', async ({ testVehicle }) => {
    // testVehicle is NOT assigned to the E2E driver
    const alert = await createTestAlert(testVehicle.id, {
      message: `Other vehicle alert ${Date.now()}`,
    })
    try {
      await alertsPage.gotoDriver()
      // This alert should NOT appear in the driver's alerts list (RLS enforced)
      await expect(alertsPage.page.getByText(alert.message)).not.toBeVisible({ timeout: 5_000 })
    } finally {
      await deleteTestAlert(alert.id)
    }
  })

  // ─── Edge cases ───────────────────────────────────────────────────────────

  test('empty active state shows no-alerts message when no active alerts', async ({ page }) => {
    await alertsPage.gotoDriver()
    await alertsPage.filterBy('active')
    const hasAlerts = await page.getByText(/ago/).count() > 0
    if (!hasAlerts) {
      await alertsPage.expectEmptyState('active')
    }
  })
})
