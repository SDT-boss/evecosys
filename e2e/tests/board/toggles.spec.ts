import { test, expect } from '../../fixtures/index'

test.describe('Board — Feature Toggles', () => {
  test.use({ storageState: 'e2e/.auth/board.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/board/settings/toggles')
  })

  test('feature toggles page renders both groups and all 8 switches', async ({ page }) => {
    await expect(page.getByText('Platform features')).toBeVisible()
    await expect(page.getByText('Administrative tools')).toBeVisible()
    const switches = page.locator('button[role="switch"]')
    await expect(switches).toHaveCount(8)
  })

  test('clicking Save changes sends flags and shows success alert', async ({ page }) => {
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('alert')).toContainText('Feature flags saved')
  })

  test.todo('board member can toggle individual flags and verify persistence after reload')
})
