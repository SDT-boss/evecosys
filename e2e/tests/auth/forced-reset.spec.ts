/**
 * Force password reset flow.
 *
 * Two describes:
 *  - serial: tests that flip force_password_reset_at in the DB (must not interleave)
 *  - parallel: pure form-validation tests with no shared DB state
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

// ─── DB-state tests (must run serially) ──────────────────────────────────────

test.describe.serial('Forced password reset — redirect flow', () => {
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
    await clearPasswordReset(driverUserId)
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(FORCED_RESET_USER.email, FORCED_RESET_USER.password)
    await expect(page).toHaveURL(/\/driver/, { timeout: 15_000 })
  })

  test('reset page: successful password update shows confirmation', async ({ page }) => {
    await page.goto('/reset-password')
    const resetPage = new ResetPasswordPage(page)
    await resetPage.fillPasswords(FORCED_RESET_USER.password, FORCED_RESET_USER.password)
    await resetPage.submit()
    const success = page.getByText(/password updated/i)
    const error = page.getByTestId('auth-error')
    await Promise.race([
      success.waitFor({ timeout: 8_000 }),
      error.waitFor({ timeout: 8_000 }),
    ])
  })
})

// ─── Form-validation tests (no DB state — run in parallel) ───────────────────

test.describe('Reset password page — form validation', () => {
  test('mismatched passwords shows error', async ({ page }) => {
    const resetPage = new ResetPasswordPage(page)
    await resetPage.goto(false)
    await resetPage.fillPasswords('newPassword123!', 'differentPassword!')
    await resetPage.submit()
    await resetPage.expectError(/passwords do not match/i)
  })

  test('password shorter than 8 chars shows error', async ({ page }) => {
    const resetPage = new ResetPasswordPage(page)
    await resetPage.goto(false)
    await resetPage.fillPasswords('short', 'short')
    await resetPage.submit()
    await resetPage.expectError(/at least 8 characters/i)
  })
})
