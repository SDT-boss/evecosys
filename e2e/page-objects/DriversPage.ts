/**
 * Page object for /manager/drivers.
 *
 * Testability notes:
 * - Driver cards have no data-testid. Add data-testid="driver-card-{id}".
 * - "Assign Vehicle" button per driver card — add data-testid="assign-btn-{driverId}".
 * - AssignVehicleModal vehicle select dropdown is a native <select> — accessible via label text.
 * - Modal tab buttons (All/Assigned/Unassigned) are stable by text.
 */
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class DriversPage {
  readonly page: Page
  readonly modal: Locator
  readonly vehicleSelect: Locator
  readonly confirmAssignButton: Locator
  readonly unassignButton: Locator
  readonly modalCloseButton: Locator
  readonly modalErrorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.modal = page.locator('.fixed.inset-0').filter({ has: page.getByText(/assign vehicle/i) })
    this.vehicleSelect = this.modal.locator('select')
    this.confirmAssignButton = this.modal.getByRole('button', { name: /confirm assign/i })
    // Use exact match to avoid matching the "Unassigned" tab button
    this.unassignButton = this.modal.getByRole('button', { name: 'Unassign', exact: true })
    this.modalCloseButton = this.modal.getByRole('button').filter({ has: page.locator('svg') }).first()
    this.modalErrorMessage = this.modal.locator('[style*="fdeaea"]')
  }

  async goto() {
    await this.page.goto('/manager/drivers')
  }

  /** Opens the assign modal for the driver row containing the given name. */
  async openAssignModalFor(driverName: string) {
    const card = this.driverCard(driverName)
    await card.getByRole('button', { name: /assign vehicle/i }).click()
    await expect(this.modal).toBeVisible()
  }

  async selectVehicle(plateNo: string) {
    // Options have value=vehicleId and label="Brand Model · PlateNo"
    // Playwright's selectOption({ label }) only accepts strings, not RegExp
    const opt = this.modal.locator('option').filter({ hasText: plateNo }).first()
    const val = await opt.getAttribute('value')
    await this.vehicleSelect.selectOption(val ?? '')
  }

  async confirmAssign() {
    await this.confirmAssignButton.click()
    await expect(this.modal).not.toBeVisible({ timeout: 8_000 })
  }

  async unassign() {
    await this.unassignButton.click()
    await expect(this.modal).not.toBeVisible({ timeout: 8_000 })
  }

  async closeModal() {
    await this.modalCloseButton.click()
    await expect(this.modal).not.toBeVisible()
  }

  /** Locates the specific driver card for driverName. */
  driverCard(driverName: string): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: driverName })
      .filter({ has: this.page.getByRole('button', { name: /assign vehicle/i }) })
      .last()
  }

  async expectAssignedVehicleVisible(driverName: string, vehicleInfo: string) {
    const card = this.driverCard(driverName)
    await expect(card.getByText(vehicleInfo)).toBeVisible({ timeout: 15_000 })
  }
}
