---
phase: 02-platform-admin-shell
plan: 01
subsystem: database
tags: [supabase, migrations, typescript, vitest, tdd, tenant-management]

# Dependency graph
requires:
  - phase: 01-auth-role-foundation
    provides: platform_admin role in DB + RLS, tenants table with existing columns
provides:
  - "idempotent migration adding tenants.name TEXT NOT NULL DEFAULT '' column"
  - "Tenant TypeScript interface with name: string field"
  - "mapTenantState utility mapping TenantState to DisplayStatus | null"
  - "statusBadgeVariant utility mapping DisplayStatus to Badge variant"
  - "four Wave 0 RED test contracts: tenantStatus (GREEN), setActiveTenant, TenantList, ActiveTenantIndicator"
affects:
  - 02-platform-admin-shell (plans 02 and 03 implement against these contracts)
  - all existing tests using Tenant interface (authGuard, registrationService, rollback, stateMachine, tenantIsolation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 TDD scaffolding: write RED test contracts before implementation modules exist"
    - "Idempotent DDL with ADD COLUMN IF NOT EXISTS guards"
    - "Pure utility module pattern: no React, no side effects, exhaustive switch for type safety"

key-files:
  created:
    - supabase/migrations/20260618120000_add_tenant_name.sql
    - lib/platform/tenantStatus.ts
    - test/unit/lib/platform/tenantStatus.test.ts
    - test/unit/lib/platform/setActiveTenant.test.ts
    - test/unit/components/platform/TenantList.test.tsx
    - test/unit/components/platform/ActiveTenantIndicator.test.tsx
  modified:
    - lib/tenant/types.ts (added name: string field to Tenant interface)
    - test/unit/lib/tenant/authGuard.test.ts (added name: '' to Tenant fixture)
    - test/unit/lib/tenant/registrationService.test.ts (added name: '' to Tenant fixture)
    - test/unit/lib/tenant/rollback.test.ts (added name: '' to Tenant fixture)
    - test/unit/lib/tenant/stateMachine.test.ts (added name: '' to tenant() factory)
    - test/unit/lib/tenant/tenantIsolation.test.ts (added name: '' to Tenant fixtures)

key-decisions:
  - "name field uses empty string default (not null) so existing rows are valid without a data migration; board members set canonical names in Phase 4 BSET-01"
  - "Decommissioned tenants map to null in mapTenantState to enforce least-information filtering at the UI layer"
  - "Wave 0 RED tests reference modules from Plans 02/03 intentionally — expected RED state until those plans land"

patterns-established:
  - "mapTenantState exhaustive switch: Active→Active, Registered→Pending, Provisioning→Pending, Suspended→Suspended, Decommissioned→null"
  - "statusBadgeVariant exhaustive switch: Active→default, Pending→secondary, Suspended→destructive"
  - "setActiveTenant cookie: name=platform_active_tenant, httpOnly:false (client must read for Phase 3 optimistic UI), no maxAge (session-duration)"

requirements-completed: [PADM-01, PADM-02, PADM-03, PADM-04]

# Metrics
duration: 35min
completed: 2026-06-19
---

# Phase 02 Plan 01: Platform Admin Shell — Data Foundation & Wave 0 Contracts Summary

**Idempotent tenants.name migration, Tenant type sync, mapTenantState/statusBadgeVariant utility, and four Wave 0 RED test contracts for all PADM components**

## Performance

- **Duration:** 35 min
- **Started:** 2026-06-19T00:10:00Z
- **Completed:** 2026-06-19T00:45:00Z
- **Tasks:** 2 executed (Task 3 is a human-action checkpoint requiring `make migrate`)
- **Files modified:** 12

## Accomplishments
- Migration `20260618120000_add_tenant_name.sql` adds `name TEXT NOT NULL DEFAULT ''` idempotently to `public.tenants`
- `Tenant` TypeScript interface updated with `name: string` after `owner_id`; all five existing test fixtures updated to include the field
- `lib/platform/tenantStatus.ts` exports `DisplayStatus`, `mapTenantState`, and `statusBadgeVariant` as pure functions with exhaustive switches
- Four Wave 0 RED test files encode behavior contracts: tenantStatus tests pass GREEN; setActiveTenant, TenantList, and ActiveTenantIndicator are correctly RED awaiting Plans 02/03 implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tenants.name migration + sync Tenant type + status utility** - `4541cd9` (feat)
2. **Task 2: Write four Wave 0 RED test files** - `0b51a73` (test)
3. **Task 3: Push schema migration to local DB** - CHECKPOINT — human runs `make migrate`

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified
- `supabase/migrations/20260618120000_add_tenant_name.sql` — Adds `name TEXT NOT NULL DEFAULT ''` to `public.tenants`
- `lib/tenant/types.ts` — `Tenant` interface now includes `name: string` (Phase 2 addition)
- `lib/platform/tenantStatus.ts` — Pure utility: `DisplayStatus` type, `mapTenantState`, `statusBadgeVariant`
- `test/unit/lib/platform/tenantStatus.test.ts` — 8 tests, all GREEN (it.each tables for both functions)
- `test/unit/lib/platform/setActiveTenant.test.ts` — RED contract: cookie name/path/httpOnly/revalidatePath assertions
- `test/unit/components/platform/TenantList.test.tsx` — RED contract: render, EmptyState, error state, row click
- `test/unit/components/platform/ActiveTenantIndicator.test.tsx` — RED contract: null→placeholder, name renders, no placeholder when set
- `test/unit/lib/tenant/authGuard.test.ts` — Added `name: ''` to TENANT_A fixture (Rule 1 auto-fix)
- `test/unit/lib/tenant/registrationService.test.ts` — Added `name: ''` to PROVISIONING_TENANT (Rule 1 auto-fix)
- `test/unit/lib/tenant/rollback.test.ts` — Added `name: ''` to PROVISIONING_TENANT (Rule 1 auto-fix)
- `test/unit/lib/tenant/stateMachine.test.ts` — Added `name: ''` to tenant() factory (Rule 1 auto-fix)
- `test/unit/lib/tenant/tenantIsolation.test.ts` — Added `name: ''` to TENANT_A and TENANT_B (Rule 1 auto-fix)

## Decisions Made
- Empty string default chosen over nullable: `NOT NULL DEFAULT ''` ensures existing rows have a valid value without data migration; board members set canonical names in Phase 4 BSET-01
- `Decommissioned → null` in mapTenantState enforces least-information filtering (T-2-02 threat mitigation)
- Wave 0 RED tests intentionally reference modules not yet created (Plans 02/03); this is correct scaffolding behavior

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated five existing test fixtures to include new required `name` field**
- **Found during:** Task 1 (migration + type sync)
- **Issue:** Adding `name: string` (non-optional) to `Tenant` interface caused 6 TypeScript errors in existing test files that constructed `Tenant` objects without the new field
- **Fix:** Added `name: ''` to all five affected test fixtures in `authGuard.test.ts`, `registrationService.test.ts`, `rollback.test.ts`, `stateMachine.test.ts`, `tenantIsolation.test.ts`
- **Files modified:** 5 test files listed above
- **Verification:** `npx tsc --noEmit` exits 0 after fix
- **Committed in:** `4541cd9` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — required field broke existing test fixtures)
**Impact on plan:** Fix was necessary for TypeScript correctness. No scope creep. Empty string `''` is the correct default matching the DB migration's `DEFAULT ''`.

