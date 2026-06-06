import { test, expect } from '../../fixtures/index'
import { DriversPage } from '../../page-objects/DriversPage'

test.describe('Manager — Driver Management', () => {
  let driversPage: DriversPage

  test.beforeEach(async ({ page }) => {
    driversPage = new DriversPage(page)
  })

  // ─── Smoke ───────────────────────────────────────────────────────────────

  test('drivers page loads without error', async ({ page }) => {
    await driversPage.goto()
    await expect(page.locator('body')).not.toContainText(/error|500|not found/i)
  })

  // ─── Happy paths ──────────────────────────────────────────────────────────

  test('manager can assign a vehicle to a driver', async ({ page, testVehicle }) => {
    await driversPage.goto()
    await driversPage.openAssignModalFor('E2E Driver')
    await driversPage.selectVehicle(testVehicle.plate_no)
    await driversPage.confirmAssign()
    await driversPage.expectAssignedVehicleVisible('E2E Driver', testVehicle.plate_no)
  })

  test('manager can unassign a vehicle from a driver', async ({ page, driverVehicle }) => {
    await driversPage.goto()
    await driversPage.openAssignModalFor('E2E Driver')
    await driversPage.unassign()
    const card = driversPage.driverCard('E2E Driver')
    await expect(card.getByText(driverVehicle.plate_no)).not.toBeVisible({ timeout: 8_000 })
  })

  test('assign modal can be cancelled without changing assignment', async ({ driverVehicle }) => {
    await driversPage.goto()
    await driversPage.openAssignModalFor('E2E Driver')
    await driversPage.closeModal()
    await driversPage.expectAssignedVehicleVisible('E2E Driver', driverVehicle.plate_no)
  })

  // ─── Failure conditions ──────────────────────────────────────────────────

  test('assign modal shows no available vehicles when all are taken', async ({ driverVehicle }) => {
    await driversPage.goto()
    await driversPage.openAssignModalFor('E2E Driver')
    await expect(driversPage.modal).toBeVisible()
  })

  // ─── Edge cases ───────────────────────────────────────────────────────────

  test('driver list shows assigned vehicle after assignment', async ({ testVehicle }) => {
    await driversPage.goto()
    await driversPage.openAssignModalFor('E2E Driver')
    await driversPage.selectVehicle(testVehicle.plate_no)
    await driversPage.confirmAssign()
    const card = driversPage.driverCard('E2E Driver')
    await expect(card.getByText(testVehicle.plate_no)).toBeVisible({ timeout: 8_000 })
  })
})
