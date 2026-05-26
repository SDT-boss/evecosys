# EVEcosys E2E Testing Framework

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Auth Strategy](#auth-strategy)
4. [Test Data Strategy](#test-data-strategy)
5. [Page Object Model](#page-object-model)
6. [Fixtures](#fixtures)
7. [Environment Setup](#environment-setup)
8. [Running Tests](#running-tests)
9. [CI/CD Strategy](#cicd-strategy)
10. [E2E Testing Matrix](#e2e-testing-matrix)
11. [Frontend Code Review Findings](#frontend-code-review-findings)
12. [Selector Strategy](#selector-strategy)

---

## Architecture Overview

```
Playwright (E2E runner)
│
├── global-setup.ts        ← seed DB users; generate storageState auth files
├── playwright.config.ts   ← 7 projects; retries; workers; webServer
│
├── fixtures/index.ts      ← custom test object with per-test DB fixture lifecycle
├── helpers/
│   ├── supabase.admin.ts  ← service-role Supabase client for DB operations
│   └── auth.helpers.ts    ← TEST_USERS constants, loginViaUI, loginViaAPI
│
├── page-objects/          ← one class per route; locators + actions only
├── test-data/factories.ts ← ephemeral email/plate/station name generators
└── tests/
    ├── auth/              ← login, forgot-password, forced-reset flows
    ├── auth-guards/       ← role isolation (P0 security)
    ├── manager/           ← alerts, assets, charging, drivers, users
    └── driver/            ← dashboard, alerts
```

### Key design decisions

| Decision | Rationale |
|---|---|
| Playwright (not Cypress) | Native TypeScript, built-in parallelism, better SSR/cookie handling |
| storageState per role | Avoids UI login on every test; global-setup generates fresh tokens |
| Service-role admin client | Creates/deletes test data directly without going through the app |
| Page Object Model | Centralises locator fragility; tests describe behaviour, not DOM structure |
| Custom fixtures | Automatic teardown; no orphaned rows even on test failure |
| Serial for forced-reset tests | These mutate shared DB state; parallel would cause flakiness |

---

## Directory Structure

```
e2e/
├── .auth/                           ← gitignored; written by global-setup
│   ├── manager.json
│   ├── driver.json
│   └── board.json
├── fixtures/
│   └── index.ts                     ← exports test (extended) and expect
├── global-setup.ts
├── global-teardown.ts
├── helpers/
│   ├── auth.helpers.ts
│   └── supabase.admin.ts
├── page-objects/
│   ├── AlertsPage.ts
│   ├── AssetsPage.ts
│   ├── ChargingPage.ts
│   ├── DashboardPage.ts
│   ├── DriverDashboardPage.ts
│   ├── DriversPage.ts
│   ├── ForgotPasswordPage.ts
│   ├── LoginPage.ts
│   ├── ResetPasswordPage.ts
│   └── UsersPage.ts
├── test-data/
│   └── factories.ts
└── tests/
    ├── auth/
    │   ├── forgot-password.spec.ts
    │   ├── forced-reset.spec.ts      ← serial; modifies shared driver record
    │   └── login.spec.ts
    ├── auth-guards/
    │   └── role-isolation.spec.ts    ← P0; iterates all protected routes
    ├── driver/
    │   ├── alerts.spec.ts
    │   └── dashboard.spec.ts
    └── manager/
        ├── alerts.spec.ts
        ├── assets.spec.ts
        ├── charging.spec.ts
        ├── drivers.spec.ts
        └── users.spec.ts
```

---

## Auth Strategy

### Three permanent test users

| Role | Email | Password |
|---|---|---|
| Manager | `e2e-manager@evecosys-test.com` | `TestPassword123!` |
| Driver | `e2e-driver@evecosys-test.com` | `TestPassword123!` |
| Board | `e2e-board@evecosys-test.com` | `TestPassword123!` |

These are seeded by `global-setup.ts` on every run (upsert — safe to run repeatedly).

### storageState flow

```
global-setup.ts
  → loginViaAPI(page, 'manager')    ← Supabase REST token endpoint
  → page.context().storageState()   ← captures localStorage + cookies
  → writes e2e/.auth/manager.json

playwright.config.ts
  projects.manager.use.storageState = 'e2e/.auth/manager.json'
  → every test in the manager project starts pre-authenticated
```

### When NOT to use storageState

Tests in `auth/` and `auth-guards/` that test the login flow itself must start unauthenticated. Use `test.use({ storageState: { cookies: [], origins: [] } })` to clear it.

---

## Test Data Strategy

### Ephemeral vs permanent test data

| Category | Approach | Cleanup |
|---|---|---|
| Three E2E users | Permanent; upserted in global-setup | Never deleted |
| Test vehicles | Created by `testVehicle` fixture | Deleted after each test |
| Test alerts | Created by `testAlert` fixture (+ its vehicle) | Deleted after each test |
| Test stations | Created by `testStation` fixture | Deleted after each test |
| Assigned vehicles | Created by `driverVehicle` fixture | Unassigned + deleted after each test |
| Users created in tests | Cleaned up inline after each test | Deleted after each test |

### global-teardown safety net

Even if a fixture fails to clean up (process killed, timeout), `global-teardown.ts` sweeps:
- `vehicles` where `plate_no LIKE 'TEST-%'`
- `charging_stations` where `name LIKE 'Test Station%'`
- `users` where `email LIKE '%@evecosys-test.com'` (excluding the 3 permanent users)

### Factory functions

```typescript
// factories.ts
ephemeralEmail('driver')  // → "driver-1716700000000-1@evecosys-test.com"
testPlate()               // → "TEST-1716700000000-2"
testStationName()         // → "Test Station 1716700000000-3"
driverPayload()           // → { fullName, email, password, role: 'driver' }
```

---

## Page Object Model

Each page object:
- Declares locators as `readonly` properties in the constructor
- Exposes **actions** (click, fill, navigate) as async methods
- Exposes **assertions** (`expectXxx`) as async methods using `expect` internally
- Never contains test logic (no `describe`, `it`, `expect` for test assertions)

### Example

```typescript
// page-objects/UsersPage.ts
export class UsersPage {
  readonly addUserButton: Locator

  constructor(page: Page) {
    this.addUserButton = page.getByRole('button', { name: /add user/i })
  }

  async createUser(data: UserPayload) {
    await this.openCreateForm()
    await this.fullNameInput.fill(data.fullName)
    // ...
    await this.submitCreateButton.click()
    await this.expectFormClosed()
  }
}
```

### Locator priority (best to worst)

1. `getByRole` with `name` — semantic, survives styling changes
2. `getByPlaceholder` / `getByLabel` — accessible attributes
3. `data-testid` attribute — explicit test hook
4. CSS class filter + text filter combo — fragile; avoid where possible
5. nth-child selectors — most fragile; document why when used

---

## Fixtures

The `test` object exported from `fixtures/index.ts` extends Playwright's base `test` with four fixtures:

| Fixture | What it creates | Teardown |
|---|---|---|
| `testVehicle` | One vehicle (`BYD Atto 3`, `TEST-...` plate) | `deleteTestVehicle` |
| `testAlert` | Vehicle + one unresolved alert | `deleteTestAlert` + `deleteTestVehicle` |
| `testStation` | One charging station | `deleteTestChargingStation` |
| `driverVehicle` | Vehicle assigned to `e2e-driver` | unassign + `deleteTestVehicle` |

Usage:

```typescript
test('manager can resolve alert', async ({ testAlert }) => {
  await alertsPage.resolveAlert(testAlert.alert.message)
})
```

---

## Environment Setup

### Required environment variables

```bash
# .env.local (or CI secrets)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # ← required for admin operations
E2E_MANAGER_EMAIL=e2e-manager@evecosys-test.com   # optional overrides
E2E_DRIVER_EMAIL=e2e-driver@evecosys-test.com
E2E_BOARD_EMAIL=e2e-board@evecosys-test.com
E2E_TEST_PASSWORD=TestPassword123!
```

### First-time setup

```bash
# 1. Install Playwright browsers
npx playwright install --with-deps chromium

# 2. Start the app (separate terminal)
npm run dev

# 3. Run setup project to seed users and generate storageState
npx playwright test --project=setup

# 4. Run all tests
npx playwright test
```

### Resetting auth state

```bash
rm -rf e2e/.auth
npx playwright test --project=setup
```

---

## Running Tests

```bash
# All tests (parallel, 4 workers in CI)
npx playwright test

# Single project
npx playwright test --project=manager

# Single spec file
npx playwright test e2e/tests/auth/login.spec.ts

# Debug mode (headed, slow-mo)
npx playwright test --debug

# UI mode (interactive)
npx playwright test --ui

# Headed (see browser)
npx playwright test --headed

# Re-run only failed tests
npx playwright test --last-failed
```

---

## CI/CD Strategy

### Playwright config projects

| Project | storageState | depends on | Workers |
|---|---|---|---|
| `setup` | none | — | 1 (serial) |
| `auth` | cleared | setup | parallel |
| `auth-guards` | per role | setup | parallel |
| `manager` | manager.json | setup | parallel |
| `driver` | driver.json | setup | parallel |
| `mobile-smoke` | manager.json | setup | parallel |
| `teardown` | none | all | 1 (serial) |

### Retry strategy

```typescript
retries: process.env.CI ? 2 : 0
```

Two retries in CI absorb transient network/timing flakiness. Tests that fail 3 times are marked as flaky and should be investigated.

### GitHub Actions example

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npx playwright test
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
```

### Parallelisation

- 4 workers in CI; local defaults to half CPU cores
- Tests within a spec file run serially (one browser per worker)
- `forced-reset.spec.ts` uses `test.describe.serial` — must run serially because tests mutate shared driver DB state
- All other specs are parallel-safe due to fixture isolation

---

## E2E Testing Matrix

| Feature | User Role | Happy Path | Edge Cases | Failure Conditions | Dependencies | Priority |
|---|---|---|---|---|---|---|
| **Login** | all | Email + password → role dashboard | Empty fields, whitespace | Wrong password, locked account | Supabase Auth | P0 |
| **Forced password reset** | driver | Login → /reset-password?forced=true | Reset already done | Mismatched passwords, short password | users.force_password_reset_at | P0 |
| **Forgot password** | all | Submit email → confirmation shown | Non-existent email (still succeeds) | Empty submit stays on page | Supabase Auth email | P1 |
| **Role isolation** | all | Correct role → own dashboard | — | Wrong role → /login, unauthenticated → /login | layout auth guards | P0 |
| **Manager alerts** | manager | Resolve alert → moves to resolved | All filter, no active alerts empty state | Optimistic revert on API error | alerts table, RLS | P0 |
| **Driver alerts** | driver | Resolve own alert | Empty state | Cannot see other vehicle alerts (RLS) | drivers.assigned_vehicle_id, RLS | P0 |
| **Create user** | manager | Create driver/manager → appears in list | Duplicate email shows error | Short password rejected | users table, Supabase Auth | P1 |
| **Vehicle assignment** | manager | Assign vehicle → shows on driver card | Unassign leaves no vehicle | Cancel closes modal unchanged | drivers.assigned_vehicle_id | P1 |
| **Asset search** | manager | Search plate → filtered list | No match → empty state | — | vehicles table | P1 |
| **Asset brand filter** | manager | Filter by BYD → BYD vehicles only | Multiple filters combined | — | vehicles.brand | P2 |
| **Vehicle drawer** | manager | Click card → drawer opens | Tab navigation works | — | vehicles table | P2 |
| **Add charging station** | manager | Fill form + map click → station in list | Map pin required, empty name blocked | Submit without pin disabled | charging_stations table, Leaflet | P1 |
| **Toggle station** | manager | Click toggle → active/inactive | Toggle back | — | charging_stations.is_active | P2 |
| **Driver dashboard** | driver | Assigned vehicle plate + SOC visible | No vehicle assigned → message shown | — | drivers.assigned_vehicle_id | P0 |
| **Driver trips** | driver | Trips page loads, shows history | Empty trips (no error) | — | trips table, RLS | P2 |
| **Password reset page** | driver | Enter new password → confirmation | Mismatched → error | Too short → error | Supabase Auth session | P1 |

---

## Frontend Code Review Findings

These issues were identified by reviewing the frontend code. They affect testability and runtime stability.

### Unstable selectors

| Location | Issue | Recommendation |
|---|---|---|
| `AlertsClient`, `DriverAlertsClient` | Alert rows identified by `border-top` CSS style — will break if design changes | Add `data-testid="alert-row"` to each row |
| `ChargingPage` toggle button | Icon-only button with no `aria-label` | Add `aria-label="Toggle station {name}"` to toggle buttons |
| `VehicleDrawer` close button | No `aria-label`, found by SVG child | Add `aria-label="Close vehicle details"` |
| Driver cards in `DriversPage` | No `data-testid`, identified by text content | Add `data-testid="driver-card-{userId}"` |
| Vehicle cards in `AssetsPage` | No `data-testid`, identified by SOC text pattern | Add `data-testid="vehicle-card-{vehicleId}"` |
| Station cards in `ChargingPage` | No `data-testid` | Add `data-testid="station-card-{stationId}"` |

### Race conditions and async rendering issues

| Location | Issue | Risk |
|---|---|---|
| `AlertsClient` optimistic update | `setAlerts` called before API response; revert on error; no loading state prevents double-click | Medium — a slow network + rapid clicking can double-resolve |
| `AddStationModal` map click | Leaflet defers initialization via dynamic import with `ssr: false`; coordinate state set async after click | High for E2E — map may not be interactive when test clicks |
| `UsersPage` form submit | No debounce on submit button; duplicate form submissions possible before server responds | Medium |
| Supabase realtime subscriptions (if used) | State updates from socket may race with local optimistic updates | High if realtime + optimistic writes coexist |

### Missing loading states

| Component | Missing State | Impact |
|---|---|---|
| `DriversPage` assign modal | No spinner while PATCH `/api/vehicles/assign` is in-flight | Users can click Confirm multiple times |
| `ChargingPage` toggle | No disabled/loading state while PATCH `/api/charging/toggle` is in-flight | Double-toggle possible |
| `UsersPage` create form | Submit button not disabled during API call | Duplicate user creation possible |

### Accessibility issues

| Element | Issue | Fix |
|---|---|---|
| Charging station toggle button | `aria-label` absent (icon only) | `aria-label="Toggle active status for {name}"` |
| Vehicle drawer close button | `aria-label` absent | `aria-label="Close vehicle details"` |
| Alert resolve button | `aria-label` only shows text "Mark Resolved" without context | `aria-label="Mark resolved: {alertMessage}"` |
| Filter tabs | No `aria-selected` state communicated | Add `aria-pressed` or use `role="tab"` with `aria-selected` |

### Poor testability patterns

| Pattern | Location | Why it's a problem | Fix |
|---|---|---|---|
| `[style*="fdeaea"]` for error detection | Multiple pages | CSS hex color as selector; breaks on theme changes | Add `data-testid="error-banner"` to error containers |
| Inline style for toggle active state | Charging toggle | No semantic attribute for active/inactive | Add `data-state="active"` or `aria-checked` |
| `router.refresh()` after mutations | Multiple API routes | Causes full page remount; tests may miss intermediate states | Acceptable but document for E2E wait patterns |
| Text-content matching for timestamps | Alert rows, `getByText(/ago/)` | Timestamp text changes over time | Add `data-testid="alert-timestamp"` |

### State synchronization risks

| Scenario | Risk |
|---|---|
| Resolving an alert while `testAlert` fixture teardown runs | The fixture deletes the alert from DB after the test; if the test resolve API is still in-flight, `deleteTestAlert` may conflict |
| `driverVehicle` unassignment racing with dashboard reload | If the driver dashboard is still polling when teardown unassigns the vehicle, a stale-state flash may trigger an error banner |
| `forced-reset.spec.ts` not using `test.describe.serial` properly | All tests in the suite share the same driver user's `force_password_reset_at` field; parallel execution would cause non-deterministic results |

---

## Selector Strategy

### Priority order (most stable first)

```
1. getByRole('button', { name: /text/i })     ← semantic; survives CSS changes
2. getByLabel('Field Name')                    ← form fields via label association
3. getByPlaceholder('placeholder text')        ← form fields without visible label
4. locator('[data-testid="my-component"]')     ← explicit test hooks
5. getByText('exact text')                     ← fine for unique static text
6. locator('div').filter({ hasText: ... })     ← fragile; use as last resort
7. locator('[style*="..."]')                   ← avoid; depends on exact CSS values
```

### Recommended data-testid additions

Add these to the source components to make selectors stable and explicit:

```tsx
// Alert rows
<div data-testid={`alert-row-${alert.id}`} ...>

// Resolve button
<button data-testid={`resolve-btn-${alert.id}`} aria-label={`Resolve: ${alert.message}`}>

// Filter tabs
<button data-testid="filter-all" ...>
<button data-testid="filter-active" ...>
<button data-testid="filter-resolved" ...>

// Vehicle cards
<div data-testid={`vehicle-card-${vehicle.id}`} ...>

// Error banners (replace style-based selector)
<div data-testid="error-banner" ...>

// Station cards
<div data-testid={`station-card-${station.id}`} ...>

// Leaflet map container (for E2E coordinate click)
<div data-testid="station-picker-map" ...>

// Drawer close button
<button aria-label="Close vehicle details" ...>
```
