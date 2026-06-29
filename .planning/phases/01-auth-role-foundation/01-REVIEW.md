---
phase: 01-auth-role-foundation
reviewed: 2026-06-18T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - e2e/helpers/auth.helpers.ts
  - e2e/global-setup.ts
  - e2e/tests/auth-guards/role-isolation.spec.ts
findings:
  critical: 2
  warning: 3
  info: 1
  total: 6
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-06-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Three files were reviewed as part of the Phase 1 gap-closure plan (01-03): the auth helpers
defining TEST_USERS, the global E2E setup, and the role-isolation Playwright spec. The goal
was to add a `board_no_tenant` user and an automated assertion that a board member with no
tenant row is redirected from `/board/settings` to `/login`.

The structural additions (new TEST_USERS key, AUTH_STATE_PATH entry, storageState generation,
and the spec describe-block) are directionally correct. However, two critical defects exist:
one will silently corrupt the `board_no_tenant` user on every re-run after the first, and
one can cause the storageState generation step for `board_no_tenant` to hang or assert
incorrectly. Three additional warnings reduce test reliability.

---

## Critical Issues

### CR-01: `ensureUser` resets `force_password_reset_at` on existing users but `board_no_tenant` triggers `createTestUser`, which never creates a tenant row — however on the second run it takes the `existing` branch and skips `createTestUser` entirely, which is correct for isolation. **BUT** `ensureUser` calls `createTestUser` with `role: 'board'`, and `createTestUser`'s type signature only accepts `'manager' | 'driver' | 'board'` — `platform_admin` is NOT in that union.

**File:** `e2e/global-setup.ts:19` and `e2e/helpers/supabase.admin.ts:52`

**Issue:** The local `UserSpec` type in `global-setup.ts` (line 19) declares `role` as
`'manager' | 'driver' | 'board' | 'platform_admin'`. The `createTestUser` function in
`supabase.admin.ts` (line 52) only accepts `'manager' | 'driver' | 'board'`. When
`ensureTestUser('platform_admin')` is called and no existing user is found, `ensureUser`
calls `createTestUser({ ..., role: 'platform_admin' })`. TypeScript will catch this as a
type error at compile time because `createTestUser` rejects `'platform_admin'` in its
parameter type — but only if the call flows through the typed path. Because `ensureUser`
accepts `UserSpec` (which includes `'platform_admin'`) and `createTestUser` accepts a
narrower union, the assignment at line 43–49 is a type mismatch that TypeScript will flag.
This means `make typecheck` / the `lint` CI job will fail whenever a `platform_admin` user
does not already exist in the database, blocking a clean first-run in a fresh environment.

**Fix:** Widen `createTestUser`'s `role` parameter to include `'platform_admin'`, or add a
separate `createPlatformAdminUser` helper, and update `TestUser.role` to match:

```typescript
// supabase.admin.ts — widen the union
export async function createTestUser(params: {
  email: string
  password: string
  full_name: string
  role: 'manager' | 'driver' | 'board' | 'platform_admin'  // add platform_admin
}): Promise<TestUser> { ... }

// Also widen TestUser.role:
export interface TestUser {
  id: string
  email: string
  role: 'manager' | 'driver' | 'board' | 'platform_admin'
}
```

---

### CR-02: `loginViaAPI` navigates `board_no_tenant` to `/board` and then waits for `/board**` — but `/board` layout redirects any authenticated board user whose tenant check fails back to `/login`, so the wait may time-out or assert on the wrong URL.

**File:** `e2e/helpers/auth.helpers.ts:133-141`

**Issue:** `loginViaAPI` contains:

```typescript
const destinations: Record<RoleKey, string> = {
  ...
  board_no_tenant: '/board',
  ...
}
await page.goto(destinations[role])
await page.waitForURL(destinations[role] + '**', { timeout: 15_000 })
```

After cookies are injected, `page.goto('/board')` fires the server-side `board/layout.tsx`
which checks role = `'board'` (passes) and **does not** check for a tenant row at the top
`/board` level — the tenant check only lives in `board/settings/layout.tsx`. So the goto
itself will land on `/board` successfully, and `storageState` generation will succeed for
this user.

However, if the board layout's auth check ever changes to also require a tenant (e.g., to
show tenant-scoped data), the destination `/board` will redirect to `/login`, causing the
`waitForURL('/board**')` assertion to time out with a 15-second hang before failing. More
immediately: `loginViaUI` (line 81-88) has the identical mapping for `board_no_tenant →
'/board'`, and `loginViaUI` is callable by tests that rely on the UI flow. If `board` layout
ever gates on tenant, every test using `loginViaUI('board_no_tenant')` will hang for 15 s
before a timeout failure rather than giving a clear diagnostic message.

The right destination for a no-tenant board user after login is currently unknown by the
app — the test is asserting infra behaviour, not app behaviour. The correct fix is to give
`board_no_tenant` its own explicit destination that reflects the app's actual post-login
redirect for tenantless board members, not silently reuse `/board`.

**Fix:** Add a dedicated destination for `board_no_tenant` that the app actually lands on
after login, or document explicitly that this user is only used with `storageState` (never
via `loginViaUI`), and add a guard:

