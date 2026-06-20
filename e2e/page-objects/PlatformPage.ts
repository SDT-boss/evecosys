/**
 * Page object for the Platform Admin area (/platform).
 * Provides typed locators and action helpers for tenant-switcher E2E specs.
 */
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class PlatformPage {
  readonly page: Page
  readonly activeTenantIndicator: Locator
  readonly tenantListHeading: Locator

  constructor(page: Page) {
    this.page = page
    this.activeTenantIndicator = page.getByTestId('active-tenant-indicator')
    this.tenantListHeading = page.getByRole('heading', { name: /tenant list/i })
  }

  async goto() {
    await this.page.goto('/platform')
    await expect(this.tenantListHeading).toBeVisible({ timeout: 5000 })
  }

  async clickTenantRow(tenantName: string) {
    await this.page
      .getByRole('button', { name: `Set ${tenantName} as active workspace` })
      .click()
  }

  async expectActiveTenantName(name: string) {
    await expect(this.activeTenantIndicator).toContainText(name, { timeout: 5000 })
  }

  async expectBlockedScreen() {
    await expect(
      this.page.getByText('Select a workspace to continue'),
    ).toBeVisible({ timeout: 5000 })
  }

  async expectSwitchError() {
    await expect(
      this.page.getByText(/Failed to switch workspace/i),
    ).toBeVisible({ timeout: 5000 })
  }
}
