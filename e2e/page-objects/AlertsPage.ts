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
    await expect(this.allFilterBtn).toBeVisible({timeout: 15000,})
    await this.page.waitForLoadState('networkidle')
  }

  async gotoDriver() {
  await this.page.goto('/driver/alerts')
  await expect(this.page.locator('h1')).toBeVisible({
    timeout: 15000,
  })
  await this.page.waitForLoadState('networkidle')
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

  await expect(btn).toBeVisible({
    timeout: 8000,
  })

  await btn.click()

  await expect(btn).toBeHidden({
    timeout: 12000,
  })
}

  async filterBy(filter: 'all' | 'active' | 'resolved') {
  const btn = {
    all: this.allFilterBtn,
    active: this.activeFilterBtn,
    resolved: this.resolvedFilterBtn,
  }[filter]

  await expect(btn).toBeVisible()
  await expect(btn).toBeEnabled()

  await btn.click()

  await this.page.waitForLoadState('networkidle')
}

  async expectEmptyState(filter: 'active' | 'resolved') {
    const text = filter === 'active' ? /all clear — no active alerts/i : /no resolved alerts yet/i
    await expect(this.page.locator('p').filter({ hasText: text })).toBeVisible()
  }
}