```typescript
// Option A — explicit unsupported destination with a clear error
board_no_tenant: '/login',  // no-tenant board lands on /login after setup redirect

// Option B — guard loginViaUI against roles that don't have a stable post-login home
export async function loginViaUI(
  page: Page,
  role: RoleKey,
  options: { expectReset?: boolean } = {}
): Promise<void> {
  if (role === 'board_no_tenant') {
    throw new Error('loginViaUI does not support board_no_tenant — use storageState instead')
  }
  ...
}
```

---

## Warnings

### WR-01: `loginViaAPI` for `board_no_tenant` navigates to `/board` and waits, but the current `/board` layout does NOT itself gate on tenant — meaning storageState is generated for a user who has auth cookies but no board home screen. If a future route check is added at the `/board` level, the global-setup silently begins generating a broken storageState (pointing at `/login`) without any diagnostic output.

**File:** `e2e/global-setup.ts:79`

**Issue:** The storageState is saved after `loginViaAPI` successfully navigates to `/board`.
This works today only because `/board/layout.tsx` does not check for a tenant row. The
test's value depends entirely on an implicit assumption about the board layout's behaviour.
There is no assertion in global-setup that confirms the storageState was generated from an
authenticated `/board` page (not a redirected `/login` page). If the board layout is
tightened, storageState will be saved as an unauthenticated session, all board_no_tenant
tests will silently pass the redirect assertion for the wrong reason (they're already
unauthenticated), and the test will stop testing what it claims to test.

**Fix:** After `loginViaAPI`, assert that the page URL is the expected destination before
saving storageState:

```typescript
await loginViaAPI(page, role)
// For board_no_tenant, confirm we landed on /board (not /login)
if (role === 'board_no_tenant') {
  const currentURL = page.url()
  if (currentURL.includes('/login')) {
    throw new Error('board_no_tenant storageState: user was redirected to /login during setup — check board layout tenant requirements')
  }
}
const statePath = path.resolve(__dirname, '..', AUTH_STATE_PATH[role])
await ctx.storageState({ path: statePath })
```

---

### WR-02: The new spec test asserts `toHaveURL('/login')` (exact string match) for the no-tenant board member, but all other redirect-to-login assertions in the same file use either `toHaveURL('/login', { timeout })` or regex patterns. Mixing exact-string and regex URL assertions is inconsistent and, more importantly, if the app ever redirects to `/login?redirectTo=/board/settings` the exact-string assertion will fail while the intent (landed on login) would have been met.

**File:** `e2e/tests/auth-guards/role-isolation.spec.ts:168`

**Issue:**
```typescript
// Line 168 — new test
await expect(page).toHaveURL('/login', { timeout: 10_000 })

// Existing tests use the same pattern — consistent on form, but all share
// the fragility of breaking if a redirectTo query param is appended.
```

The specific concern is that `board/settings/layout.tsx` calls `redirect('/login')` with no
query string today, but if the app later adds `?redirectTo=...` (a common Next.js pattern)
the assertion breaks silently (test goes red) or gives a misleading failure message.

**Fix:** Use a regex assertion consistent with the intent:

```typescript
await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
```

Apply the same fix to all `toHaveURL('/login', ...)` calls in the file for consistency
(lines 15, 21, 24, 27, 35, 136, 157, 168).

---

### WR-03: `ensureUser` in `global-setup.ts` resets `force_password_reset_at` on existing users (lines 29-39) to prevent expired-reset redirects. The `board_no_tenant` user is included in this flow. However, the reset sets a date 30 days ahead. If a test run expires precisely on that boundary and the clock is slightly off, the board_no_tenant user will be treated as having an expired reset, causing `loginViaAPI` to land on `/reset-password` instead of `/board`, and `storageState` will be saved as the reset page rather than an authenticated board session. This is the same latent issue that already exists for all other users, but it is newly introduced for `board_no_tenant`.

**File:** `e2e/global-setup.ts:29-38`

**Issue:** The `force_password_reset_at` logic writes a future date but does not account for
the time already elapsed in a long-running CI suite. More critically, the date is set at the
start of `ensureUser` for existing users, but the actual `loginViaAPI` call happens later
(potentially minutes later in a slow CI run with 12 workers). The window is small but
non-zero.

**Fix:** This is a pre-existing pattern issue. The fix should apply uniformly: set
`force_password_reset_at` to a far-future sentinel value (e.g. 365 days) rather than 30
days to reduce the risk of boundary collisions in long-running CI:

```typescript
const nextReset = new Date()
nextReset.setFullYear(nextReset.getFullYear() + 1)  // 1 year instead of 30 days
```

---

## Info

### IN-01: The `board_no_tenant` user's environment variable fallback email (`'e2e-board-no-tenant@evecosys-test.com'`) is the only TEST_USERS entry without a dedicated env-var name documented in any `.env.example` or README. All other user emails are overridable via `E2E_MANAGER_EMAIL`, `E2E_DRIVER_EMAIL`, etc. The new entry uses `E2E_BOARD_NO_TENANT_EMAIL` (line 24) but if this variable is not added to `.env.example`, new team members setting up the environment will not know it exists.

**File:** `e2e/helpers/auth.helpers.ts:24`

**Issue:** Inconsistent documentation of environment variable for `board_no_tenant` email override.

**Fix:** Add `E2E_BOARD_NO_TENANT_EMAIL=e2e-board-no-tenant@evecosys-test.com` to
`.env.example` alongside the other E2E user email variables.

---

_Reviewed: 2026-06-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
