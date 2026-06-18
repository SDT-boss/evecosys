---
plan: 01-03
phase: 01-auth-role-foundation
status: complete
gap_closure: true
requirements: [AUTH-03]
completed: 2026-06-18
---

## Summary

Added E2E test infrastructure and a Playwright test for the SC-2 negative case: a board member with no tenant row is denied access to `/board/settings` and redirected to `/login`.

## What Was Built

**Task 1 — board_no_tenant in auth helpers (`e2e/helpers/auth.helpers.ts`)**
- Added `board_no_tenant` entry to `TEST_USERS` (role `'board'`, unique email `e2e-board-no-tenant@evecosys-test.com`)
- Added `board_no_tenant: 'e2e/.auth/board-no-tenant.json'` to `AUTH_STATE_PATH`
- Added `board_no_tenant: '/board'` to both `loginViaUI` and `loginViaAPI` destination maps
- `RoleKey` type expands automatically via `keyof typeof TEST_USERS` — no manual type change needed

**Task 2 — global setup + E2E test**
- `e2e/global-setup.ts`: added `ensureTestUser('board_no_tenant')` to the user-creation `Promise.all`; added `board_no_tenant` to the storageState generation tuple
- `e2e/tests/auth-guards/role-isolation.spec.ts`: new `test.describe` block at end of file asserts `GET /board/settings → /login` for a board user with no tenant row

## Key Files

### Created
- (none — this plan adds to existing files only)

### Modified
- `e2e/helpers/auth.helpers.ts` — board_no_tenant in TEST_USERS, AUTH_STATE_PATH, loginViaUI destinations, loginViaAPI destinations
- `e2e/global-setup.ts` — ensureTestUser + storageState tuple
- `e2e/tests/auth-guards/role-isolation.spec.ts` — new Board member WITHOUT tenant describe block

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✓ clean |
| `grep -c board_no_tenant e2e/helpers/auth.helpers.ts` | 4 (≥ 4 required) |
| `grep -c board_no_tenant e2e/global-setup.ts` | 2 |
| `grep -c board-no-tenant e2e/tests/auth-guards/role-isolation.spec.ts` | 1 (≥ 1 required) |
| `toHaveURL('/login')` assertions in spec | 24 total (includes new one) |
| E2E run (requires live app) | deferred — requires running Supabase + Next.js |

## Deviations

None. Implemented exactly as specified in the plan.

## Self-Check: PASSED

All automated verification checks pass. TypeScript compiles cleanly. The E2E test (`make e2e`) requires a running local Supabase instance and Next.js app — that dependency is acknowledged in the plan's acceptance criteria and deferred to a live environment run.
