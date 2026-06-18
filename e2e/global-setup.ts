/**
 * Runs once before all test projects.
 * 1. Ensures test users exist in Supabase.
 * 2. Generates saved auth state (storageState) for each role.
 *    Tests consume these files instead of logging in per-test.
 */
import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import dotenv from 'dotenv'
import {
  createTestUser,
  deleteTestUser,
  adminClient,
} from './helpers/supabase.admin'
import { loginViaAPI, TEST_USERS, FORCED_RESET_USER, AUTH_STATE_PATH } from './helpers/auth.helpers'

dotenv.config({ path: '.env.local' })

type UserSpec = { email: string; password: string; name: string; role: 'manager' | 'driver' | 'board' | 'platform_admin' }

async function ensureUser(user: UserSpec): Promise<string> {
  const { data: existing } = await adminClient
    .from('users')
    .select('id')
    .eq('email', user.email)
    .single()

  if (existing) {
    const nextReset = new Date()
    nextReset.setDate(nextReset.getDate() + 30)
    await Promise.all([
      // Reset force_password_reset_at so previous expired runs don't cause redirects
      adminClient
        .from('users')
        .update({ force_password_reset_at: nextReset.toISOString() })
        .eq('id', existing.id),
      // Sync the password so loginViaAPI always matches what the tests expect
      adminClient.auth.admin.updateUserById(existing.id, { password: user.password }),
    ])
    return existing.id
  }

  const created = await createTestUser({
    email: user.email,
    password: user.password,
    full_name: user.name,
    role: user.role,
  })
  return created.id
}

function ensureTestUser(role: keyof typeof TEST_USERS): Promise<string> {
  return ensureUser(TEST_USERS[role])
}

export default async function globalSetup(config: FullConfig) {
  console.log('\n[E2E] Global setup — ensuring test users and auth state...')

  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'
  const browser = await chromium.launch()

  try {
    // Ensure all test users exist in Supabase
    await Promise.all([
      ensureTestUser('manager'),
      ensureTestUser('driver'),
      ensureTestUser('board'),
      ensureTestUser('platform_admin'),
      ensureTestUser('board_no_tenant'),
      ensureUser(FORCED_RESET_USER), // dedicated user for forced-reset tests
    ])

    // Generate auth state for each role in parallel
    await Promise.all(
      (['manager', 'driver', 'board', 'board_no_tenant', 'platform_admin'] as const).map(async (role) => {
        const ctx = await browser.newContext({ baseURL })
        const page = await ctx.newPage()
        try {
          await loginViaAPI(page, role)
          const statePath = path.resolve(__dirname, '..', AUTH_STATE_PATH[role])
          await ctx.storageState({ path: statePath })
          console.log(`  ✓ Auth state saved: ${AUTH_STATE_PATH[role]}`)
        } finally {
          await ctx.close()
        }
      })
    )
  } finally {
    await browser.close()
  }

  console.log('[E2E] Global setup complete.\n')
}
