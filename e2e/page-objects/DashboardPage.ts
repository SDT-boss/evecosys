/**
 * Base page object representing the shared DashboardShell.
 * Extended by role-specific page objects.
 *
 * Testability note: The nav items use emoji as icons with no aria-labels.
 * Add data-testid="nav-{href}" attributes to DashboardShell nav <a> tags
 * to make selectors stable. Until then, we use visible text.
 */
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly logoutButton: Locator
  readonly alertBell: Locator
  readonly userInitials: Locator

  constructor(page: Page) {
    this.page = page
    // Logout button text is "Sign out" but rendered inside a hidden panel —
    // add data-testid="logout-btn" to DashboardShell for stability.
    this.logoutButton = page.getByRole('button', { name: /sign out/i })
    // AlertBell: button with Bell icon — no aria-label. Add aria-label="Notifications" to source.
    this.alertBell = page.locator('button').filter({ has: page.locator('svg') }).nth(1)
    // User initials circle — first character of full_name
    this.userInitials = page.locator('.w-7.h-7.rounded-full')
  }

  async navTo(label: string) {
    await this.page.getByRole('link', { name: label }).click()
  }

  async logout() {
    // DashboardShell renders the logout button inside the user area.
    // Depending on layout, it may need a click to expand first.
    await this.logoutButton.click()
    await expect(this.page).toHaveURL('/login', { timeout: 10_000 })
  }

  async expectDashboardVisible() {
    // LIVE indicator is always present in the topbar
    await expect(this.page.getByText('LIVE')).toBeVisible()
  }
}
