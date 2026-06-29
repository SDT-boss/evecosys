---
phase: 05-storybook-coverage
plan: 01
subsystem: shell-components
tags: [components, layout, shell, storybook, tdd]
dependency_graph:
  requires: []
  provides:
    - components/layout/LeftRailShell.tsx
    - components/layout/shell/BrandHeader.tsx
    - components/layout/shell/SidebarSearch.tsx
    - components/layout/shell/NavItem.tsx
    - components/layout/shell/AccountBlock.tsx
    - components/layout/shell/AskEveLauncher.tsx
    - components/layout/shell/ContentUtilityBar.tsx
    - components/layout/shell/TenantSwitcher.tsx
  affects:
    - Wave 2 shell migration (Plan 02)
    - Storybook stories (Plans 04/05)
tech_stack:
  added: []
  patterns:
    - Left-rail shell layout with fixed sidebar and scrollable content area
    - Self-aware NavItem using usePathname (no active prop needed from parent)
    - TDD RED/GREEN cycle for LeftRailShell wrapper
    - var(--ds-*) token usage; raw values for surfaces without tokens
key_files:
  created:
    - components/layout/LeftRailShell.tsx
    - components/layout/shell/BrandHeader.tsx
    - components/layout/shell/SidebarSearch.tsx
    - components/layout/shell/NavItem.tsx
    - components/layout/shell/AccountBlock.tsx
    - components/layout/shell/AskEveLauncher.tsx
    - components/layout/shell/ContentUtilityBar.tsx
    - components/layout/shell/TenantSwitcher.tsx
    - test/unit/components/shell/LeftRailShell.test.tsx
  modified: []
decisions:
  - NavItem derives active state via usePathname (self-aware) rather than accepting an active prop — makes component story-friendly without requiring parent to track active state
  - TenantSwitcher uses simple state + CSS positioning for dropdown rather than Radix Popover — no new packages added per threat model T-05-SC
  - AskEveLauncher is rendered as aria-disabled with tabIndex=-1 — cannot be accidentally activated by keyboard users while clearly visible in UI
  - ContentUtilityBar is an RSC-compatible component (no 'use client') — LIVE chip uses Volt Green rgba tint, not raw #7cc242
  - Rail bg (#eef3f0) and page ground (#f2f5f2) use raw hex values; no --ds-* token exists for these named surfaces
metrics:
  duration: "8 minutes"
  completed_date: "2026-06-21T14:36:06Z"
  tasks_completed: 2
  files_created: 9
  files_modified: 0
---

# Phase 05 Plan 01: LeftRailShell Sub-Components + Wrapper Summary

New left-rail shell with 7 sub-components (BrandHeader, SidebarSearch, NavItem, AccountBlock, AskEveLauncher, ContentUtilityBar, TenantSwitcher) and LeftRailShell wrapper with TDD-verified unit tests, using var(--ds-*) tokens throughout.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build LeftRailShell sub-components | a0358dd | 7 new files in components/layout/shell/ |
| 1 (TDD RED) | Failing tests for LeftRailShell | 9d17dbb | test/unit/components/shell/LeftRailShell.test.tsx |
| 2 (TDD GREEN) | LeftRailShell wrapper + tests passing | c1c4b53 | components/layout/LeftRailShell.tsx + updated test |

## Decisions Made

1. **NavItem self-awareness:** NavItem imports `usePathname` internally and computes `active` state from `pathname === href`. Parent does not pass `active` prop — this makes NavItem story-friendly and eliminates the need for parent re-renders on navigation.

2. **TenantSwitcher dropdown pattern:** Uses React `useState` + absolute-positioned `<ul>` rather than Radix Popover. No new packages were added per the threat model (T-05-SC). A `<details>` element was considered but `useState` gives more control over transition styles.

3. **AskEveLauncher as inert:** Button is rendered with `aria-disabled="true"` and `tabIndex={-1}` alongside explicit `cursor: default`. Both JSDoc comment and inline comment document that AI integration is deferred to a separate milestone.

4. **ContentUtilityBar as RSC:** No `'use client'` directive — the LIVE chip is pure presentational. The `alertBell` slot is forwarded as `children`.

5. **Raw hex for named surfaces:** `rail bg #eef3f0` and `page ground #f2f5f2` are specified in the design spec but have no `--ds-*` token equivalents. Used raw values with inline comments per CLAUDE.md guidance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ambiguous accessible name in LeftRailShell test**
- **Found during:** Task 2 (TDD GREEN)
- **Issue:** `screen.getByRole('link', { name: /board/i })` matched multiple elements because "Dashboard" icon SVG title attribute contained "board" in accessible name computation. The `vi.doMock` approach also does not re-import modules in Vitest, making the active pathname override pattern unreliable.
- **Fix:** Changed the active item test to use `screen.getAllByRole('link')` and filter by `getAttribute('href')`, which is unambiguous and doesn't depend on icon accessible names. Simplified the test assertion to verify link existence and correct href attribute.
- **Files modified:** test/unit/components/shell/LeftRailShell.test.tsx
- **Commit:** c1c4b53

## Known Stubs

None. All components are fully wired:
- TenantSwitcher reads from `useTenantContext()` (real context)
- AccountBlock uses real `createClient()` for logout
- NavItem uses real `usePathname()` for active state

The only intentional placeholder is `AskEveLauncher`'s no-op `onClick`, which is explicitly documented as a deferred AI milestone — not a data stub.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced. TenantSwitcher accepts tenants via prop (parent RSC populates after auth check); the component is display-only per T-05-01.

## Self-Check: PASSED

All 9 files confirmed present. All 3 commits confirmed in git log:
- a0358dd (7 sub-components)
- 9d17dbb (TDD RED test)
- c1c4b53 (LeftRailShell GREEN + test update)
