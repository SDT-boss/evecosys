---
phase: 05-storybook-coverage
plan: 03
subsystem: layout-shell
tags: [shell-migration, error-boundary, invite-lifecycle, left-rail, storybook]
dependency_graph:
  requires:
    - 05-01 (LeftRailShell + sub-components)
    - 05-02 (ContentStates + InviteStateRow)
  provides:
    - app/(dashboard)/board/layout.tsx (LeftRailShell-based)
    - app/(dashboard)/driver/layout.tsx (LeftRailShell-based)
    - app/(dashboard)/manager/layout.tsx (LeftRailShell-based)
    - components/layout/PlatformShell.tsx (LeftRailShell + TenantProvider)
    - app/(dashboard)/board/error.tsx (ErrorState)
    - app/(dashboard)/driver/error.tsx (ErrorState)
    - app/(dashboard)/manager/error.tsx (ErrorState)
    - app/(dashboard)/board/settings/users/page.tsx (InviteStateRow wired)
  affects:
    - All role dashboards (visual shell migration)
    - Storybook build (DashboardShell.stories.tsx updated)
tech_stack:
  added: []
  patterns:
    - React node icons in NAV array (not string names) — LeftRailShell.NavItemConfig requires React.ReactNode for icon
    - PlatformShell simplified to pass-through wrapper; TenantProvider wraps LeftRailShell
    - ActiveTenantIndicator passed via alertBell prop into ContentUtilityBar children slot
    - DashboardShell retired — all consumers migrated; story retitled to Compositions/LeftRailShell
    - ErrorState used in all three per-role Next.js error boundaries (no raw error.message exposed)
    - InviteStateRow rendered with static mock data pending invitations DB table
key_files:
  created: []
  modified:
    - app/(dashboard)/board/layout.tsx
    - app/(dashboard)/driver/layout.tsx
    - app/(dashboard)/manager/layout.tsx
    - components/layout/PlatformShell.tsx
    - design-system/stories/DashboardShell.stories.tsx
    - app/(dashboard)/board/error.tsx
    - app/(dashboard)/driver/error.tsx
    - app/(dashboard)/manager/error.tsx
    - app/(dashboard)/board/settings/users/page.tsx
  deleted:
    - components/layout/DashboardShell.tsx
decisions:
  - PlatformShell dropped 'use client' directive — no hooks needed after removing topbar/tab navigation; LeftRailShell handles all client-side interactivity internally
  - Building2 Lucide icon chosen for Platform Admin Tenants nav item — represents organization/workspace context
  - DashboardShell.stories.tsx file kept at same path (not renamed) — file rename risks Storybook autodocs; title changed to Compositions/LeftRailShell inside the file
  - ErrorState receives no error.message prop — all three error boundaries show generic copy only per T-05-03 threat mitigation
  - InviteStateRow mock data placed as module-level constant to avoid react-hooks/purity lint error (Date.now() impure in render)
metrics:
  duration: "~35 minutes"
  completed_date: "2026-06-21"
  tasks_completed: 3
  files_created: 0
  files_modified: 9
  files_deleted: 1
---

# Phase 05 Plan 03: Layout Migration + Error Wiring + InviteStateRow Summary

Shell migration from DashboardShell to LeftRailShell for all four layout consumers (board, driver, manager, PlatformShell). DashboardShell.tsx deleted; story updated to Compositions/LeftRailShell. All three per-role error boundaries wired to ErrorState with generic copy only (T-05-03 compliance). InviteStateRow showcased in board users page with static mock data for all 5 lifecycle states.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate all role layouts + retire DashboardShell + update story | 04aa48a | board/layout.tsx, driver/layout.tsx, manager/layout.tsx, PlatformShell.tsx, DashboardShell.stories.tsx (+ deleted DashboardShell.tsx) |
| 2 | Checkpoint human-verify (static verification) | — | make typecheck + make lint passed; browser unavailable due to Supabase key issue |
| 3 | Wire ErrorState to error.tsx files + InviteStateRow to users page | c0759f1 | board/error.tsx, driver/error.tsx, manager/error.tsx, board/settings/users/page.tsx |

## Decisions Made

