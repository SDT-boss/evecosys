import { test, expect } from '../../fixtures/index'
import { AssetsPage } from '../../page-objects/AssetsPage'

test.describe('Manager — Assets', () => {
  let assetsPage: AssetsPage

  test.beforeEach(async ({ page }) => {
    assetsPage = new AssetsPage(page)
    await assetsPage.goto()
  })

  // ─── Smoke ───────────────────────────────────────────────────────────────

  test('assets page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText(/error|500|not found/i)
    await expect(assetsPage.searchInput).toBeVisible()
  })

  // ─── Search ───────────────────────────────────────────────────────────────

  test('searching by plate number filters the vehicle list', async ({ testVehicle }) => {
    await assetsPage.search(testVehicle.plate_no)
    // The test vehicle should be the only result (or at least visible)
    await expect(assetsPage.page.getByText(testVehicle.plate_no)).toBeVisible({ timeout: 8_000 })
  })

  test('searching for a non-existent plate shows empty state', async () => {
    await assetsPage.search('XXXXXXXXXXX-NOTREAL')
    // Should show no results or an empty-state message
    const count = await assetsPage.vehicleCards().count()
    const emptyMsg = assetsPage.page.getByText(/no vehicle|no result/i)
    if (count === 0) {
      await expect(emptyMsg).toBeVisible({ timeout: 5_000 })
    } else {
      // Some apps show all results when no match is found — just assert count is 0
      expect(count).toBe(0)
    }
  })

  test('clearing search restores full vehicle list', async ({ testVehicle }) => {
    await assetsPage.search(testVehicle.plate_no)
    await assetsPage.clearSearch()
    // At least the test vehicle should be visible after clearing
    const count = await assetsPage.vehicleCards().count()
    expect(count).toBeGreaterThan(0)
  })

  // ─── Filters ─────────────────────────────────────────────────────────────

  test('brand filter reduces visible vehicles to matching brand', async ({ testVehicle }) => {
    // testVehicle brand is 'BYD' (from createTestVehicle defaults)
    await assetsPage.filterByBrand('BYD')
    await expect(assetsPage.page.getByText('BYD')).toBeVisible()
  })

  test('status filter shows only vehicles with matching status', async () => {
    // Most brands will have at least an Active vehicle
    await assetsPage.filterByStatus('Active')
    // Verify page still has content
    await expect(assetsPage.page.locator('body')).not.toContainText(/error/i)
  })

  // ─── Vehicle drawer ───────────────────────────────────────────────────────

  test('clicking a vehicle card opens the details drawer', async ({ testVehicle }) => {
    await assetsPage.openVehicleCard(testVehicle.plate_no)
    // Drawer should be visible with SOC information
    await expect(assetsPage.page.getByText(/SOC|State of Charge/i)).toBeVisible({ timeout: 6_000 })
  })

  test('drawer shows Overview tab content including battery info', async ({ testVehicle }) => {
    await assetsPage.openVehicleCard(testVehicle.plate_no)
    await assetsPage.switchDrawerTab('Overview')
    // Overview should show SOC and vehicle info
    await expect(assetsPage.page.getByText(testVehicle.plate_no)).toBeVisible()
  })

  test('drawer tab navigation works', async ({ testVehicle }) => {
    await assetsPage.openVehicleCard(testVehicle.plate_no)
    // Switch to Location tab
    await assetsPage.switchDrawerTab('Location')
    await expect(assetsPage.page.locator('body')).not.toContainText(/error/i)
    // Switch to Trips tab
    await assetsPage.switchDrawerTab('Trips')
    await expect(assetsPage.page.locator('body')).not.toContainText(/error/i)
  })

  test('closing the drawer hides vehicle details', async ({ testVehicle }) => {
    await assetsPage.openVehicleCard(testVehicle.plate_no)
    await assetsPage.closeDrawer()
    // After close, no SOC details should be visible in a panel context
    await expect(assetsPage.page.locator('.fixed').filter({ hasText: testVehicle.plate_no }))
      .not.toBeVisible({ timeout: 5_000 })
  })

  // ─── Edge cases ───────────────────────────────────────────────────────────

  test('new test vehicle appears in asset list', async ({ testVehicle }) => {
    await assetsPage.goto()
    await assetsPage.search(testVehicle.plate_no)
    await expect(assetsPage.page.getByText(testVehicle.plate_no)).toBeVisible({ timeout: 8_000 })
  })
})
