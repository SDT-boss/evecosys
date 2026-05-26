import { test, expect } from '../../fixtures/index'
import { UsersPage } from '../../page-objects/UsersPage'
import { driverPayload, managerPayload, ephemeralEmail } from '../../test-data/factories'
import { adminClient } from '../../helpers/supabase.admin'

test.describe('Manager — User Management', () => {
  let usersPage: UsersPage

  test.beforeEach(async ({ page }) => {
    usersPage = new UsersPage(page)
    await usersPage.goto()
  })

  // ─── Smoke ───────────────────────────────────────────────────────────────

  test('users page loads with Add User button', async () => {
    await expect(usersPage.addUserButton).toBeVisible()
  })

  // ─── Happy paths ──────────────────────────────────────────────────────────

  test('manager can create a new driver user', async () => {
    const driver = driverPayload()
    await usersPage.createUser(driver)
    await usersPage.expectUserInList(driver.email)
    // Cleanup — delete the ephemeral user
    const { data } = await adminClient.from('users').select('id').eq('email', driver.email).single()
    if (data) {
      await adminClient.from('users').delete().eq('id', data.id)
      await adminClient.auth.admin.deleteUser(data.id)
    }
  })

  test('manager can create a manager-role user', async () => {
    const mgr = managerPayload()
    await usersPage.createUser(mgr)
    await usersPage.expectUserInList(mgr.email)
    const { data } = await adminClient.from('users').select('id').eq('email', mgr.email).single()
    if (data) {
      await adminClient.from('users').delete().eq('id', data.id)
      await adminClient.auth.admin.deleteUser(data.id)
    }
  })

  test('create form closes after successful submission', async () => {
    const driver = driverPayload()
    await usersPage.createUser(driver)
    await usersPage.expectFormClosed()
    // Cleanup
    const { data } = await adminClient.from('users').select('id').eq('email', driver.email).single()
    if (data) {
      await adminClient.from('users').delete().eq('id', data.id)
      await adminClient.auth.admin.deleteUser(data.id)
    }
  })

  test('Add User / Cancel toggles the form', async () => {
    await usersPage.openCreateForm()
    await expect(usersPage.createForm).toBeVisible()
    await usersPage.cancelCreateButton.click()
    await usersPage.expectFormClosed()
  })

  // ─── Failure conditions ──────────────────────────────────────────────────

  test('submitting with duplicate email shows error', async ({ page }) => {
    // Use an already-existing test user email
    const existingEmail = 'e2e-manager@evecosys-test.com'
    await usersPage.openCreateForm()
    await usersPage.fullNameInput.fill('Duplicate')
    await usersPage.emailInput.fill(existingEmail)
    await usersPage.passwordInput.fill('TestPassword123!')
    await usersPage.submitCreateButton.click()
    await usersPage.expectError(/email|already|exists/i)
  })

  test('submitting with password under 8 chars shows error', async () => {
    await usersPage.openCreateForm()
    await usersPage.fullNameInput.fill('Short Pass')
    await usersPage.emailInput.fill(ephemeralEmail())
    await usersPage.passwordInput.fill('short')
    await usersPage.submitCreateButton.click()
    await usersPage.expectError(/at least 8 characters/i)
  })

  // ─── Edge cases ───────────────────────────────────────────────────────────

  test('new user appears at the top of the list (most recent first)', async ({ page }) => {
    const driver = driverPayload()
    await usersPage.createUser(driver)
    // The new user's email should appear in the first user row
    const rows = page.locator('div').filter({ hasText: /@evecosys-test.com/ })
    await expect(rows.first()).toContainText(driver.email, { timeout: 8_000 })
    // Cleanup
    const { data } = await adminClient.from('users').select('id').eq('email', driver.email).single()
    if (data) {
      await adminClient.from('users').delete().eq('id', data.id)
      await adminClient.auth.admin.deleteUser(data.id)
    }
  })
})
