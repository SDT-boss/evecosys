# Testing

EVEcosys has two test layers. Both must pass before any PR can merge to `main`.

---

## Unit and integration tests (Vitest)

Run in memory using `jsdom` and `@testing-library/react`. No browser, no database, no network calls.

```bash
make test           # run once and exit
make test-watch     # watch mode — reruns on file save
```

### What is covered

| Location | What it tests |
|---|---|
| `test/unit/auth/` | Login, signup, forgot-password, and reset-password form behaviour |
| `test/unit/api/` | All six API route handlers (charging toggle, alert resolve, user create, vehicle assign, etc.) |
| `test/unit/lib/` | `fleetHealth.ts` and `behaviorScore.ts` calculation logic |
| `test/unit/components/` | SignupForm component rendering and validation |
| `test/integration/` | Multi-step flows (e.g. password reset cycle) using an in-memory stub |

### Test utilities

| File | Purpose |
|---|---|
| `test/utils/supabaseMock.ts` | Factory that returns vitest-compatible mocks for `createClient()` |
| `test/utils/supabaseStub.ts` | In-memory Supabase-like stub with a `from(table)` API and `auth` helpers |

For integration tests, import the stub and swap out the Supabase client:

```ts
import { stub } from '../utils/supabaseStub'
vi.mock('@/lib/supabase/client', () => ({ createClient: () => stub }))
```

### Config

Vitest is configured in `vitest.config.mts`. Key settings:
- `environment: 'jsdom'` — DOM APIs available in all tests
- `globals: true` — `describe`, `it`, `expect` etc. available without import
- `exclude: ['e2e/**']` — Playwright specs are never picked up by Vitest

---

## End-to-end tests (Playwright)

Playwright opens a real Chromium browser and drives the app like a user would. Tests require a running Next.js server and a live Supabase project with test credentials.

```bash
make e2e            # headless run
make e2e-ui         # Playwright UI mode (visual runner, great for debugging)
```

### Prerequisites

1. The app must be running (`make dev` or a pre-built `npm run start`)
2. `.env.local` must contain valid Supabase credentials including `SUPABASE_SERVICE_ROLE_KEY`
3. The following env vars must be set (defaults work for local Supabase):
   - `E2E_MANAGER_EMAIL`, `E2E_DRIVER_EMAIL`, `E2E_BOARD_EMAIL`
   - `E2E_TEST_PASSWORD`

### Architecture

```
playwright.config.ts         ← 6 test projects; retries; webServer; reporters
│
├── e2e/global-setup.ts      ← runs once before tests; creates test users via Supabase admin API;
│                               generates storageState (saved auth cookies) for each role
├── e2e/global-teardown.ts   ← runs once after tests; cleans up any leaked test data
│
├── e2e/fixtures/index.ts    ← custom test object with per-test DB fixture lifecycle
├── e2e/helpers/
│   ├── supabase.admin.ts    ← service-role client for create/delete test data
│   └── auth.helpers.ts      ← TEST_USERS config; loginViaUI; loginViaAPI
│
├── e2e/page-objects/        ← one class per route; encapsulates locators and actions
├── e2e/test-data/           ← factories for ephemeral emails, plate numbers, station names
└── e2e/tests/
    ├── auth/                ← login, logout, forced-reset, forgot-password
    ├── auth-guards/         ← role isolation (P0 security)
    ├── manager/             ← alerts, assets, charging, drivers, users
    └── driver/              ← dashboard, alert actions
```

### Test projects

| Project | Auth | What it tests |
|---|---|---|
| `setup` | — | Orchestration project; deps satisfied by `globalSetup` |
| `auth` | Fresh login per test | Full login/logout/reset flows |
| `manager` | Pre-authenticated manager session | Every Manager feature |
| `driver` | Pre-authenticated driver session | Driver dashboard and alerts |
| `auth-guards` | No session or wrong-role session | Role isolation — P0 security |
| `mobile-smoke` | Pre-authenticated manager session | Critical paths on Pixel 5 viewport |
| `teardown` | — | Cleanup; runs after all other projects |

### Auth strategy

`global-setup.ts` runs before any test. It:
1. Ensures the three test users exist in Supabase (creates them if missing)
2. Logs each user in via the Supabase REST API and injects the session token
3. Saves the browser storage state to `e2e/.auth/{role}.json`

Tests that need a pre-authenticated session reference the saved state via `storageState:` in the project config — no login UI interaction needed per test.

The session key is derived from the Supabase project URL (e.g. `sb-abcdef-auth-token`), not the app URL.

### Fixtures

Custom fixtures in `e2e/fixtures/index.ts` handle per-test database lifecycle:

| Fixture | What it provides | Cleanup |
|---|---|---|
| `testVehicle` | A fresh test vehicle (`TEST-*` plate) | Deleted after the test |
| `testAlert` | An unresolved alert on a test vehicle | Alert + vehicle deleted after |
| `testStation` | A test charging station | Deleted after the test |
| `driverVehicle` | A vehicle assigned to the E2E driver user | Unassigned + deleted after |

Fixtures use `async ({}, use) => { ... }` so teardown runs even if the test fails.

### Writing new tests

1. Add a spec file to `e2e/tests/<feature>/my-feature.spec.ts`
2. Import `{ test, expect }` from `../../fixtures/index` (not from `@playwright/test` directly)
3. Use a page-object class from `e2e/page-objects/` — add one if none exists
4. Use a fixture for any data the test creates so it auto-cleans on failure
5. Use `test-data/factories.ts` for unique identifiers (emails, plate numbers)

### Reports

Playwright writes reports to `e2e/reports/` after every run. In CI, screenshots and traces are captured on failure:

```bash
npx playwright show-report e2e/reports/html
```

---

## CI integration

All tests run automatically on every PR. See the CI/CD section in `README.md` for the full job table, and `docs/DELIVERY.md` for pipeline architecture.

The E2E job (`e2e.yml`) builds the app, starts it locally with `npm run start`, and runs the full Playwright suite against `http://localhost:3000` using the staging Supabase project for data. It requires the `staging` GitHub Environment for secrets.

Required GitHub secrets for E2E:

| Secret | Description |
|---|---|
| `E2E_MANAGER_EMAIL` | Email for the E2E manager test account |
| `E2E_DRIVER_EMAIL` | Email for the E2E driver test account |
| `E2E_BOARD_EMAIL` | Email for the E2E board test account |
| `E2E_TEST_PASSWORD` | Shared password for all three test accounts |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key for creating/deleting test data |
