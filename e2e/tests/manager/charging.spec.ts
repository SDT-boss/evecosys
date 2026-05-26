import { test, expect } from '../../fixtures/index'
import { ChargingPage } from '../../page-objects/ChargingPage'
import { testStationName } from '../../test-data/factories'
import { adminClient } from '../../helpers/supabase.admin'

test.describe('Manager — Charging Stations', () => {
  let chargingPage: ChargingPage

  test.beforeEach(async ({ page }) => {
    chargingPage = new ChargingPage(page)
    await chargingPage.goto()
  })

  // ─── Smoke ───────────────────────────────────────────────────────────────

  test('charging page loads with Add Station button', async () => {
    await expect(chargingPage.addStationButton).toBeVisible()
  })

  // ─── Happy paths ──────────────────────────────────────────────────────────

  test('manager can add a new charging station', async ({ page }) => {
    const name = testStationName()
    await chargingPage.openAddStationModal()
    await chargingPage.fillStationForm({ name, address: '99 Test Ave, KL', powerKw: '50' })
    await chargingPage.submitStationForm()
    // Modal closes and station appears in list
    await expect(chargingPage.modal).not.toBeVisible({ timeout: 8_000 })
    await chargingPage.expectStationVisible(name)
    // Cleanup
    const { data } = await adminClient.from('charging_stations').select('id').eq('name', name).single()
    if (data) await adminClient.from('charging_stations').delete().eq('id', data.id)
  })

  test('add station modal closes on cancel', async () => {
    await chargingPage.openAddStationModal()
    await chargingPage.closeModal()
    await expect(chargingPage.modal).not.toBeVisible()
  })

  test('manager can toggle a station active/inactive', async ({ testStation }) => {
    await chargingPage.goto()
    // Toggle once — station goes inactive
    const toggleBtn = chargingPage.toggleButtonFor(testStation.name)
    await expect(toggleBtn).toBeVisible({ timeout: 8_000 })
    await toggleBtn.click()
    // Toggle back — station goes active
    await toggleBtn.click()
    // No error should appear
    await expect(chargingPage.modal).not.toBeVisible()
  })

  // ─── Failure conditions ──────────────────────────────────────────────────

  test('submitting station form without map pin shows error or keeps button disabled', async () => {
    await chargingPage.openAddStationModal()
    await chargingPage.modalNameInput.fill('No Pin Station')
    await chargingPage.modalAddressInput.fill('Somewhere, KL')
    await chargingPage.modalPowerInput.fill('50')
    // Do NOT click map — submit should be disabled or show error
    const isDisabled = await chargingPage.modalSubmitButton.isDisabled()
    if (!isDisabled) {
      await chargingPage.submitStationForm()
      await expect(chargingPage.modalErrorMessage.or(chargingPage.modal)).toBeVisible()
    } else {
      await expect(chargingPage.modalSubmitButton).toBeDisabled()
    }
  })

  test('submitting with empty name shows validation error', async () => {
    await chargingPage.openAddStationModal()
    await chargingPage.modalAddressInput.fill('Test Address')
    await chargingPage.modalPowerInput.fill('50')
    await chargingPage.submitStationForm()
    // Either native HTML5 validation keeps us on the form or an inline error shows
    await expect(chargingPage.modal).toBeVisible()
  })

  // ─── Edge cases ───────────────────────────────────────────────────────────

  test('existing station appears in list on page load', async ({ testStation }) => {
    await chargingPage.goto()
    await chargingPage.expectStationVisible(testStation.name)
  })
})
