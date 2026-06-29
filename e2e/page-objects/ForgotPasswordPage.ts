import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class ForgotPasswordPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly submitButton: Locator
  readonly successMessage: Locator
  readonly errorMessage: Locator
  readonly backButton: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByPlaceholder(/you@company.com/i)
    this.submitButton = page.getByRole('button', { name: /send reset link/i })
    this.successMessage = page.getByText(/check your inbox/i)
    this.errorMessage = page.locator('[style*="fdeaea"]')
    this.backButton = page.getByRole('button', { name: /back to sign in/i })
  }

  async goto() {
    await this.page.goto('/login')
    await this.page.getByRole('button', { name: 'Forgot?' }).click()
    await expect(this.submitButton).toBeVisible()
  }

  async submitEmail(email: string) {
    await this.emailInput.fill(email)
    await this.submitButton.click()
  }

  async expectSuccessMessage() {
    await expect(this.successMessage).toBeVisible({ timeout: 8_000 })
  }
}
