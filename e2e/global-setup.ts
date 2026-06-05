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
import { loginViaAPI, TEST_USERS, AUTH_STATE_PATH } from './helpers/auth.helpers'

dotenv.config({ path: '.env.local' })

async function ensureTestUser(role: keyof typeof TEST_USERS): Promise<string> {
  const user = TEST_USERS[role]

  // Check if user already exists
  const { data: existing } = await adminClient
    .from('users')
    .select('id')
    .eq('email', user.email)
    .single()

  if (existing) {
    // Always reset force_password_reset_at to 30 days from now so a previous
    // test run that expired it doesn't cause login-redirect failures.
    const nextReset = new Date()
    nextReset.setDate(nextReset.getDate() + 30)
    await adminClient
      .from('users')
      .update({ force_password_reset_at: nextReset.toISOString() })
      .eq('id', existing.id)
    return existing.id
  }

  // Create fresh
  const created = await createTestUser({
    email: user.email,
    password: user.password,
    full_name: user.name,
    role: user.role,
  })
  return created.id
}

export default async function globalSetup(config: FullConfig) {
  console.log('\n[E2E] Global setup — ensuring test users and auth state...')

  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'
  const browser = await chromium.launch()

  try {
    // Ensure all three test users exist in Supabase
    await Promise.all([
      ensureTestUser('manager'),
      ensureTestUser('driver'),
      ensureTestUser('board'),
    ])

    // Generate auth state for each role in parallel
    await Promise.all(
      (['manager', 'driver', 'board'] as const).map(async (role) => {
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
