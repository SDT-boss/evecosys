---
phase: 03-tenant-switcher-states
plan: 01
subsystem: ui
tags: [react, next.js, context, middleware, vitest, playwright]

# Dependency graph
requires:
  - phase: 02-platform-admin-shell
    provides: TenantList, PlatformShell, setActiveTenant server action, platform/layout.tsx
provides:
  - middleware.ts with x-pathname header forwarding for RSC pathname detection
  - TenantContext with TenantProvider and useTenantContext hook
  - BlockedScreen component wrapping EmptyState for "no active tenant" guard
  - setActiveTenant ActionResult return type (ok: boolean; error?: string)
  - Complete test scaffolding: BlockedScreen.test.tsx, TenantContext.test.tsx
  - Updated mock infrastructure: TenantList.test.tsx, setActiveTenant.test.ts
  - E2E page object PlatformPage.ts and tenant-switcher.spec.ts stubs
affects:
  - 03-02 (Wave 1 — loading/success states; consumes TenantContext, middleware)
  - 03-03 (Wave 2 — blocked screen guard; consumes BlockedScreen, middleware)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TenantContext pattern: React context bridging server-rendered initialName prop to client-side optimistic updates across Server Component boundary"
    - "ActionResult pattern: server actions return { ok: boolean; error?: string } instead of throwing"
    - "middleware.ts x-pathname forwarding: Next.js middleware injects pathname header for RSC layout consumption"

key-files:
  created:
    - middleware.ts
    - components/platform/TenantContext.tsx
    - components/platform/BlockedScreen.tsx
    - test/unit/components/platform/TenantContext.test.tsx
    - test/unit/components/platform/BlockedScreen.test.tsx
    - e2e/page-objects/PlatformPage.ts
    - e2e/tests/platform/tenant-switcher.spec.ts
  modified:
    - app/(dashboard)/platform/actions.ts
    - test/unit/components/platform/TenantList.test.tsx
    - test/unit/lib/platform/setActiveTenant.test.ts
    - test/unit/components/platform/ActiveTenantIndicator.test.tsx

key-decisions:
  - "Middleware approach (Approach A) chosen for pathname detection — keeps platform/layout.tsx fully server-rendered; middleware scoped to all non-static routes via matcher"
  - "setActiveTenant returns ActionResult { ok, error } (D-06) — updated in Wave 0 so all downstream test mocks are already correct"
  - "TenantContext is Wave 0 infrastructure — PlatformShell wraps in TenantProvider in Wave 1 (03-02); context API established here"

patterns-established:
  - "Pattern: TenantProvider/useTenantContext — provider takes initialName from server-rendered prop; consumers call useTenantContext() without prop drilling across Server Component boundaries"
  - "Pattern: ActionResult return from server actions — structured { ok, error } instead of throw for client-side error handling without try/catch"
  - "Pattern: E2E page objects mirror DashboardPage.ts class structure with typed locators and action helpers"

requirements-completed:
  - SWIT-01
  - SWIT-02
  - SWIT-03
  - SWIT-04

# Metrics
duration: 5min
completed: 2026-06-20
---

# Phase 3 Plan 01: Wave 0 Infrastructure Summary

**middleware.ts + TenantContext + BlockedScreen + ActionResult return type — complete Wave 0 scaffolding unblocking all Wave 1 and Wave 2 implementation**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-20T10:19:53Z
- **Completed:** 2026-06-20T10:24:39Z
- **Tasks:** 2
- **Files modified:** 11 (7 created, 4 modified)

## Accomplishments

- `middleware.ts` created at project root forwarding `x-pathname` header so `platform/layout.tsx` can detect sub-routes as an RSC without a client boundary
- `TenantContext.tsx` provides `TenantProvider` and `useTenantContext` — the context infrastructure that bridges `TenantList` optimistic state updates to `ActiveTenantIndicator` header across the Server Component boundary in `platform/page.tsx`
- `BlockedScreen.tsx` wraps `EmptyState` with "Select a workspace to continue" title, description, and a `Button asChild Link` CTA to `/platform`
- `setActiveTenant` upgraded from `Promise<void>` to `Promise<{ ok: boolean; error?: string }>` (ActionResult pattern, D-06) so Wave 1 error handling works correctly
- Full test scaffolding: 6 new test files/additions, all 34 tests green (32 pass, 2 todo stubs for Wave 1)

## Task Commits

1. **Task 1: Create middleware.ts, TenantContext.tsx, and BlockedScreen.tsx** - `2935799` (feat)
2. **Task 2: Create test scaffolding — new test files + mock updates** - `313ade7` (feat)

## Files Created/Modified

