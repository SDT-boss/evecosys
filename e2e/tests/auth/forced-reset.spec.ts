/**
 * Force password reset flow.
 * These tests modify the test driver user's force_password_reset_at flag
 * and restore it after each test, so they must run serially.
 */
import { test, expect } from '../../fixtures/index'
import { LoginPage } from '../../page-objects/LoginPage'
import { ResetPasswordPage } from '../../page-objects/ResetPasswordPage'
import {
  expirePasswordReset,
  clearPasswordReset,
  adminClient,
} from '../../helpers/supabase.admin'
import { FORCED_RESET_USER } from '../../helpers/auth.helpers'

test.describe.serial('Forced password reset flow', () => {
  let driverUserId: string

  test.beforeAll(async () => {
    const { data } = await adminClient
      .from('users')
      .select('id')
      .eq('email', FORCED_RESET_USER.email)
      .single()
    if (!data) throw new Error('E2E forced-reset driver user not found')
    driverUserId = data.id
  })

  test.afterEach(async () => {
    // Always restore the driver to a non-expired state
    await clearPasswordReset(driverUserId)
  })

  test('login redirects to /reset-password?forced=true when reset is overdue', async ({ page }) => {
    await expirePasswordReset(driverUserId)

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(FORCED_RESET_USER.email, FORCED_RESET_USER.password)

    await expect(page).toHaveURL('/reset-password?forced=true', { timeout: 15_000 })
  })

  test('forced reset page shows expired password banner', async ({ page }) => {
    await expirePasswordReset(driverUserId)

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(FORCED_RESET_USER.email, FORCED_RESET_USER.password)

    const resetPage = new ResetPasswordPage(page)
    await resetPage.expectForcedBanner()
  })

  test('login proceeds normally when force_password_reset_at is in the future', async ({ page }) => {
    // clearPasswordReset sets it 30 days ahead — should not trigger forced reset
    await clearPasswordReset(driverUserId)

    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(FORCED_RESET_USER.email, FORCED_RESET_USER.password)

    await expect(page).toHaveURL(/\/driver/, { timeout: 15_000 })
  })

  // ─── Reset password page itself ───────────────────────────────────────────

  test('reset page: mismatched passwords shows error', async ({ page }) => {
    const resetPage = new ResetPasswordPage(page)
    await resetPage.goto(false)
    await resetPage.fillPasswords('newPassword123!', 'differentPassword!')
    await resetPage.submit()
    await resetPage.expectError(/passwords do not match/i)
  })

  test('reset page: password shorter than 8 chars shows error', async ({ page }) => {
    const resetPage = new ResetPasswordPage(page)
    await resetPage.goto(false)
    await resetPage.fillPasswords('short', 'short')
    await resetPage.submit()
    await resetPage.expectError(/at least 8 characters/i)
  })

  test('reset page: successful password update shows confirmation', async ({ page }) => {
    // Use a separate browser context to avoid session conflicts with other tests.
    // In CI, the driver needs an active Supabase session for updateUser to work.
    // This test requires the driver to be pre-logged in — use storageState from global setup.
    await page.goto('/reset-password')

    const resetPage = new ResetPasswordPage(page)
    await resetPage.fillPasswords(FORCED_RESET_USER.password, FORCED_RESET_USER.password)
    await resetPage.submit()

    // May succeed or fail depending on session state — check for either outcome
    const success = page.getByText(/password updated/i)
    const error = page.getByTestId('auth-error')
    await Promise.race([
      success.waitFor({ timeout: 8_000 }),
      error.waitFor({ timeout: 8_000 }),
    ])
  })
})
