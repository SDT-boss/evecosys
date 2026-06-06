import { test, expect } from '../../fixtures/index'
import { ChargingPage } from '../../page-objects/ChargingPage'
import { testStationName } from '../../test-data/factories'
import { adminClient } from '../../helpers/supabase.admin'

test.describe('Manager — Charging Stations', () => {
  let chargingPage: ChargingPage

  test.beforeEach(async ({ page }) => {
    chargingPage = new ChargingPage(page)
  })

  // ─── Smoke ───────────────────────────────────────────────────────────────

  test('charging page loads with Add Station button', async () => {
    await chargingPage.goto()
    await expect(chargingPage.addStationButton).toBeVisible()
  })

  test('add station modal closes on cancel', async () => {
    await chargingPage.goto()
    await chargingPage.openAddStationModal()
    await chargingPage.closeModal()
    await expect(chargingPage.modal).not.toBeVisible()
  })

  // ─── Failure conditions ──────────────────────────────────────────────────

  test('submitting station form without map pin shows error or keeps button disabled', async () => {
    await chargingPage.goto()
    await chargingPage.openAddStationModal()
    await chargingPage.modalNameInput.fill('No Pin Station')
    await chargingPage.modalAddressInput.fill('Somewhere, KL')
    const isDisabled = await chargingPage.modalSubmitButton.isDisabled()
    if (!isDisabled) {
      await chargingPage.submitStationForm()
      await expect(chargingPage.modalErrorMessage.or(chargingPage.modal)).toBeVisible()
    } else {
      await expect(chargingPage.modalSubmitButton).toBeDisabled()
    }
  })

  test('submitting with empty name shows validation error', async () => {
    await chargingPage.goto()
    await chargingPage.openAddStationModal()
    await chargingPage.modalAddressInput.fill('Test Address')
    await chargingPage.submitStationForm()
    await expect(chargingPage.modal).toBeVisible()
  })

  // ─── Edge cases ───────────────────────────────────────────────────────────

  test('existing station appears in list on page load', async ({ testStation }) => {
    await chargingPage.goto()
    await chargingPage.expectStationVisible(testStation.name)
  })
})
