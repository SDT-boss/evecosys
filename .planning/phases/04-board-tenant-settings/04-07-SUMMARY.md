---
phase: 04-board-tenant-settings
plan: 07
subsystem: api
tags: [byodb, tenant-state-machine, rollback, compensation, reset-password, 501]

# Dependency graph
requires:
  - phase: 04-board-tenant-settings
    provides: BYODB route with Registered→Provisioning state transition (04-04)
provides:
  - BYODB route with compensating rollback on ConnectivityError and CredentialValidationError (CR-01)
  - reset-password stub returning 501 Not Implemented instead of false 200 (CR-02)
  - MemberTable checked res.ok before showing Reset email sent (CR-02 UX fix)
affects: [04-board-tenant-settings, byodb, tenant-provisioning, member-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compensating rollback pattern: capture initialState before write, rollback in catch if route caused the transition"
    - "Stub 501 pattern: return 501 Not Implemented with JSON error body instead of false 200 ok:true"

key-files:
  created: []
  modified:
    - app/api/board/settings/byodb/route.ts
    - test/unit/api/board/settings/byodb.test.ts
    - app/api/board/settings/users/reset-password/route.ts
    - components/board/settings/MemberTable.tsx

key-decisions:
  - "Rollback guard uses initialState === 'Registered': only rolls back when THIS route caused the Registered→Provisioning transition, preventing spurious rollbacks when tenant was already Provisioning"
  - "501 stub keeps auth guard: unauthenticated callers still get 401/403 before seeing 501, preventing info leakage"
  - "[Rule 1] MemberTable.handleForceReset fixed to check res.ok: without this fix, returning 501 still shows false Reset email sent message — the res.ok check is load-bearing for CR-02 to have UX effect"

patterns-established:
  - "Compensating rollback in API routes: capture pre-mutation state, restore on catch for idempotent retry"
  - "Stub routes should return 4xx/5xx not 2xx: prevents client UX from showing false success"

requirements-completed: [BSET-02, BSET-03]

# Metrics
duration: 10min
completed: 2026-06-21
---

# Phase 4 Plan 07: CR-01 + CR-02 Gap Closure Summary

**BYODB route with Provisioning→Registered compensating rollback on ConnectivityError/CredentialValidationError, plus reset-password stub changed to 501 Not Implemented with MemberTable res.ok guard**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-21T00:12:26Z
- **Completed:** 2026-06-21T00:22:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- CR-01: BYODB route now captures `initialState` before the Registered→Provisioning write. ConnectivityError and CredentialValidationError catch branches roll back to Registered when `initialState === 'Registered'`, preventing tenants from being permanently stuck in Provisioning on transient failures
- CR-02: reset-password route returns 501 Not Implemented instead of 200 `{ ok: true }`, with TODO debt marker removed
- CR-02 (Rule 1 bug fix): MemberTable.handleForceReset now checks `res.ok` before setting success state — without this fix, returning 501 still displayed the false "Reset email sent" message; added `resetError` state with alert display

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): CR-01 rollback tests** - `2779778` (test)
2. **Task 1 (GREEN): CR-01 byodb rollback implementation** - `67ab846` (feat)
3. **Task 2: CR-02 reset-password 501 + MemberTable fix** - `08bb1cd` (fix)

## Files Created/Modified

- `app/api/board/settings/byodb/route.ts` - Added `initialState` capture and compensating rollback in ConnectivityError and CredentialValidationError catch branches
- `test/unit/api/board/settings/byodb.test.ts` - Added CredentialValidationError import; added 2 new rollback tests (ConnectivityError and CredentialValidationError paths); existing 6 tests unchanged
- `app/api/board/settings/users/reset-password/route.ts` - Removed TODO comment and body-parse call; changed return to 501 Not Implemented with JSON error body; updated JSDoc
- `components/board/settings/MemberTable.tsx` - Fixed handleForceReset to check res.ok; added resetError state; added Reset failed Alert display

## Decisions Made

- Guard rollback with `initialState === 'Registered'`: the route should only roll back state that IT changed. If the tenant was already in Provisioning when the route was called (previous call left it there), the route should not roll back — retrying is the caller's responsibility. This prevents double-rollback scenarios.
- Keep auth guard in 501 stub: the route still validates session and board role before returning 501. This prevents unauthenticated callers from probing whether the endpoint exists.
- Fix MemberTable in same commit as route change: the 501 route change is only effective if the client checks res.ok — shipping the route change without the client fix would create a false impression that CR-02 is closed when the UX bug remains.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed MemberTable.handleForceReset to check res.ok**
- **Found during:** Task 2 (CR-02 reset-password route change)
- **Issue:** MemberTable's handleForceReset did not check `res.ok` — it awaited the fetch and always called `setResetSuccess(userId)` regardless of response status. Changing the route to return 501 would have no UX effect without this fix.
- **Fix:** Wrapped success path in `if (res.ok)`, added else branch to extract error message and set `resetError` state, added `resetError` Alert display in JSX. Added timeout to auto-clear error after 5 seconds.
- **Files modified:** `components/board/settings/MemberTable.tsx`
- **Verification:** TypeScript typecheck passes (0 errors); all 370 tests pass
- **Committed in:** 08bb1cd (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Auto-fix essential for CR-02 to have any UX effect. Without checking res.ok, the false "Reset email sent" message persists even with the 501 route. No scope creep.

## Issues Encountered

- Vitest module aliasing issue: running `make test` from the main project root causes Vitest to discover test files in the worktree, but the `@` path alias resolves to the main repo's source files (not the worktree's modified files). All tests were verified by running `npx vitest run` from the worktree directory where the config's `__dirname` resolves correctly. All 48 test files, 370 tests pass.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `reset-password` returns 501 | `app/api/board/settings/users/reset-password/route.ts` | Intentional — actual `admin.auth.admin.generateLink('recovery', ...)` implementation deferred per BSET-02 scope. Route correctly returns 501 so client shows error state rather than false success. |

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. This plan closes existing threat items T-04-CR01-01, T-04-CR01-02, and T-04-CR02-01 from the plan's STRIDE threat register.

## Next Phase Readiness

- CR-01 and CR-02 are fully closed
- BYODB route is safe for transient connectivity failures — tenants can retry registration after ConnectivityError
- reset-password UX correctly shows error state instead of false success
- Plans 04-06 (CR-03: BYODB CredentialValidationError test coverage) and remaining gap closure plans can proceed independently

---
*Phase: 04-board-tenant-settings*
*Completed: 2026-06-21*
