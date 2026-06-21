---
phase: 05-storybook-coverage
plan: 03
subsystem: shell-migration
tags: [layout, shell, migration, storybook, error-boundary]
dependency_graph:
  requires:
    - 05-01 (LeftRailShell + sub-components)
    - 05-02 (ContentStates + InviteStateRow)
  provides:
    - app/(dashboard)/board/layout.tsx (LeftRailShell-based)
    - app/(dashboard)/driver/layout.tsx (LeftRailShell-based)
    - app/(dashboard)/manager/layout.tsx (LeftRailShell-based)
    - components/layout/PlatformShell.tsx (LeftRailShell + TenantProvider)
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
key_files:
  created: []
  modified:
    - app/(dashboard)/board/layout.tsx
    - app/(dashboard)/driver/layout.tsx
    - app/(dashboard)/manager/layout.tsx
    - components/layout/PlatformShell.tsx
    - design-system/stories/DashboardShell.stories.tsx
  deleted:
    - components/layout/DashboardShell.tsx
decisions:
  - PlatformShell dropped 'use client' directive — no more hooks needed after removing topbar/tab navigation; LeftRailShell handles all client-side interactivity internally
  - Building2 Lucide icon chosen for Platform Admin Tenants nav item — represents organization/workspace context
  - DashboardShell.stories.tsx file kept at same path (not renamed) — file rename would break Storybook autodocs; title changed to Compositions/LeftRailShell inside the file
metrics:
  duration: "8 minutes"
  completed_date: "2026-06-21T14:56:00Z"
  tasks_completed: 1
  files_created: 0
  files_modified: 5
  files_deleted: 1
---

# Phase 05 Plan 03: Layout Migration + Error Wiring Summary

Shell migration from DashboardShell to LeftRailShell for all four layout consumers (board, driver, manager, PlatformShell). DashboardShell.tsx deleted; story updated to Compositions/LeftRailShell. Stopped at checkpoint:human-verify (Task 2) — browser visual verification required before Task 3 (error.tsx + InviteStateRow wiring).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate all role layouts + retire DashboardShell + update story | 04aa48a | board/layout.tsx, driver/layout.tsx, manager/layout.tsx, PlatformShell.tsx, DashboardShell.stories.tsx (+ deleted DashboardShell.tsx) |

## Checkpoint Reached

**Task 2 (checkpoint:human-verify):** Browser visual verification of all role shells required before proceeding to Task 3.

What needs verification:
- /board — light left-rail sidebar visible; Lucide icon nodes rendering; no console errors
- /manager — same layout structure
- /platform — ActiveTenantIndicator visible in ContentUtilityBar; TenantProvider preserved
- `npm run build-storybook` exits 0 (no broken DashboardShell import)

## Task 3 (Pending after checkpoint approval)

Files: `app/(dashboard)/board/error.tsx`, `app/(dashboard)/manager/error.tsx`, `app/(dashboard)/driver/error.tsx`, `app/(dashboard)/board/settings/users/page.tsx`

Actions needed:
- Update all 3 error.tsx files to render `ErrorState` from `@/components/layout/shell/ContentStates`
- Update users page to render `InviteStateRow` with mock data (no DB migration)

## Decisions Made

1. **React node icons in NAV arrays:** LeftRailShell.NavItemConfig requires `icon: React.ReactNode`. All layouts now pass `<LayoutDashboard size={20} />` etc. instead of string names like `'layout-dashboard'`. This removes the NAV_ICONS map entirely.

2. **PlatformShell simplified:** Removed `'use client'`, `useRouter`, `usePathname`, the topbar div, and the horizontal nav tabs. LeftRailShell provides collapsible left rail + ContentUtilityBar. The single "Tenants" nav item uses `Building2` icon.

3. **ActiveTenantIndicator in alertBell slot:** ContentUtilityBar renders `children` (the alertBell prop from LeftRailShell) on the right side. ActiveTenantIndicator appears there alongside the LIVE chip — matching the original PlatformShell placement.

4. **DashboardShell.stories.tsx title changed, file kept at same path:** Renaming the file risks Storybook autodocs index issues. The meta title is changed to `Compositions/LeftRailShell`; the mock sidebar uses light `#eef3f0` rail background matching actual LeftRailShell.

## Deviations from Plan

None for Task 1. Plan executed exactly as specified.

## Known Stubs

Task 3 (not yet executed) will add `InviteStateRow` mock data with a TODO comment for future DB wiring. This is intentional per plan spec.

## Threat Flags

None. Per threat model:
- T-05-03: Not yet applicable — error.tsx files not yet updated (Task 3 pending)
- T-05-04: TenantProvider preserved around LeftRailShell; activeTenantName comes from auth-checked RSC
- T-05-SC: No new packages installed

## Self-Check

**Files modified/deleted:**
- [x] app/(dashboard)/board/layout.tsx — MODIFIED (imports LeftRailShell, React node icons)
- [x] app/(dashboard)/driver/layout.tsx — MODIFIED (imports LeftRailShell, React node icons)
- [x] app/(dashboard)/manager/layout.tsx — MODIFIED (imports LeftRailShell, React node icons)
- [x] components/layout/PlatformShell.tsx — MODIFIED (TenantProvider + LeftRailShell)
- [x] design-system/stories/DashboardShell.stories.tsx — MODIFIED (title = Compositions/LeftRailShell)
- [x] components/layout/DashboardShell.tsx — DELETED

**Commits:**
- [x] 04aa48a — feat(05-03): migrate all role layouts from DashboardShell to LeftRailShell

## Self-Check: PASSED (Task 1 complete; Task 3 pending checkpoint approval)