1. **React node icons in NAV arrays:** LeftRailShell.NavItemConfig requires `icon: React.ReactNode`. All layouts now pass `<LayoutDashboard size={20} />` etc. instead of string names. This removes the NAV_ICONS map entirely from layouts.

2. **PlatformShell simplified:** Removed `'use client'`, `useRouter`, `usePathname`, the topbar div, and horizontal nav tabs. LeftRailShell provides collapsible left rail + ContentUtilityBar. Single "Tenants" nav item uses `Building2` icon.

3. **ActiveTenantIndicator in alertBell slot:** ContentUtilityBar renders `children` (alertBell prop from LeftRailShell) on the right side. ActiveTenantIndicator appears there alongside the LIVE chip.

4. **DashboardShell.stories.tsx title changed, file kept at same path:** File rename risks Storybook autodocs index issues. Meta title changed to `Compositions/LeftRailShell`; mock sidebar uses light rail background matching actual LeftRailShell.

5. **No raw error.message in ErrorState:** Per T-05-03 threat disposition, all three error boundaries use `<ErrorState onRetry={reset} />` without passing `error.message`. ErrorState renders fixed generic copy internally.

6. **Module-level mock constant for InviteStateRow:** Using `Date.now()` inside an async RSC function body triggered `react-hooks/purity` ESLint error. Fixed by extracting mock data to a module-level `MOCK_INVITES` constant with hardcoded absolute dates.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved mock date data to module-level constant to fix react-hooks/purity lint error**
- **Found during:** Task 3 verification (`make lint`)
- **Issue:** `Date.now()` inside the RSC function body triggered `react-hooks/purity` ESLint rule ("Cannot call impure function during render")
- **Fix:** Extracted `MOCK_INVITES` to a module-level constant using hardcoded absolute `Date` literals instead of `Date.now()` + relative offsets
- **Files modified:** `app/(dashboard)/board/settings/users/page.tsx`
- **Commit:** `c0759f1`

**2. [Rule 2 - Security] No error.message passed to ErrorState (T-05-03)**
- **Found during:** Task 3 implementation — original `board/error.tsx` rendered raw `{error.message}` to users
- **Fix:** Used `ErrorState` which shows only generic copy; no message prop passed in any of the three error boundaries
- **Files modified:** `app/(dashboard)/board/error.tsx`, `app/(dashboard)/driver/error.tsx`, `app/(dashboard)/manager/error.tsx`
- **Commit:** `c0759f1`

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `app/(dashboard)/board/settings/users/page.tsx` | `MOCK_INVITES` static constant | No invitations DB table exists yet (D-05 research note). TODO comment added. Future plan will add the table and replace this with a real DB query |

## Threat Flags

None — all T-05-03/T-05-04/T-05-SC mitigations applied or accepted as planned.

## Verification Results

All checks passing at plan completion:
- `make typecheck` — 0 errors
- `make lint` — 0 errors (45 pre-existing warnings, unchanged from baseline)
- `make test` — 403 passed, 4 skipped, 0 failed

## Self-Check: PASSED

**Files modified/deleted:**
- [x] `app/(dashboard)/board/layout.tsx` — confirmed: imports LeftRailShell, React node icons
- [x] `app/(dashboard)/driver/layout.tsx` — confirmed: imports LeftRailShell, React node icons
- [x] `app/(dashboard)/manager/layout.tsx` — confirmed: imports LeftRailShell, React node icons
- [x] `components/layout/PlatformShell.tsx` — confirmed: TenantProvider + LeftRailShell
- [x] `design-system/stories/DashboardShell.stories.tsx` — confirmed: title = Compositions/LeftRailShell
- [x] `components/layout/DashboardShell.tsx` — confirmed DELETED
- [x] `app/(dashboard)/board/error.tsx` — confirmed: renders ErrorState
- [x] `app/(dashboard)/driver/error.tsx` — confirmed: renders ErrorState
- [x] `app/(dashboard)/manager/error.tsx` — confirmed: renders ErrorState
- [x] `app/(dashboard)/board/settings/users/page.tsx` — confirmed: renders InviteStateRow with mock data + TODO comment

**Commits:**
- [x] `04aa48a` — feat(05-03): migrate all role layouts from DashboardShell to LeftRailShell
- [x] `c0759f1` — feat(05-03): wire ErrorState into error boundaries + InviteStateRow into board users page
