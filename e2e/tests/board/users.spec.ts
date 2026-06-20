import { test, expect } from '../../fixtures/index'

test.describe('Board — Users Settings', () => {
  test.use({ storageState: 'e2e/.auth/board.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/board/settings/users')
  })

  test('users page shows team members heading and send invitation button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /team members/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /send invitation/i })).toBeVisible()
  })

  test.todo('board member can invite and remove a member')
})
