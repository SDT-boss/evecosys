/**
 * Page object for both /manager/alerts and /driver/alerts.
 * Both use filter tabs (All / Active / Resolved) and a resolve button.
 *
 * Testability notes:
 * - Alert rows have no data-testid. Add data-testid="alert-row-{id}" to the row div.
 * - Resolve button has no aria-label beyond text. Add aria-label="Resolve alert {id}".
 * - Filter buttons use text only — stable enough, but add data-testid="filter-{key}" for robustness.
 */
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class AlertsPage {
  readonly page: Page
  readonly allFilterBtn: Locator
  readonly activeFilterBtn: Locator
  readonly resolvedFilterBtn: Locator
  readonly errorBanner: Locator

  constructor(page: Page) {
    this.page = page
    this.allFilterBtn = page.getByRole('button', { name: /^all/i })
    this.activeFilterBtn = page.getByRole('button', { name: /^active/i })
    this.resolvedFilterBtn = page.getByRole('button', { name: /^resolved/i })
    this.errorBanner = page.locator('[style*="fdeaea"]')
  }

  async gotoManager() {
    await this.page.goto('/manager/alerts')
    await expect(this.allFilterBtn).toBeVisible()
  }

  async gotoDriver() {
    await this.page.goto('/driver/alerts')
    // Wait for the h1 heading — present in both states (vehicle assigned or not)
    await this.page.locator('h1').waitFor({ timeout: 8_000 })
  }

  /** Returns all visible alert row containers. */
  alertRows() {
    return this.page.locator('[style*="border-top"]').filter({
      has: this.page.getByText(/ago/),
    })
  }

  /** Returns the resolve button for a specific alert by its message text. */
  resolveButtonFor(alertMessage: string): Locator {
    // Match "✓ Resolve" (manager) or "✓ Mark Resolved" (driver) — not the "Resolved (N)" filter tab
    return this.page
      .locator('div')
      .filter({ hasText: alertMessage })
      .getByRole('button', { name: /^✓/ })
      .first()
  }

  async resolveAlert(alertMessage: string) {
    const btn = this.resolveButtonFor(alertMessage)
    await expect(btn).toBeVisible({ timeout: 8_000 })
    // Read active count before clicking — we'll wait for it to decrease as confirmation
    const activeBtnText = await this.activeFilterBtn.textContent()
    const prevCount = parseInt(activeBtnText?.match(/\d+/)?.[0] ?? '1', 10) || 1
    // dispatchEvent bypasses CSS transition stability check on the resolve button
    await btn.dispatchEvent('click')
    // Wait for the "Active (N)" counter to decrease — confirms state updated after resolve
    await expect(this.activeFilterBtn).toContainText(
      new RegExp(`\\(${Math.max(0, prevCount - 1)}\\)`),
      { timeout: 12_000 },
    )
  }

  async filterBy(filter: 'all' | 'active' | 'resolved') {
    const btns = { all: this.allFilterBtn, active: this.activeFilterBtn, resolved: this.resolvedFilterBtn }
    await btns[filter].click()
  }

  async expectEmptyState(filter: 'active' | 'resolved') {
    const text = filter === 'active' ? /all clear — no active alerts/i : /no resolved alerts yet/i
    await expect(this.page.locator('p').filter({ hasText: text })).toBeVisible()
  }
}
