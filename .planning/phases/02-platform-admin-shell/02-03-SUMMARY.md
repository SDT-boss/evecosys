---
phase: 02-platform-admin-shell
plan: 03
subsystem: frontend
tags: [react, next.js, server-action, cookies, tenant-list, platform-admin, design-tokens, tdd]

# Dependency graph
requires:
  - phase: 02-platform-admin-shell
    plan: 01
    provides: setActiveTenant test contract, TenantList test contract, mapTenantState/statusBadgeVariant utilities
  - phase: 02-platform-admin-shell
    plan: 02
    provides: PlatformShell + ActiveTenantIndicator + extended platform layout with cookie read

provides:
  - "setActiveTenant Server Action — writes platform_active_tenant cookie (session-duration, httpOnly:false) + revalidatePath('/platform','layout')"
  - "TenantList client component — Table with row-click Server Action, EmptyState empty/error guards, data-state selected highlight"
  - "PlatformPage Server Component — fetches non-Decommissioned tenants via RLS-gated createClient(), renders heading + TenantList with activeTenantId"

affects:
  - app/(dashboard)/platform/* (page now renders live tenant list with context-switch wiring)
  - ActiveTenantIndicator in PlatformShell (updated via revalidatePath layout re-render on row click)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Action cookie write + revalidatePath('layout') — drives header update without navigation"
    - "Client component calls Server Action inline (no form) — row onClick/onKeyDown pattern"
    - "Server Component reads cookie for activeTenantId row highlight (Pitfall 5 mitigation)"
    - "Type-narrowing filter: .filter((t): t is NonNull... => t.status !== null)"

key-files:
  created:
    - app/(dashboard)/platform/actions.ts
    - components/platform/TenantList.tsx
  modified:
    - app/(dashboard)/platform/page.tsx (stub replaced with Server Component)

key-decisions:
  - "layout.tsx required no changes for Plan 03 — page.tsx reads the cookie directly for activeTenantId"
  - "Error path wraps TenantList in same outer div to avoid layout shift"

requirements-completed: [PADM-01, PADM-02, PADM-04]

# Metrics
duration: ~15min
completed: 2026-06-20
---

# Phase 02 Plan 03: Platform Admin Shell — Tenant List + Context Switch + Persistence Summary

**setActiveTenant Server Action, TenantList client component, and replaced platform page.tsx completing the PADM vertical slice (list, click-to-switch, persistence)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-20T08:28:00Z
- **Completed:** 2026-06-20T08:43:29Z
- **Tasks:** 3 executed (Task 4 is a human-verify checkpoint — pending)
- **Files modified:** 3

## Accomplishments

- `app/(dashboard)/platform/actions.ts` created: `'use server'` Server Action; `await cookies()` writes `platform_active_tenant` with `path: '/platform', httpOnly: false`, no `maxAge` (D-07 session-duration); `revalidatePath('/platform', 'layout')` with required `'layout'` type (Pitfall 1 mitigation); all 4 Wave 0 RED setActiveTenant contract tests now GREEN
- `components/platform/TenantList.tsx` created: `'use client'`; all design-system imports from `@evecosys/design-system` barrel (Table, TableHeader, TableBody, TableHead, TableRow, TableCell, Badge, EmptyState); error guard (renders EmptyState 'Could not load tenants') before empty guard (renders EmptyState 'No tenants found'); Table rows with `role="button"`, `tabIndex=0`, `aria-label`, `cursor-pointer`, `data-state=selected` when `activeTenantId === tenant.id`; `onClick` and `onKeyDown` (Enter/Space) both call `setActiveTenant(tenant.id)`; all 5 Wave 0 RED TenantList contract tests now GREEN
- `app/(dashboard)/platform/page.tsx` replaced: async Server Component; `createClient()` from `@/lib/supabase/server` (not service-role); reads `platform_active_tenant` cookie for `activeTenantId` row highlight; queries `from('tenants').select('id, name, state').neq('state', 'Decommissioned').order('created_at')`; maps via `mapTenantState`, filters null status, type-narrows; renders page heading 'Tenant List' + sub-heading 'All registered tenants on this platform' + `<TenantList>`; all colors `var(--ds-*)` tokens; `tsc --noEmit` exits 0
- `app/(dashboard)/platform/layout.tsx` **untouched** — no functional changes needed; page reads cookie directly for `activeTenantId` (plan 03 design decision)

## Task Commits

Each task was committed atomically:

1. **Task 1: setActiveTenant Server Action** — `af9191c` (feat)
2. **Task 2: TenantList client component** — `90a21a5` (feat)
3. **Task 3: Replace page.tsx with Server Component** — `bd644a4` (feat)
4. **Task 4: Verify list, click-to-switch, and persistence in browser** — CHECKPOINT: human-verify pending

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified

- `app/(dashboard)/platform/actions.ts` — `'use server'`; exports `setActiveTenant(tenantId: string): Promise<void>`; session cookie + layout revalidation
- `components/platform/TenantList.tsx` — `'use client'`; `TenantRow` + `TenantListProps` interfaces; error/empty guards; Table with clickable rows; `data-state=selected` for row highlight; keyboard accessible
- `app/(dashboard)/platform/page.tsx` — Replaced stub; Server Component; RLS-gated tenant fetch; Decommissioned filter; mapped + type-narrowed tenants; page heading + TenantList render
- `app/(dashboard)/platform/layout.tsx` — NOT modified (Plan 03 design decision: page reads cookie directly)

## Decisions Made

- `layout.tsx` was not modified. The plan noted the layout was in `files_modified` to reserve exclusive ownership and prevent wave conflict. After reviewing it (Plan 02 already reads `platform_active_tenant` for `activeTenantId`), no additional change was needed — `page.tsx` reads the cookie independently for the row highlight, which is the approach documented in 02-PATTERNS.md page.tsx section.

## Deviations from Plan

None — plan executed exactly as written. All test contracts satisfied. No architectural changes, no bugs found during implementation.

## Checkpoint Details — Task 4 (PENDING)

**Type:** checkpoint:human-verify
**Gate:** blocking

**What was built:**
The `/platform` page now lists all non-Decommissioned tenants with status badges. Clicking a row sets it as the active context (cookie), the header ActiveTenantIndicator updates (via layout re-render triggered by `revalidatePath('/platform','layout')`), the row shows a selected-state highlight, and the selection persists across navigations within the session.

**How to verify:**
1. Run `make dev` and log in as the seeded `platform_admin` dev user. Visit `http://localhost:3000/platform`.
2. Expect a `Tenant List` heading and sub-heading `All registered tenants on this platform`, and a table listing every non-Decommissioned tenant with a Status badge (Active=Jade/default, Pending=grey/secondary, Suspended=red/destructive).
3. Click a tenant row. Expect: URL stays `/platform` (no navigation); the header ActiveTenantIndicator updates to that tenant's name in Jade; the clicked row shows a selected-state background.
4. Navigate away within /platform (e.g. click the Tenants tab again or reload) and confirm the indicator still shows the selected tenant — cookie persisted (PADM-04).
5. If no tenants exist, confirm `No tenants found` EmptyState renders.
6. Confirm no console errors.

**Resume signal:** Type "approved" or describe issues.

## Known Stubs

None — all data paths are wired. The TenantList receives live tenant data from the Supabase query. The `activeTenantId` is read from the cookie on every server render.

## Threat Flags

None — all security-relevant surface is covered by the plan's threat register:
- T-2-06: setActiveTenant is `'use server'` only; cookie write restricted to Server Action
- T-2-07: page.tsx uses `createClient()` (RLS-gated); service-role client NOT used — verified by `tsc --noEmit` + grep
- T-2-08: tenantId from row click is a DB-rendered UUID; no free-form input
- T-2-09: layout role guard (Plan 02, T-2-03) still intact — layout.tsx untouched

## Self-Check: PASSED

- `app/(dashboard)/platform/actions.ts`: EXISTS — line 1 is `'use server'`, contains `platform_active_tenant`, `path: '/platform'`, `httpOnly: false`, `revalidatePath('/platform', 'layout')`, no `maxAge`
- `components/platform/TenantList.tsx`: EXISTS — starts with `'use client'`, all imports from `@evecosys/design-system`, contains `setActiveTenant`, `data-state`, `EmptyState` for both guards
- `app/(dashboard)/platform/page.tsx`: EXISTS — contains `from('tenants')`, `neq('state', 'Decommissioned')`, `TenantList`, `Tenant List` heading, `platform_active_tenant` cookie read, no `#[hex]` values, no service-role import
- `app/(dashboard)/platform/layout.tsx`: UNCHANGED — still contains `PlatformShell`, `platform_admin` guard, no `cookieStore.set(`
- Commits: `af9191c` (Task 1), `90a21a5` (Task 2), `bd644a4` (Task 3) — all present in git log
- `npx vitest run setActiveTenant.test.ts`: 4/4 PASS
- `npx vitest run TenantList.test.tsx`: 5/5 PASS
- `npx tsc --noEmit`: exits 0

---
*Phase: 02-platform-admin-shell*
*Completed: 2026-06-20*
