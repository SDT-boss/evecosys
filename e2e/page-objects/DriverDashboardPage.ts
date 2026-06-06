/**
 * Page object for /driver (driver's main dashboard).
 */
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class DriverDashboardPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto() {
    await this.page.goto('/driver')
    await this.page.locator('h1').waitFor({ timeout: 10_000 })
  }

  async gotoTrips() {
    await this.page.goto('/driver/trips')
  }

  async expectVehicleVisible(plateNo: string) {
    await expect(this.page.getByText(plateNo)).toBeVisible({ timeout: 15_000 })
  }

  async expectNoVehicleAssigned() {
    await expect(this.page.getByText(/no vehicle assigned/i)).toBeVisible({ timeout: 8_000 })
  }

  async expectSocVisible() {
  await expect(this.page.getByText(/\d+\s*%/)).toBeVisible({ timeout: 15_000 })
  }

  async expectTripsCount(n: number) {
    await expect(this.page.getByText(new RegExp(`${n} trip`))).toBeVisible({ timeout: 10_000 })
  }
}
