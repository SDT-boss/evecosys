import { test, expect } from '../../fixtures/index'
import { LoginPage } from '../../page-objects/LoginPage'
import { TEST_USERS } from '../../helpers/auth.helpers'

test.describe('Login', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  // ─── Smoke ────────────────────────────────────────────────────────────────

  test('renders email, password, sign-in button — no Google button', async () => {
    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.signInButton).toBeVisible()
    await loginPage.expectNoGoogleButton()
  })

  // ─── Happy paths ──────────────────────────────────────────────────────────

  test('manager login redirects to /manager', async ({ page }) => {
    const { email, password } = TEST_USERS.manager
    await loginPage.login(email, password)
    await expect(page).toHaveURL(/\/manager/, { timeout: 15_000 })
  })

  test('driver login redirects to /driver', async ({ page }) => {
    const { email, password } = TEST_USERS.driver
    await loginPage.login(email, password)
    await expect(page).toHaveURL(/\/driver/, { timeout: 15_000 })
  })

  test('board login redirects to /board', async ({ page }) => {
    const { email, password } = TEST_USERS.board
    await loginPage.login(email, password)
    await expect(page).toHaveURL(/\/board/, { timeout: 15_000 })
  })

  // ─── Failure conditions ───────────────────────────────────────────────────

  test('wrong password shows error and stays on login', async ({ page }) => {
    await loginPage.login(TEST_USERS.manager.email, 'wrongpassword')
    await loginPage.expectError(/invalid email or password/i)
    await expect(page).toHaveURL('/login')
  })

  test('non-existent email shows error', async ({ page }) => {
    await loginPage.login('nobody@evecosys-test.com', 'somepassword')
    await loginPage.expectError(/invalid email or password/i)
    await expect(page).toHaveURL('/login')
  })

  test('empty submission does not call API (HTML validation)', async ({ page }) => {
    await loginPage.signInButton.click()
    // Browser native validation keeps page on login
    await expect(page).toHaveURL('/login')
    await expect(loginPage.errorMessage).not.toBeVisible()
  })

  // ─── Navigation ───────────────────────────────────────────────────────────

  test('forgot password link navigates to /forgot-password', async ({ page }) => {
    await loginPage.forgotPasswordLink.click()
    await expect(page).toHaveURL('/forgot-password')
  })

  test('sign up link navigates to /signup', async ({ page }) => {
    await loginPage.signUpLink.click()
    await expect(page).toHaveURL(/signup/)
  })
})
