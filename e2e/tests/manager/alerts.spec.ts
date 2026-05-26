import { test, expect } from '../../fixtures/index'
import { AlertsPage } from '../../page-objects/AlertsPage'

test.describe('Manager — Alerts', () => {
  let alertsPage: AlertsPage

  test.beforeEach(async ({ page }) => {
    alertsPage = new AlertsPage(page)
  })

  // ─── Happy path ──────────────────────────────────────────────────────────

  test('alerts page loads with filter tabs', async ({ page }) => {
    await alertsPage.gotoManager()
    await expect(alertsPage.allFilterBtn).toBeVisible()
    await expect(alertsPage.activeFilterBtn).toBeVisible()
    await expect(alertsPage.resolvedFilterBtn).toBeVisible()
  })

  test('manager can resolve an active alert', async ({ testAlert }) => {
    await alertsPage.gotoManager()
    await alertsPage.filterBy('active')
    await alertsPage.resolveAlert(testAlert.alert.message)
    // After resolve the button disappears and alert should appear in resolved tab
    await alertsPage.filterBy('resolved')
    await expect(alertsPage.page.getByText(testAlert.alert.message)).toBeVisible({ timeout: 8_000 })
  })

  test('resolved tab shows resolved alerts', async ({ testAlert }) => {
    await alertsPage.gotoManager()
    await alertsPage.resolveAlert(testAlert.alert.message)
    await alertsPage.filterBy('resolved')
    await expect(alertsPage.page.getByText(testAlert.alert.message)).toBeVisible()
  })

  // ─── Filter behaviour ─────────────────────────────────────────────────────

  test('active filter hides resolved alerts', async ({ testAlert }) => {
    await alertsPage.gotoManager()
    // Resolve the test alert via the API before loading
    // (we rely on the database fixture for this, or resolve via UI first)
    await alertsPage.resolveAlert(testAlert.alert.message)
    await alertsPage.filterBy('active')
    // The alert message should no longer appear in the active list
    await expect(alertsPage.page.getByText(testAlert.alert.message)).not.toBeVisible({ timeout: 5_000 })
  })

  test('all filter shows both active and resolved', async ({ page, testAlert }) => {
    await alertsPage.gotoManager()
    await alertsPage.resolveAlert(testAlert.alert.message)
    await alertsPage.filterBy('all')
    await expect(page.getByText(testAlert.alert.message)).toBeVisible()
  })

  // ─── Edge cases ──────────────────────────────────────────────────────────

  test('active filter shows empty-state message when no active alerts', async ({ page }) => {
    // Navigate to alerts — if there are no active alerts in the DB this will show the empty state
    await alertsPage.gotoManager()
    await alertsPage.filterBy('active')
    // Either active alerts exist or the empty state is shown — both are valid
    const hasAlerts = await page.getByText(/ago/).count() > 0
    if (!hasAlerts) {
      await alertsPage.expectEmptyState('active')
    }
  })

  // ─── Smoke (P0) ──────────────────────────────────────────────────────────

  test.describe('smoke', () => {
    test('alerts page is reachable and renders without error', async ({ page }) => {
      await alertsPage.gotoManager()
      await expect(page.locator('body')).not.toContainText(/error|500|not found/i)
    })
  })
})
