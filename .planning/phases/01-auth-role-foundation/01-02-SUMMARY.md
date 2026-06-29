---
phase: 01-auth-role-foundation
plan: 02
subsystem: auth
tags: [supabase, postgresql, next.js, route-guards, rls, platform_admin]

requires:
  - 01-01 (platform_admin DB role, createPlatformClient, UserRole type)

provides:
  - /platform route with platform_admin role guard (AUTH-02)
  - /board/settings route with board role + tenant ownership guard (AUTH-03)
  - Stub pages for /platform and /board/settings (makes E2E tests from Plan 01 runnable)
  - Migration 20260613120000_platform_admin_role.sql applied to local Supabase

affects:
  - Phase 2 (Platform Admin Shell — builds on platform/layout.tsx guard)
  - Phase 4 (Board Settings tabs — builds on board/settings route guard)
  - E2E tests from Plan 01 (role-isolation.spec.ts can now navigate to /platform and /board/settings)

tech-stack:
  added: []
  patterns:
    - "Four-step role guard skeleton (exact copy of manager/layout.tsx): createClient → getUser → fetch profile → role check → redirect('/login')"
    - "Defense-in-depth for board/settings: parent board/layout.tsx catches non-board users first; settings layout adds secondary tenant ownership check"
    - "Stub pages: Server Components (no 'use client'), no data fetching, CSS custom properties (var(--ds-spacing-6), var(--text), var(--text3)) — no hardcoded hex values"
    - "No DashboardShell in platform/layout.tsx — Phase 2 builds the platform shell; Phase 1 returns <>{children}</>"

key-files:
  created:
    - app/(dashboard)/platform/layout.tsx
    - app/(dashboard)/platform/page.tsx
    - app/(dashboard)/board/settings/layout.tsx
    - app/(dashboard)/board/settings/page.tsx
  modified:
    - types/index.ts (platform_admin added to UserRole — brought in from Plan 01)
    - lib/supabase/server.ts (createPlatformClient added — brought in from Plan 01)
    - supabase/migrations/20260613120000_platform_admin_role.sql (applied to local Supabase — brought in from Plan 01)
    - supabase/seed.sql (local dev seed for platform_admin user — brought in from Plan 01)
    - e2e/helpers/auth.helpers.ts (platform_admin added to TEST_USERS — brought in from Plan 01)
    - e2e/global-setup.ts (ensureTestUser('platform_admin') — brought in from Plan 01)
    - e2e/tests/auth-guards/role-isolation.spec.ts (E2E scaffold for /platform and /board/settings — brought in from Plan 01)
    - .gitignore (supabase/.temp/ added)

key-decisions:
  - "Board settings layout does NOT import DashboardShell — the parent app/(dashboard)/board/layout.tsx already wraps with DashboardShell; settings layout returns <>{children}</> to avoid double-wrapping"
  - "platform/layout.tsx uses return <>{children}</> not a <main> wrapper — Phase 2 will supply the platform shell; the minimal fragment return keeps the guard logic pure"
  - "Worktree was created from main (26bb506) rather than from the EVE-145 feature branch (which had Plan 01 changes); Plan 01 source files were checked out from feature/eve-145-design-tenant-switcher-and-workspace-context-ux before implementing Plan 02"

requirements-completed:
  - AUTH-02
  - AUTH-03

duration: 14min
completed: 2026-06-18
---

# Phase 1 Plan 02: Auth & Role Foundation — Route Guards and Stub Pages Summary

**Four route files created (/platform and /board/settings layouts + stub pages); Phase 1 migration pushed to local Supabase; AUTH-02 and AUTH-03 route guard enforcement in place**

## Performance

- **Duration:** 14 minutes
- **Started:** 2026-06-18T03:14:00Z
- **Completed:** 2026-06-18T03:28:00Z
- **Tasks:** 2 (both auto)
- **Files created:** 4 route files
- **Files modified:** 8 (Plan 01 foundation files brought in)

## Accomplishments

- Migration `20260613120000_platform_admin_role.sql` applied to local Supabase (`make migrate` exits 0) — adds `platform_admin` to `users.role` CHECK constraint, defines `set_active_tenant()` SQL helper, and creates `tenants_select_platform_admin` RLS policy
- `app/(dashboard)/platform/layout.tsx` implements the four-step role guard skeleton (identical to `manager/layout.tsx`) with `profile.role !== 'platform_admin'` check; returns `<>{children}</>` without DashboardShell — Phase 2 builds the platform shell
- `app/(dashboard)/platform/page.tsx` — minimal Server Component stub with `var(--ds-spacing-6)` padding, `var(--text)` heading, `var(--text3)` subtext; no hardcoded hex values; satisfies AUTH-02 testability
- `app/(dashboard)/board/settings/layout.tsx` — role guard (board) plus secondary tenant ownership query (`SELECT id FROM tenants WHERE owner_id = auth.uid()`); two redirect paths (no user → /login; no tenant → /login); returns `<>{children}</>` without DashboardShell (parent board/layout.tsx already wraps)
- `app/(dashboard)/board/settings/page.tsx` — minimal Server Component stub; `Tenant Settings` heading with CSS custom properties; satisfies AUTH-03 testability
- All TypeScript compiles clean (`npx tsc --noEmit` exits 0); lint exits 0 (0 errors, 36 pre-existing warnings); unit tests: 301 passed, 4 skipped

