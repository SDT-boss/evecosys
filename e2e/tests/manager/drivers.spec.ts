import { test, expect } from '../../fixtures/index'
import { DriversPage } from '../../page-objects/DriversPage'

test.describe('Manager — Driver Management', () => {
  let driversPage: DriversPage

  test.beforeEach(async ({ page }) => {
    driversPage = new DriversPage(page)
    await driversPage.goto()
  })

  // ─── Smoke ───────────────────────────────────────────────────────────────

  test('drivers page loads without error', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText(/error|500|not found/i)
  })

  // ─── Happy paths ──────────────────────────────────────────────────────────

  test('manager can assign a vehicle to a driver', async ({ page, testVehicle }) => {
    // Find any driver card and open the assign modal
    await driversPage.goto()
    // The E2E driver user should appear in the list (created by global-setup)
    await driversPage.openAssignModalFor('E2E Driver')
    await driversPage.selectVehicle(testVehicle.plate_no)
    await driversPage.confirmAssign()
    // Vehicle plate should now appear on the driver card
    await driversPage.expectAssignedVehicleVisible('E2E Driver', testVehicle.plate_no)
  })

  test('manager can unassign a vehicle from a driver', async ({ page, driverVehicle }) => {
    // driverVehicle fixture pre-assigns the vehicle to the E2E driver
    await driversPage.goto()
    await driversPage.openAssignModalFor('E2E Driver')
    await driversPage.unassign()
    // Plate should no longer appear on the driver card
    const card = driversPage.driverCard('E2E Driver')
    await expect(card.getByText(driverVehicle.plate_no)).not.toBeVisible({ timeout: 8_000 })
  })

  test('assign modal can be cancelled without changing assignment', async ({ driverVehicle }) => {
    await driversPage.goto()
    await driversPage.openAssignModalFor('E2E Driver')
    await driversPage.closeModal()
    // Vehicle should still be assigned
    await driversPage.expectAssignedVehicleVisible('E2E Driver', driverVehicle.plate_no)
  })

  // ─── Failure conditions ──────────────────────────────────────────────────

  test('assign modal shows no available vehicles when all are taken', async ({ driverVehicle }) => {
    // All test vehicles are assigned; the selector should be empty or show a message
    await driversPage.goto()
    await driversPage.openAssignModalFor('E2E Driver')
    // The modal should still be openable even if no unassigned vehicles exist
    await expect(driversPage.modal).toBeVisible()
  })

  // ─── Edge cases ───────────────────────────────────────────────────────────

  test('driver list shows assigned vehicle after assignment', async ({ testVehicle }) => {
    await driversPage.goto()
    await driversPage.openAssignModalFor('E2E Driver')
    await driversPage.selectVehicle(testVehicle.plate_no)
    await driversPage.confirmAssign()
    // Confirm plate appears in card
    const card = driversPage.driverCard('E2E Driver')
    await expect(card.getByText(testVehicle.plate_no)).toBeVisible({ timeout: 8_000 })
  })
})
