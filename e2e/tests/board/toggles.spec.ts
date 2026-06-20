import { test, expect } from '../../fixtures/index'

test.describe('Board — Feature Toggles', () => {
  test.use({ storageState: 'e2e/.auth/board.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/board/settings/toggles')
  })

  test.todo('board member can save feature flag changes')
})
