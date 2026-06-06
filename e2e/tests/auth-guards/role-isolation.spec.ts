/**
 * Role isolation tests — verify that layout auth guards redirect correctly.
 * These are P0 security tests.
 *
 * Projects:
 * - Unauthenticated (no storageState)
 * - Driver-authenticated (storageState: driver.json) accessing /manager or /board
 * - Manager-authenticated accessing /driver or /board
 */
import { test, expect } from '../../fixtures/index'

const PROTECTED_ROUTES = {
  manager: ['/manager', '/manager/assets', '/manager/drivers', '/manager/users', '/manager/charging', '/manager/alerts'],
  driver: ['/driver', '/driver/trips', '/driver/alerts'],
  board: ['/board', '/board/fleet', '/board/carbon', '/board/trips'],
}

// ─── Unauthenticated access ─────────────────────────────────────────────────

test.describe('Unauthenticated — all protected routes redirect to /login', () => {
  test.use({ storageState: { cookies: [], origins: [] } }) // no session

  for (const [, routes] of Object.entries(PROTECTED_ROUTES)) {
    for (const route of routes) {
      test(`GET ${route} → /login`, async ({ page }) => {
        await page.goto(route)
        await expect(page).toHaveURL('/login', { timeout: 10_000 })
      })
    }
  }
})

// ─── Driver accessing manager/board routes ──────────────────────────────────

test.describe('Driver — cannot access /manager or /board', () => {
  test.use({ storageState: 'e2e/.auth/driver.json' })

  for (const route of PROTECTED_ROUTES.manager) {
    test(`Driver GET ${route} → /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL('/login', { timeout: 10_000 })
    })
  }

  for (const route of PROTECTED_ROUTES.board) {
    test(`Driver GET ${route} → /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL('/login', { timeout: 10_000 })
    })
  }
})

// ─── Manager accessing driver/board routes ──────────────────────────────────

test.describe('Manager — cannot access /driver or /board', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' })

  for (const route of PROTECTED_ROUTES.driver) {
    test(`Manager GET ${route} → /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL('/login', { timeout: 10_000 })
    })
  }

  for (const route of PROTECTED_ROUTES.board) {
    test(`Manager GET ${route} → /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL('/login', { timeout: 10_000 })
    })
  }
})

// ─── Board accessing manager/driver routes ──────────────────────────────────

test.describe('Board — cannot access /manager or /driver', () => {
  test.use({ storageState: 'e2e/.auth/board.json' })

  for (const route of PROTECTED_ROUTES.manager) {
    test(`Board GET ${route} → /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL('/login', { timeout: 10_000 })
    })
  }

  for (const route of PROTECTED_ROUTES.driver) {
    test(`Board GET ${route} → /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL('/login', { timeout: 10_000 })
    })
  }
})

// ─── Authenticated access to own routes ─────────────────────────────────────

test.describe('Manager — can access /manager', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' })

  test('manager can access /manager', async ({ page }) => {
    await page.goto('/manager')
    await expect(page).not.toHaveURL('/login')
    await expect(page).toHaveURL(/\/manager/)
  })
})

test.describe('Driver — can access /driver', () => {
  test.use({ storageState: 'e2e/.auth/driver.json' })

  test('driver can access /driver', async ({ page }) => {
    await page.goto('/driver')
    await expect(page).not.toHaveURL('/login')
    await expect(page).toHaveURL(/\/driver/)
  })
})

test.describe('Board — can access /board', () => {
  test.use({ storageState: 'e2e/.auth/board.json' })

  test('board can access /board', async ({ page }) => {
    await page.goto('/board')
    await expect(page).not.toHaveURL('/login')
    await expect(page).toHaveURL(/\/board/)
  })
})
