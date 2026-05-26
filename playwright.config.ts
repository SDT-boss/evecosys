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
  workers: process.env.CI ? 4 : undefined,
  timeout: 30_000,
  expect: { timeout: 8_000 },

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
    navigationTimeout: 15_000,
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

    // Mobile smoke — manager critical path on mobile viewport
    {
      name: 'mobile-smoke',
      testDir: './e2e/tests/manager',
      testMatch: '**/*.smoke.spec.ts',
      use: {
        ...devices['Pixel 5'],
        storageState: 'e2e/.auth/manager.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: process.env.CI
    ? {
        command: 'npm run start',
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
