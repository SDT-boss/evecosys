/**
 * Page object for /manager/charging.
 *
 * Testability notes:
 * - Station cards have no data-testid. Add data-testid="station-card-{id}".
 * - Toggle buttons use icon only — no text, no aria-label. Add aria-label="Toggle station {name}".
 * - AddStationModal requires Leaflet map click. Map container needs data-testid="station-picker-map".
 * - "Add Station" button is stable by text role.
 */
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class ChargingPage {
  readonly page: Page
  readonly addStationButton: Locator
  readonly modal: Locator
  readonly modalNameInput: Locator
  readonly modalAddressInput: Locator
  readonly modalPowerInput: Locator
  readonly modalActiveCheckbox: Locator
  readonly modalSubmitButton: Locator
  readonly modalCancelButton: Locator
  readonly modalErrorMessage: Locator
  readonly mapContainer: Locator

  constructor(page: Page) {
    this.page = page
    this.addStationButton = page.getByRole('button', { name: /add station/i })
    this.modal = page.locator('.fixed.inset-0').filter({ has: page.getByText(/add charging station/i) })
    this.modalNameInput = this.modal.getByPlaceholder(/KLCC Charging Hub/i)
    this.modalAddressInput = this.modal.getByPlaceholder(/Kuala Lumpur/i)
    this.modalPowerInput = this.modal.getByPlaceholder('e.g. 50')
    this.modalActiveCheckbox = this.modal.locator('#isActive')
    this.modalSubmitButton = this.modal.getByRole('button', { name: /add station/i })
    this.modalCancelButton = this.modal.getByRole('button', { name: /cancel/i })
    this.modalErrorMessage = this.modal.locator('[style*="fdeaea"]')
    // Leaflet map container — needs data-testid="station-picker-map"
    this.mapContainer = this.page.locator('.leaflet-container').first()
  }

  async goto() {
    await this.page.goto('/manager/charging')
    await expect(this.addStationButton).toBeVisible()
  }

  async openAddStationModal() {
    await this.addStationButton.dispatchEvent('click')
  }

  async closeModal() {
    await this.modalCancelButton.dispatchEvent('click')
    await expect(this.modal).not.toBeVisible({ timeout: 8_000 })
  }

  /**
   * Fills the AddStation form and clicks on the map to place a pin.
   * Leaflet maps are interactive — we click within the container bounds.
   */
  async fillStationForm(params: { name: string; address: string; powerKw: string }) {
    await this.modalNameInput.fill(params.name)
    await this.modalAddressInput.fill(params.address)
    await this.modalPowerInput.fill(params.powerKw)
    // Click map to place pin — Leaflet emits a click event (loads async, give it time)
    await expect(this.mapContainer).toBeVisible({ timeout: 15_000 })
    // force:true bypasses Playwright's stability check (Leaflet tile loading causes instability)
    await this.mapContainer.click({ position: { x: 150, y: 100 }, force: true })
  }

  async submitStationForm() {
    await this.modalSubmitButton.dispatchEvent('click')
  }

  /** Returns the station card by station name. */
  stationCard(name: string): Locator {
    return this.page.locator('div').filter({ hasText: name }).first()
  }

  /** Returns the toggle button for a station by its card name text. */
  toggleButtonFor(stationName: string): Locator {
    // Use text-content filter on the button itself rather than getByRole name matching,
    // which can fail when Leaflet map children affect accessible name computation
    return this.page
      .locator('div')
      .filter({ hasText: stationName })
      .locator('button')
      .filter({ hasText: /^(activate|deactivate)$/i })
      .first()
  }

  async expectStationVisible(name: string) {
    await expect(this.stationCard(name)).toBeVisible({ timeout: 8_000 })
  }

  async expectStationCount(n: number) {
    const heading = this.page.getByText(new RegExp(`${n} stations`))
    await expect(heading).toBeVisible()
  }
}