## Issues Encountered
None during automated tasks. Task 3 (schema push) is a human-action checkpoint — the migration file exists but has not yet been pushed to the local Supabase DB.

## User Setup Required

**Task 3 requires manual migration push.** Run:
```bash
make migrate
```
Then verify: `public.tenants` has column `name | text | not null | default ''::text`.

After confirming, resume Plan 02 execution.

## Next Phase Readiness
- Plan 02 (TenantList + ActiveTenantIndicator components) can proceed once Task 3 migration is applied
- Plan 03 (Platform page + Server Action + layout) can proceed concurrently with Plan 02 (Wave 1)
- Contracts are fixed: all four test files encode the exact behavior Plans 02/03 must implement

## Self-Check: PASSED

- `supabase/migrations/20260618120000_add_tenant_name.sql`: EXISTS, contains `ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`
- `lib/platform/tenantStatus.ts`: EXISTS, exports `mapTenantState`, `statusBadgeVariant`, `DisplayStatus`
- `lib/tenant/types.ts`: contains `name: string`
- `test/unit/lib/platform/tenantStatus.test.ts`: EXISTS, 8 tests PASS
- `test/unit/lib/platform/setActiveTenant.test.ts`: EXISTS, RED (module not found — correct)
- `test/unit/components/platform/TenantList.test.tsx`: EXISTS, RED (module not found — correct)
- `test/unit/components/platform/ActiveTenantIndicator.test.tsx`: EXISTS, RED (module not found — correct)
- Commits: `4541cd9` (feat) and `0b51a73` (test) both present in git log

---
*Phase: 02-platform-admin-shell*
*Completed: 2026-06-19*