## Task Commits

Each task was committed atomically:

1. **Task 1: Push Plan 01 foundation files + migration** - `5ea46ec` (chore)
   - `.gitignore` update for `supabase/.temp/` — `0bf1596` (chore)
2. **Task 2: Four route files** - `d009ea3` (feat)

## Files Created

- `app/(dashboard)/platform/layout.tsx` — platform_admin role guard, four-step skeleton, no DashboardShell, returns `<>{children}</>`
- `app/(dashboard)/platform/page.tsx` — stub: "Platform Admin" h1, "Platform shell coming in Phase 2." p, CSS tokens only
- `app/(dashboard)/board/settings/layout.tsx` — board role guard + tenant ownership check (owner_id), two redirect paths, no DashboardShell, returns `<>{children}</>`
- `app/(dashboard)/board/settings/page.tsx` — stub: "Tenant Settings" h1, "Board settings tabs coming in Phase 4." p, CSS tokens only

## Decisions Made

- **Board settings layout returns `<>{children}</>`**: The parent `app/(dashboard)/board/layout.tsx` already wraps with `DashboardShell`. Adding another `DashboardShell` in the settings layout would cause double-wrapping. The settings layout only adds the tenant ownership guard and returns children transparently.
- **Platform layout uses fragment return**: `return <>{children}</>` — Phase 2 will implement the Platform Admin shell. Using a bare fragment keeps the Phase 1 guard minimal and avoids any UI assumptions.
- **Worktree received Plan 01 foundation files via git checkout**: The agent worktree was branched from `main` (26bb506) rather than from the EVE-145 feature branch (1d272c5 which had Plan 01 changes). The 8 Plan 01 source files were restored by `git checkout feature/eve-145-design-tenant-switcher-and-workspace-context-ux -- <file>` before implementing Plan 02. This is documented as a deviation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 01 foundation files missing from worktree**
- **Found during:** Task 1 (pre-flight check before migration push)
- **Issue:** The worktree was branched from `main` (commit `26bb506`), which does not include Plan 01 changes. All Plan 01 source artifacts (`types/index.ts`, `lib/supabase/server.ts`, migration file, seed, E2E files, test file) were absent from the worktree. Task 2 route guards depend on `UserRole` including `'platform_admin'` and `createPlatformClient` existing.
- **Fix:** Used `git checkout feature/eve-145-design-tenant-switcher-and-workspace-context-ux -- <file>` to restore 8 source files from the EVE-145 branch into the worktree, then committed them as `chore(01-02)`.
- **Files modified:** 8 files (see task commits section)
- **Commit:** `5ea46ec`

**2. [Rule 2 - Missing] `.gitignore` missing `supabase/.temp/` exclusion**
- **Found during:** Task 1 (post-migration `git status` check)
- **Issue:** Running `make migrate` generated `supabase/.temp/cli-latest` (Supabase CLI version cache). This file was untracked and would pollute the commit if not ignored.
- **Fix:** Added `supabase/.temp/` to `.gitignore`.
- **Files modified:** `.gitignore`
- **Commit:** `0bf1596`

## Known Stubs

Both stub pages are intentional stubs per the plan specification:

| File | Stub | Reason | Future Plan |
|------|------|--------|-------------|
| `app/(dashboard)/platform/page.tsx` | "Platform shell coming in Phase 2." | AUTH-02 requires a reachable page for testability; full shell is Phase 2 work | Phase 2 |
| `app/(dashboard)/board/settings/page.tsx` | "Board settings tabs coming in Phase 4." | AUTH-03 requires a reachable page for testability; settings tabs are Phase 4 work | Phase 4 |

These stubs are intentional and do not block the plan's goal (route guard enforcement). The E2E tests verify guard behavior, not stub content.

## Threat Flags

No new threat surface beyond what was documented in the plan's threat model:
- `T-02-01`: platform/layout.tsx role check mitigated — server-fetched from RLS-protected `public.users`
- `T-02-02`: board/settings/layout.tsx dual check mitigated — role + tenant ownership, both independently enforced

## Self-Check

---

## Self-Check: PASSED

**Files verified:**
- `app/(dashboard)/platform/layout.tsx` — FOUND, contains `platform_admin`, no `DashboardShell`
- `app/(dashboard)/platform/page.tsx` — FOUND, contains `Platform Admin`, `var(--ds-spacing-6)`, `var(--text)`
- `app/(dashboard)/board/settings/layout.tsx` — FOUND, contains `board`, `owner_id`, no `DashboardShell`
- `app/(dashboard)/board/settings/page.tsx` — FOUND, contains `Tenant Settings`, `var(--ds-spacing-6)`

**Commits verified:**
- `5ea46ec` — Plan 01 foundation files + migration push
- `0bf1596` — .gitignore update
- `d009ea3` — Four route files

**Quality gates:**
- `npx tsc --noEmit`: exits 0 (PASS)
- `make lint`: exits 0, 0 errors (PASS)
- `make test`: 301 passed, 4 skipped (PASS)
- `make migrate`: exits 0 (PASS)

---

*Phase: 01-auth-role-foundation*
*Completed: 2026-06-18*
