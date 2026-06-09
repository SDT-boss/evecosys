---
phase: 03-tenant-isolation-layer
plan: 01
subsystem: auth
tags: [typescript, tenant, error-classes, interfaces, server-only]

# Dependency graph
requires:
  - phase: 02-byodb-registration
    provides: "Tenant type, InvalidStateTransitionError, existing test fixtures"
provides:
  - "AuthSessionError class for unauthenticated session scenarios"
  - "TenantAccessError class with requestedTenantId and authenticatedUserId fields"
  - "DatabaseClient interface with getUser() and getTenantRow() contracts"
  - "Tenant.owner_id field enabling ownership comparison"
  - "server-only installed as production dependency"
affects: [03-02-tenant-auth-guard, 03-03-tenant-isolation-tests]

# Tech tracking
tech-stack:
  added: [server-only@0.0.1]
  patterns: [typed error classes with named constructors, interface-first contract design for auth guard]

key-files:
  created: []
  modified:
    - lib/tenant/types.ts
    - package.json
    - package-lock.json
    - test/unit/lib/tenant/stateMachine.test.ts
    - test/unit/lib/tenant/registrationService.test.ts

key-decisions:
  - "AuthSessionError and TenantAccessError added to types.ts (not a separate file) so all contracts are co-located"
  - "DatabaseClient defined as interface only — concrete Supabase implementation deferred to Plan 02"
  - "server-only installed as production dependency (not devDependencies) per Next.js pattern"
  - "types.ts does NOT import server-only — it is client-safe; only authGuard.ts and service files get the marker"

patterns-established:
  - "Error classes follow InvalidStateTransitionError pattern: extend Error, set this.name in constructor"
  - "Interfaces define contracts before implementations — downstream plans import and implement"

requirements-completed: [SEC-01, SEC-04]

# Metrics
duration: 7min
completed: 2026-06-09
---

# Phase 03 Plan 01: Tenant Isolation Contract Layer Summary

**AuthSessionError, TenantAccessError, DatabaseClient interface, and Tenant.owner_id added to types.ts with server-only installed — Phase 3 contract foundation complete**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-09T10:37:12Z
- **Completed:** 2026-06-09T10:44:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `owner_id: string` to the Tenant interface, mirroring the existing DB schema column
- Added `DatabaseClient` interface defining `getUser()` and `getTenantRow()` contracts for downstream TenantAuthGuard
- Added `AuthSessionError` and `TenantAccessError` typed error classes with descriptive messages
- Installed `server-only@0.0.1` as a production dependency
- Updated both existing tenant test fixtures to include `owner_id` — all 49 unit tests remain green

## Task Commits

Each task was committed atomically:

1. **Task 1: Install server-only and add Phase 3 contracts to types.ts** - `cf169f3` (feat)
2. **Task 2: Add owner_id to existing Tenant fixtures so the suite stays green** - `9ef9658` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `lib/tenant/types.ts` - Added owner_id to Tenant, DatabaseClient interface, AuthSessionError, TenantAccessError
- `package.json` - Added server-only@^0.0.1 to production dependencies
- `package-lock.json` - Updated lock file after server-only install
- `test/unit/lib/tenant/stateMachine.test.ts` - Added owner_id: 'owner-t1' to tenant() factory
- `test/unit/lib/tenant/registrationService.test.ts` - Added owner_id: 'owner-abc' to PROVISIONING_TENANT fixture

## Decisions Made
- `types.ts` keeps all error classes and interfaces co-located (not split into separate files) for single-import convenience for downstream plans
- `DatabaseClient` is an interface only — the concrete Supabase adapter is implemented in Plan 02 of this phase
- `server-only` does NOT appear in `types.ts` itself since that file is imported by test files and must remain client-safe

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plans 02 and 03 can now import `AuthSessionError`, `TenantAccessError`, `DatabaseClient`, and `Tenant.owner_id` directly from `lib/tenant/types.ts`
- The `server-only` package is available for use in `lib/tenant/authGuard.ts` (Plan 02) and service files (Plan 03)
- No blockers or concerns

---
*Phase: 03-tenant-isolation-layer*
*Completed: 2026-06-09*
