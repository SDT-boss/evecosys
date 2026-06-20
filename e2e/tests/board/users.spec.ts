import { test, expect } from '../../fixtures/index'

test.describe('Board — Users Settings', () => {
  test.use({ storageState: 'e2e/.auth/board.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/board/settings/users')
  })

  test.todo('board member can invite a new member')
})
