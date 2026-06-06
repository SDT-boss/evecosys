/**
 * Role isolation — middleware auth-guard smoke tests.
 * One representative route per role×route-namespace combination.
 * Full per-route coverage is overkill: the middleware either fires or it doesn't.
 */
import { test, expect } from '../../fixtures/index'

// ─── Unauthenticated ─────────────────────────────────────────────────────────

test.describe('Unauthenticated — protected routes redirect to /login', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('GET /manager → /login', async ({ page }) => {
    await page.goto('/manager')
    await expect(page).toHaveURL('/login', { timeout: 10_000 })
  })

  test('GET /driver → /login', async ({ page }) => {
    await page.goto('/driver')
    await expect(page).toHaveURL('/login', { timeout: 10_000 })
  })

  test('GET /board → /login', async ({ page }) => {
    await page.goto('/board')
    await expect(page).toHaveURL('/login', { timeout: 10_000 })
  })
})

// ─── Driver accessing manager / board ────────────────────────────────────────

test.describe('Driver — cannot access /manager or /board', () => {
  test.use({ storageState: 'e2e/.auth/driver.json' })

  test('Driver GET /manager → /driver', async ({ page }) => {
    await page.goto('/manager')
    await expect(page).toHaveURL(/\/driver/, { timeout: 10_000 })
  })

  test('Driver GET /board → /driver', async ({ page }) => {
    await page.goto('/board')
    await expect(page).toHaveURL(/\/driver/, { timeout: 10_000 })
  })
})

// ─── Manager accessing driver / board ────────────────────────────────────────

test.describe('Manager — cannot access /driver or /board', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' })

  test('Manager GET /driver → /manager', async ({ page }) => {
    await page.goto('/driver')
    await expect(page).toHaveURL(/\/manager/, { timeout: 10_000 })
  })

  test('Manager GET /board → /manager', async ({ page }) => {
    await page.goto('/board')
    await expect(page).toHaveURL(/\/manager/, { timeout: 10_000 })
  })
})

// ─── Board accessing manager / driver ────────────────────────────────────────

test.describe('Board — cannot access /manager or /driver', () => {
  test.use({ storageState: 'e2e/.auth/board.json' })

  test('Board GET /manager → /board', async ({ page }) => {
    await page.goto('/manager')
    await expect(page).toHaveURL(/\/board/, { timeout: 10_000 })
  })

  test('Board GET /driver → /board', async ({ page }) => {
    await page.goto('/driver')
    await expect(page).toHaveURL(/\/board/, { timeout: 10_000 })
  })
})

// ─── Own-route access ─────────────────────────────────────────────────────────

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
