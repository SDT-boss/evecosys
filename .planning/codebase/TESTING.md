# Testing
<!-- mapped: 2026-06-13 -->

## Frameworks

| Layer | Framework | Config |
|-------|-----------|--------|
| Unit / Component | Vitest + jsdom + @testing-library/react | `vitest.config.mts` |
| Integration | Vitest against local Supabase Docker | same config, separate make target |
| E2E | Playwright | `playwright.config.ts` |

## Directory Structure

```
test/
├── __mocks__/
│   └── server-only.ts          # empty shim — lets server-marked modules load in jsdom
├── integration/
│   ├── auth.integration.test.tsx
│   └── tenant-provisioning.test.ts
├── unit/
│   ├── api/                    # route handler tests (charging, alerts, users, vehicles)
│   ├── auth/                   # auth page tests (login, forgot-password, reset-password)
│   ├── components/
│   │   ├── auth/               # SignupForm
│   │   └── design-system/     # Alert, Avatar, Badge, Button, Dialog, ... (13 components)
│   └── lib/
│       ├── behaviorScore.test.ts
│       ├── fleetHealth.test.ts
│       └── tenant/             # authGuard, credentials, registrationService,
│                               #   rollback, stateMachine, tenantIsolation
├── setup.ts                    # jsdom polyfills + next/navigation mock
├── types.d.ts
└── utils/
    ├── supabaseMock.ts         # makeSupabaseMock() — chainable Supabase builder
    └── supabaseStub.ts         # lighter stub variant

e2e/
├── fixtures/
│   └── index.ts               # test.extend() — testVehicle, testAlert, testStation, driverVehicle
├── helpers/
│   ├── auth.helpers.ts        # TEST_USERS map + login helpers
│   └── supabase.admin.ts      # service-role helpers for data setup/teardown
├── page-objects/              # LoginPage, DashboardPage, DriversPage, etc.
├── test-data/
│   └── factories.ts           # ephemeralEmail(), testPlate(), driverPayload(), etc.
├── tests/
│   ├── auth/                  # login, forgot-password, forced-reset
│   ├── auth-guards/           # role-isolation
│   ├── design-system/         # component visual tests
│   ├── driver/                # alerts, dashboard
│   └── manager/               # alerts, assets, charging, drivers, users
├── global-setup.ts            # create auth state files per role
└── global-teardown.ts
```

## Vitest Configuration

- **Environment:** jsdom
- **Globals:** true (no `import { describe, it }` needed)
- **Setup file:** `test/setup.ts`
- **Path alias:** `@` → project root; `server-only` → empty shim
- **Excluded:** `node_modules/**`, `e2e/**`

## Playwright Configuration

- **Test dir:** `e2e/tests/`
- **Parallel:** fully parallel, 12 workers in CI
- **Timeout:** 15 s per test; 10 s action; 15 s navigation
- **Retries:** 2 in CI, 0 locally
- **Reporter:** list + HTML + JSON; GitHub in CI
- **Projects:**
  - `setup` / `teardown` — runs global-setup.ts once, creates per-role storageState
  - `auth` — fresh login each test (no stored session)
  - `manager` — pre-authenticated via `e2e/.auth/manager.json`
  - `driver` — pre-authenticated via `e2e/.auth/driver.json`
  - `auth-guards` — no session or wrong-role sessions

## Mocking Patterns

### Unit tests — Supabase chain mock

```ts
// test/utils/supabaseMock.ts
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
}))

// Chain helper (mimic PostgREST builder)
function chain(result: any) {
  const obj: any = {}
  const noop = vi.fn().mockReturnValue(obj)
  obj.select = noop; obj.eq = noop; obj.insert = noop
  obj.single = vi.fn().mockResolvedValue(result)
  return obj
}
```

### Unit tests — module-level vi.mock

```ts
vi.mock('@/lib/supabase/server', () => ({ ... }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
```

### Setup file polyfills (applied globally)

```ts
// test/setup.ts
global.ResizeObserver = vi.fn().mockImplementation(...)   // Radix UI requirement
global.matchMedia = vi.fn().mockImplementation(...)
vi.mock('next/navigation', () => ({ ... }))               // App Router stubs
```

### Integration tests — real Supabase

Integration tests (`test/integration/`) use a real local Supabase instance (Docker). Prerequisites:
1. `make db-start` — start Supabase
2. `make migrate` — apply migrations
3. `.env.local` must have `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

Pattern:
```ts
// beforeAll: create service-role client, run setup SQL
// tests: assert against live DB via anonClient (RLS enforced)
// afterAll: cleanup test rows
```

### E2E — Playwright fixtures

```ts
// e2e/fixtures/index.ts
export const test = base.extend<E2EFixtures>({
  testVehicle: async ({}, use) => {
    const vehicle = await createTestVehicle()   // service-role insert
    await use(vehicle)
    await deleteTestVehicle(vehicle.id)          // cleanup after test
  },
  // testAlert, testStation, driverVehicle follow same pattern
})
```

### E2E — Page Object Model

All E2E specs use Page Objects from `e2e/page-objects/`. Example usage:
```ts
const loginPage = new LoginPage(page)
await loginPage.login(email, password)
```

### E2E — Test data factories

```ts
// e2e/test-data/factories.ts
ephemeralEmail('driver')        // driver-1750000000-1@evecosys-test.com
testPlate()                     // TEST-1750000000-2
driverPayload({ role: 'driver' })
```

## Test Types and Scope

| Type | When | What |
|------|------|------|
| **Unit** | Every PR | Route handlers, lib functions, design-system components, tenant logic |
| **Integration** | Every PR (requires Docker) | Full BYODB provisioning lifecycle, RLS cross-tenant isolation, Vault lifecycle |
| **E2E** | Pre-merge / staging | User journeys: login, fleet management, charging, role isolation |

## Make Targets

```bash
make test              # Vitest unit tests (run once)
make test-watch        # Vitest in watch mode
make e2e               # Playwright E2E (requires running app + local Supabase)
make e2e-ui            # Playwright UI mode
```

## Known Coverage Gaps

See `.planning/codebase/CONCERNS.md` — "Test Coverage Gaps" section for high/medium priority gaps.

---
*Mapped: 2026-06-13*
