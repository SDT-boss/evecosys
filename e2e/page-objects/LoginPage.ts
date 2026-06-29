import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly signInButton: Locator
  readonly errorMessage: Locator
  readonly forgotPasswordButton: Locator
  readonly googleButton: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByPlaceholder(/you@company.com/i)
    this.passwordInput = page.getByPlaceholder(/••••••••/)
    this.signInButton = page.getByRole('button', { name: /sign in/i })
    this.errorMessage = page.getByTestId('auth-error')
    this.forgotPasswordButton = page.getByRole('button', { name: 'Forgot?' })
    this.googleButton = page.getByRole('button', { name: /continue with google/i })
  }

  async goto() {
    await this.page.goto('/login')
    await expect(this.signInButton).toBeVisible()
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.signInButton.click()
  }

  async expectError(pattern: RegExp | string) {
    await expect(this.errorMessage).toBeVisible()
    await expect(this.errorMessage).toContainText(pattern)
  }

  async expectNoGoogleButton() {
    await expect(this.googleButton).not.toBeVisible()
  }

  async expectOnPage() {
    await expect(this.page).toHaveURL('/login')
    await expect(this.signInButton).toBeVisible()
  }
}
