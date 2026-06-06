import type { Page } from '@playwright/test'
import { createChunks } from '@supabase/ssr'

export const TEST_USERS = {
  manager: {
    email: process.env.E2E_MANAGER_EMAIL ?? 'e2e-manager@evecosys-test.com',
    password: process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!',
    name: 'E2E Manager',
    role: 'manager' as const,
  },
  driver: {
    email: process.env.E2E_DRIVER_EMAIL ?? 'e2e-driver@evecosys-test.com',
    password: process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!',
    name: 'E2E Driver',
    role: 'driver' as const,
  },
  board: {
    email: process.env.E2E_BOARD_EMAIL ?? 'e2e-board@evecosys-test.com',
    password: process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!',
    name: 'E2E Board',
    role: 'board' as const,
  },
} as const

export type RoleKey = keyof typeof TEST_USERS

/**
 * Dedicated driver user for forced-reset flow tests.
 * Kept separate from TEST_USERS.driver so forced-reset tests can mutate
 * force_password_reset_at without racing against login.spec.ts.
 */
export const FORCED_RESET_USER = {
  email: process.env.E2E_FORCED_RESET_EMAIL ?? 'e2e-forced-reset@evecosys-test.com',
  password: process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!',
  name: 'E2E Forced Reset Driver',
  role: 'driver' as const,
}

/** Auth state file paths — written by global-setup, consumed by projects. */
export const AUTH_STATE_PATH: Record<RoleKey, string> = {
  manager: 'e2e/.auth/manager.json',
  driver: 'e2e/.auth/driver.json',
  board: 'e2e/.auth/board.json',
}

/**
 * Logs in via the UI and waits for navigation to the role dashboard.
 * Use this in tests that need to verify the login flow itself.
 * For pre-authenticated tests, rely on storageState instead.
 */
export async function loginViaUI(
  page: Page,
  role: RoleKey,
  options: { expectReset?: boolean } = {}
): Promise<void> {
  const user = TEST_USERS[role]
  await page.goto('/login')
  await page.getByPlaceholder(/you@evecosys.com/i).fill(user.email)
  await page.getByPlaceholder(/••••••••/).fill(user.password)
  await page.getByRole('button', { name: /sign in/i }).click()

  if (options.expectReset) {
    await page.waitForURL('/reset-password**')
    return
  }

  const destinations: Record<RoleKey, string> = {
    manager: '/manager',
    driver: '/driver',
    board: '/board',
  }
  await page.waitForURL(destinations[role] + '**', { timeout: 15_000 })
}

/**
 * Logs in via Supabase REST API (faster than UI, bypasses layout).
 * Injects the session as cookies so @supabase/ssr (createServerClient) can
 * read the auth state server-side. The app uses cookie-based auth, so
 * localStorage injection does not work.
 * Use in global-setup to generate storageState.
 */
export async function loginViaAPI(page: Page, role: RoleKey): Promise<void> {
  const { email, password } = TEST_USERS[role]
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const res = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    data: { email, password },
  })

  if (!res.ok()) {
    throw new Error(`loginViaAPI failed for ${role}: ${res.status()} ${await res.text()}`)
  }

  const session = await res.json()

  // @supabase/ssr derives the cookie key from the Supabase project hostname
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const cookieKey = `sb-${projectRef}-auth-token`

  // Use @supabase/ssr's own chunker so the cookie format matches exactly
  // what createServerClient/createBrowserClient reads back.
  const chunks = createChunks(cookieKey, JSON.stringify(session))

  await page.context().addCookies(
    chunks.map(({ name, value }) => ({
      name,
      value,
      domain: 'localhost',
      path: '/',
    }))
  )

  const destinations: Record<RoleKey, string> = {
    manager: '/manager',
    driver: '/driver',
    board: '/board',
  }
  await page.goto(destinations[role])
  await page.waitForURL(destinations[role] + '**', { timeout: 15_000 })
}

/** Signs out via the dashboard UI logout button. */
export async function logoutViaUI(page: Page): Promise<void> {
  const logoutBtn = page.getByRole('button', { name: /sign out|logout/i })
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
    await page.waitForURL('/login')
  }
}
