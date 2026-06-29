import { test, expect } from '../../fixtures/index'
import { ForgotPasswordPage } from '../../page-objects/ForgotPasswordPage'

test.describe('Forgot Password', () => {
  let page_: ForgotPasswordPage

  test.beforeEach(async ({ page }) => {
    page_ = new ForgotPasswordPage(page)
    await page_.goto()
  })

  test('renders email input and send reset link button', async () => {
    await expect(page_.emailInput).toBeVisible()
    await expect(page_.submitButton).toBeVisible()
  })

  test('submitting a valid email shows confirmation message', async () => {
    await page_.submitEmail('test@evecosys-test.com')
    await page_.expectSuccessMessage()
  })

  test('confirmation message shows the submitted email', async ({ page }) => {
    const email = 'test@evecosys-test.com'
    await page_.submitEmail(email)
    await expect(page.getByText(email)).toBeVisible({ timeout: 8_000 })
  })

  test('submitting a non-existent email still shows confirmation (no user enumeration)', async () => {
    // Supabase returns success even for non-existent emails to prevent enumeration
    await page_.submitEmail('definitelynotreal@evecosys-test.com')
    await page_.expectSuccessMessage()
  })

  test('back to sign in button returns to sign-in form', async ({ page }) => {
    await page_.backButton.click()
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('empty submit triggers native validation, stays on page', async ({ page }) => {
    await page_.submitButton.click()
    await expect(page).toHaveURL('/login')
    await expect(page_.successMessage).not.toBeVisible()
  })
})
