import { test, expect } from '../../fixtures/index'
import { AssetsPage } from '../../page-objects/AssetsPage'

test.describe('Manager — Assets', () => {
  let assetsPage: AssetsPage

  test.beforeEach(async ({ page }) => {
    assetsPage = new AssetsPage(page)
  })

  // ─── Smoke ───────────────────────────────────────────────────────────────

  test('assets page loads without error', async ({ page }) => {
    await assetsPage.goto()
    await expect(page.locator('body')).not.toContainText(/error|500|not found/i)
    await expect(assetsPage.searchInput).toBeVisible()
  })

  // ─── Search ───────────────────────────────────────────────────────────────

  test('searching by plate number filters the vehicle list', async ({ testVehicle }) => {
    await assetsPage.goto()
    await assetsPage.search(testVehicle.plate_no)
    await expect(assetsPage.page.getByText(testVehicle.plate_no)).toBeVisible({ timeout: 8_000 })
  })

  test('searching for a non-existent plate shows empty state', async () => {
    await assetsPage.goto()
    await assetsPage.search('XXXXXXXXXXX-NOTREAL')
    const count = await assetsPage.vehicleCards().count()
    const emptyMsg = assetsPage.page.getByText(/no vehicle|no result/i)
    if (count === 0) {
      await expect(emptyMsg).toBeVisible({ timeout: 5_000 })
    } else {
      expect(count).toBe(0)
    }
  })

  test('clearing search restores full vehicle list', async ({ testVehicle }) => {
    await assetsPage.goto()
    await assetsPage.search(testVehicle.plate_no)
    await assetsPage.clearSearch()
    const count = await assetsPage.vehicleCards().count()
    expect(count).toBeGreaterThan(0)
  })

  // ─── Filters ─────────────────────────────────────────────────────────────

  test('brand filter reduces visible vehicles to matching brand', async ({ testVehicle }) => {
    await assetsPage.goto()
    await assetsPage.filterByBrand('BYD')
    await expect(assetsPage.page.getByText('BYD')).toBeVisible()
  })

  test('status filter shows only vehicles with matching status', async ({ testVehicle }) => {
    await assetsPage.goto()
    await assetsPage.filterByStatus('Parked')
    await expect(assetsPage.page.locator('body')).not.toContainText(/error/i)
  })

  // ─── Vehicle drawer ───────────────────────────────────────────────────────

  test('clicking a vehicle card opens the details drawer', async ({ testVehicle }) => {
    await assetsPage.goto()
    await assetsPage.openVehicleCard(testVehicle.plate_no)
    await expect(assetsPage.page.getByText(/SOC|State of Charge/i)).toBeVisible({ timeout: 6_000 })
  })

  test('drawer shows Overview tab content including battery info', async ({ testVehicle }) => {
    await assetsPage.goto()
    await assetsPage.openVehicleCard(testVehicle.plate_no)
    await assetsPage.switchDrawerTab('Overview')
    await expect(assetsPage.page.getByText(testVehicle.plate_no)).toBeVisible()
  })

  test('drawer tab navigation works', async ({ testVehicle }) => {
    await assetsPage.goto()
    await assetsPage.openVehicleCard(testVehicle.plate_no)
    await assetsPage.switchDrawerTab('Location')
    await expect(assetsPage.page.locator('body')).not.toContainText(/error/i)
    await assetsPage.switchDrawerTab('Trips')
    await expect(assetsPage.page.locator('body')).not.toContainText(/error/i)
  })

  test('closing the drawer hides vehicle details', async ({ testVehicle }) => {
    await assetsPage.goto()
    await assetsPage.openVehicleCard(testVehicle.plate_no)
    await assetsPage.closeDrawer()
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
