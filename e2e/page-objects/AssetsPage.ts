/**
 * Page object for /manager/assets.
 *
 * Testability notes:
 * - Vehicle cards have no data-testid. Add data-testid="vehicle-card-{id}".
 * - Brand filter buttons use text — stable.
 * - Status filter buttons use text — stable.
 * - Search input has a placeholder — stable.
 * - VehicleDrawer tabs (overview/location/carbon/trips) use button text — stable.
 * - VehicleDrawer close button has no aria-label. Add aria-label="Close vehicle details".
 */
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class AssetsPage {
  readonly page: Page
  readonly searchInput: Locator
  readonly drawer: Locator
  readonly drawerCloseButton: Locator

  constructor(page: Page) {
    this.page = page
    this.searchInput = page.getByPlaceholder(/search vehicle, plate/i)
    // VehicleDrawer is a fixed panel with a specific title pattern
    this.drawer = page.locator('.fixed').filter({ has: page.locator('[class*="rounded"]') }).last()
    this.drawerCloseButton = page.locator('button').filter({ has: page.locator('svg') }).last()
  }

  async goto() {
    await this.page.goto('/manager/assets')
    await expect(this.searchInput).toBeVisible()
  }

  async search(text: string) {
    await this.searchInput.fill(text)
  }

  async clearSearch() {
    await this.searchInput.clear()
  }

  async filterByBrand(brand: string) {
    await this.page.getByRole('button', { name: new RegExp(`^${brand}`, 'i') }).first().click()
  }

  async filterByStatus(status: string) {
    await this.page.getByRole('button', { name: status, exact: true }).click()
  }

  /** Returns all visible vehicle card elements. */
  vehicleCards(): Locator {
    // Cards are grid cells containing SOC percentage text
    return this.page.locator('div').filter({ has: this.page.getByText(/\d+\s*%/) }).filter({
      has: this.page.locator('[class*="plate"]').or(this.page.getByText(/SOC/i)),
    })
  }

  async openVehicleCard(plateNo: string) {
    await this.page.getByText(plateNo, { exact: true }).first().click()
    await expect(this.page.getByText(/SOC|State of Charge/i).first()).toBeVisible({ timeout: 5_000 })
  }

  async switchDrawerTab(tabName: 'Overview' | 'Location' | 'Carbon' | 'Trips') {
    await this.drawer.getByRole('button', { name: tabName, exact: true }).click()
  }

  async closeDrawer() {
    // X close button is the first button in the drawer panel
    await this.drawer.getByRole('button').first().click()
  }

  async expectVehicleCount(n: number) {
    const cards = this.vehicleCards()
    await expect(cards).toHaveCount(n, { timeout: 8_000 })
  }
}
