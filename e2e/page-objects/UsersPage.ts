/**
 * Page object for /manager/users.
 *
 * Testability notes:
 * - User rows have no data-testid. Add data-testid="user-row-{id}".
 * - The create form appears inline — add data-testid="create-user-form".
 * - Password toggle button has no aria-label. Add aria-label="Show password".
 * - Role select has no id. Add id="role-select".
 */
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class UsersPage {
  readonly page: Page
  readonly addUserButton: Locator
  readonly createForm: Locator
  readonly fullNameInput: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly roleSelect: Locator
  readonly submitCreateButton: Locator
  readonly cancelCreateButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.addUserButton = page.getByRole('button', { name: /add user/i })
    // The inline create form has a green border — use that plus the heading text
    this.createForm = page.locator('div').filter({ has: page.getByText(/new user/i) }).first()
    this.fullNameInput = page.getByPlaceholder(/John Doe/i)
    this.emailInput = page.getByPlaceholder(/john@evecosys.com/i)
    // Password field inside the create form is type="password" initially
    this.passwordInput = page.locator('input[type="password"]')
    this.roleSelect = page.locator('select')
    this.submitCreateButton = this.createForm.getByRole('button', { name: /create user/i })
    this.cancelCreateButton = page.getByRole('button', { name: /cancel/i })
    this.errorMessage = page.locator('[style*="fdeaea"]')
  }

  async goto() {
    await this.page.goto('/manager/users')
    await this.page.waitForLoadState('networkidle')
  }

  async openCreateForm() {
    await this.addUserButton.click()
    await expect(this.createForm).toBeVisible()
  }

  async createUser(params: {
    fullName: string
    email: string
    password: string
    role: 'manager' | 'driver' | 'board'
  }) {
    await this.openCreateForm()
    await this.fullNameInput.fill(params.fullName)
    await this.emailInput.fill(params.email)
    await this.passwordInput.fill(params.password)
    await this.roleSelect.selectOption(params.role)
    await this.submitCreateButton.click()
  }

  async expectUserInList(email: string) {
    await expect(this.page.getByText(email)).toBeVisible({ timeout: 8_000 })
  }

  async expectError(pattern: RegExp | string) {
    await expect(this.errorMessage).toBeVisible()
    await expect(this.errorMessage).toContainText(pattern)
  }

  async expectFormClosed() {
    await expect(this.createForm).not.toBeVisible()
  }

  /** Returns the badge showing role for a user row containing the email text. */
  userRoleBadge(email: string): Locator {
    return this.page.locator('tr, [role="row"], div').filter({ hasText: email }).locator('[class*="badge"], span').first()
  }
}
