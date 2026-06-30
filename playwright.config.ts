import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 12 workers saturated the single standalone server on CI runners (2–4 cores),
  // so SSR navigations alone exceeded the 15s budget and beforeEach page.goto
  // calls timed out across the manager/driver suites. Run 4 workers (≈1/core)
  // and give navigation-heavy pages real headroom.
  workers: process.env.CI ? 4 : undefined,
  // Pages stream from async Server Components behind a loading.tsx skeleton
  // (e.g. /manager/charging), so the real content — and the assertions waiting
  // on it — can arrive well after navigation under CI load. Give the per-test
  // and web-assertion budgets headroom; expect stays below the test timeout so
  // a single slow toBeVisible never consumes the whole budget.
  timeout: 45_000,
  expect: { timeout: 25_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/reports/html', open: 'never' }],
    ['json', { outputFile: 'e2e/reports/results.json' }],
    ...(process.env.CI ? [['github'] as ['github']] : []),
  ],

  globalSetup: path.resolve(__dirname, 'e2e/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, 'e2e/global-teardown.ts'),

  use: {
    baseURL: BASE_URL,
    trace: process.env.CI ? 'on-first-retry' : 'off',
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    locale: 'en-US',
    timezoneId: 'UTC',
  },

  projects: [
    // Auth setup — runs once, generates storageState for all roles
    {
      name: 'setup',
      testMatch: '**/global-setup.ts',
      teardown: 'teardown',
    },
    {
      name: 'teardown',
      testMatch: '**/global-teardown.ts',
    },

    // Auth flow tests — no pre-saved session, must log in fresh
    {
      name: 'auth',
      testDir: './e2e/tests/auth',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    // Manager tests — pre-authenticated as manager
    {
      name: 'manager',
      testDir: './e2e/tests/manager',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/manager.json',
      },
      dependencies: ['setup'],
    },

    // Driver tests — pre-authenticated as driver
    {
      name: 'driver',
      testDir: './e2e/tests/driver',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/driver.json',
      },
      dependencies: ['setup'],
    },

    // Auth guard tests — no session or wrong-role sessions
    {
      name: 'auth-guards',
      testDir: './e2e/tests/auth-guards',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    // Provisioning API tests (EVE-45) — each scenario sets its own storageState.
    // Scoped to the provisioning spec only; other specs under e2e/tests/platform
    // (e.g. tenant-switcher) are owned by their own milestones and not wired here.
    {
      name: 'platform',
      testDir: './e2e/tests/platform',
      testMatch: ['**/tenant-provisioning.spec.ts', '**/tenant-lifecycle.spec.ts', '**/audit-log.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

  ],

  webServer: process.env.CI
    ? {
        command: 'node .next/standalone/server.js',
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
