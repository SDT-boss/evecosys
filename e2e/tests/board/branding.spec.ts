import { test, expect } from '../../fixtures/index'

test.describe('Board — Branding Settings', () => {
  test.use({ storageState: 'e2e/.auth/board.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/board/settings/branding')
  })

  test('board member can save branding settings', async ({ page }) => {
    const uniqueName = `Test Org ${Date.now()}`

    // Fill the display name input
    const nameInput = page.getByLabel('Display name')
    await nameInput.fill(uniqueName)

    // Click Save branding
    await page.getByRole('button', { name: 'Save branding' }).click()

    // Assert the success Alert contains "Branding saved"
    await expect(page.getByRole('alert').filter({ hasText: 'Branding saved' })).toBeVisible()
  })
})
