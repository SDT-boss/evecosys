/**
 * Tenant switcher E2E specs — SWIT-01 through SWIT-04.
 * Tests are stubbed with test.skip() in Wave 0.
 * Full implementation ships in plan 03-03 after Wave 1 + Wave 2 source changes land.
 */
import { test, expect } from '../../fixtures/index'
import { PlatformPage } from '../../page-objects/PlatformPage'

test.describe('tenant-switcher SWIT-01/02/03 loading, success, error', () => {
  test.use({ storageState: 'e2e/.auth/platform-admin.json' })

  test.skip('row click shows Spinner and locks other rows (SWIT-01)', async ({ page }) => {
    const platform = new PlatformPage(page)
    await platform.goto()
    // Implementation: click a tenant row, assert spinner is visible on that row,
    // assert other rows have aria-disabled="true" and pointer-events: none.
    expect(page).toBeDefined()
  })

  test.skip('successful switch updates ActiveTenantIndicator header (SWIT-02)', async ({ page }) => {
    const platform = new PlatformPage(page)
    await platform.goto()
    // Implementation: click a tenant row, wait for transition to complete,
    // assert activeTenantIndicator contains the selected tenant name.
    expect(page).toBeDefined()
  })

  test.skip('error state shows inline Alert when switch fails (SWIT-03)', async ({ page }) => {
    const platform = new PlatformPage(page)
    await platform.goto()
    // Implementation: mock setActiveTenant to return { ok: false, error: '...' },
    // click a tenant row, assert destructive Alert is visible above the list.
    expect(page).toBeDefined()
  })
})

test.describe('tenant-switcher SWIT-04 blocked screen', () => {
  test.use({ storageState: 'e2e/.auth/platform-admin.json' })

  test.skip('navigating to sub-route without active tenant shows BlockedScreen (SWIT-04)', async ({ page }) => {
    const platform = new PlatformPage(page)
    // Implementation: ensure no active tenant cookie, navigate to a platform sub-route,
    // assert BlockedScreen with "Select a workspace to continue" is visible.
    await platform.expectBlockedScreen()
  })
})
