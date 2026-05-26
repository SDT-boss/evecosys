import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class ResetPasswordPage {
  readonly page: Page
  readonly passwordInputs: Locator
  readonly submitButton: Locator
  readonly successMessage: Locator
  readonly errorMessage: Locator
  readonly forcedBanner: Locator

  constructor(page: Page) {
    this.page = page
    // Two password fields rendered by a map() — both have placeholder ••••••••
    this.passwordInputs = page.getByPlaceholder(/••••••••/)
    this.submitButton = page.getByRole('button', { name: /update password/i })
    this.successMessage = page.getByText(/password updated/i)
    this.errorMessage = page.locator('[style*="fdeaea"]')
    this.forcedBanner = page.getByText(/your password has expired/i)
  }

  async goto(forced = false) {
    await this.page.goto(`/reset-password${forced ? '?forced=true' : ''}`)
    await expect(this.submitButton).toBeVisible()
  }

  async fillPasswords(password: string, confirm: string) {
    await this.passwordInputs.nth(0).fill(password)
    await this.passwordInputs.nth(1).fill(confirm)
  }

  async submit() {
    await this.submitButton.click()
  }

  async expectSuccess() {
    await expect(this.successMessage).toBeVisible({ timeout: 10_000 })
  }

  async expectError(pattern: RegExp | string) {
    await expect(this.errorMessage).toBeVisible()
    await expect(this.errorMessage).toContainText(pattern)
  }

  async expectForcedBanner() {
    await expect(this.forcedBanner).toBeVisible()
  }
}
