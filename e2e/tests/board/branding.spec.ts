import { test, expect } from '../../fixtures/index'

test.describe('Board — Branding Settings', () => {
  test.use({ storageState: 'e2e/.auth/board.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/board/settings/branding')
  })

  test.todo('board member can save branding settings')
})