- `middleware.ts` — Next.js middleware forwarding `x-pathname` header; matcher excludes `_next/static`, `_next/image`, `favicon.ico`
- `components/platform/TenantContext.tsx` — `TenantProvider` (useState + Context.Provider) and `useTenantContext` (throws outside provider)
- `components/platform/BlockedScreen.tsx` — `EmptyState` wrapper with title, description, and Button/Link CTA to `/platform`
- `app/(dashboard)/platform/actions.ts` — `setActiveTenant` now returns `{ ok: true }` on success, `{ ok: false, error }` on catch
- `test/unit/components/platform/TenantContext.test.tsx` — 3 tests: initialName prop, setActiveTenantName update, throw outside provider
- `test/unit/components/platform/BlockedScreen.test.tsx` — 3 tests: title, description regex, link href and accessible name
- `test/unit/components/platform/TenantList.test.tsx` — mock updated to `{ ok: true }`; added `useTenantContext` mock to prevent Wave 1 import errors
- `test/unit/lib/platform/setActiveTenant.test.ts` — 3 new ActionResult tests (total 7 passing): ok: true, ok: false for Error, ok: false for non-Error
- `test/unit/components/platform/ActiveTenantIndicator.test.tsx` — 2 `it.todo()` stubs for Phase 3 context integration (SWIT-02)
- `e2e/page-objects/PlatformPage.ts` — `PlatformPage` class with 5 methods: `goto`, `clickTenantRow`, `expectActiveTenantName`, `expectBlockedScreen`, `expectSwitchError`
- `e2e/tests/platform/tenant-switcher.spec.ts` — SWIT-01 through SWIT-04 stubs using `test.skip()`, two describe blocks with `storageState: platform-admin.json`

## Decisions Made

- **Middleware Approach A selected:** Added `middleware.ts` at project root (instead of a thin `'use client'` wrapper using `usePathname()`). Keeps `platform/layout.tsx` fully server-rendered; adds only ~8 lines of infrastructure that processes all non-static routes.
- **ActionResult implemented in Wave 0:** The plan originally placed the `setActiveTenant` return-type change in Wave 1, but to make the Wave 0 test scaffolding correct (mock returns `{ ok: true }` not `undefined`), the real implementation was updated here simultaneously. This is consistent with the plan's `must_haves.truths` requirement: "setActiveTenant mock returns { ok: true } in TenantList.test.tsx (not undefined)".
- **E2E tests use `test.skip()` not `test.todo()`:** `test.skip()` allows the test body to compile and be statically analyzed while producing 0 failures; `test.todo()` with a body would throw. Plan spec confirmed `test.skip` is the correct Wave 0 stub pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated setActiveTenant implementation alongside test mock**
- **Found during:** Task 2 (test scaffolding)
- **Issue:** The plan specified updating the TenantList.test.tsx mock to return `{ ok: true }` but the real `setActiveTenant` still returned `void`. The new `setActiveTenant.test.ts` tests explicitly assert `{ ok: true }` / `{ ok: false, error }` return values — these would fail against the `void` implementation.
- **Fix:** Updated `app/(dashboard)/platform/actions.ts` to implement the ActionResult return type (D-06) in Wave 0 alongside the test scaffolding, so both the mock and the real implementation are in sync.
- **Files modified:** `app/(dashboard)/platform/actions.ts`
- **Verification:** All 7 `setActiveTenant.test.ts` tests pass; 4 existing + 3 new ActionResult tests green.
- **Committed in:** `313ade7` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical functionality for test correctness)
**Impact on plan:** Essential synchronization — the plan's `must_haves.truths` required `{ ok: true }` mock but the real implementation was still `void`. Fixing the implementation in Wave 0 prevents a confusing mismatch where tests pass against a mock but would fail against the real code.

## Issues Encountered

None — the temp filesystem ran out of space mid-execution but did not affect file writes or commits; git operations completed successfully.

## Known Stubs

- `e2e/tests/platform/tenant-switcher.spec.ts`: All 4 E2E tests use `test.skip()`. These are intentional Wave 0 stubs. Full implementation deferred to plan 03-03 after Wave 1 (loading/success states) and Wave 2 (blocked screen) source changes land.
- `test/unit/components/platform/ActiveTenantIndicator.test.tsx`: 2 `it.todo()` stubs for context integration (SWIT-02). Will be fleshed out in plan 03-02 after `ActiveTenantIndicator` is updated to read from `useTenantContext()`.

These stubs are intentional and documented — they do not prevent Wave 0's goal (unblocking Wave 1 and Wave 2) from being achieved.

## Next Phase Readiness

- **Wave 1 (03-02) is unblocked:** `TenantContext` API is established; `PlatformShell` can now wrap in `<TenantProvider initialName={activeTenantName}>` and `ActiveTenantIndicator` can call `useTenantContext()`
- **Wave 2 (03-03) is unblocked:** `BlockedScreen` component exists; `middleware.ts` is in place; `platform/layout.tsx` can add the `x-pathname` header read and blocked-screen guard
- **All existing tests remain green:** `make test` exits 0 (330 passed, 4 skipped, 2 todo across 44 test files)

---
*Phase: 03-tenant-switcher-states*
*Completed: 2026-06-20*

## Self-Check: PASSED

All 8 created/modified files exist on disk. Both task commits (2935799, 313ade7) confirmed in git history.
