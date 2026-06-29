---
phase: 02-platform-admin-shell
plan: 02
subsystem: frontend
tags: [react, next.js, layout, cookies, platform-admin, design-tokens, tdd]

# Dependency graph
requires:
  - phase: 02-platform-admin-shell
    plan: 01
    provides: Wave 0 RED test contracts (ActiveTenantIndicator.test.tsx), Tenant type with name field, tenantStatus utility
  - phase: 01-auth-role-foundation
    provides: platform_admin role guard in platform layout, AppUser type with platform_admin role
provides:
  - "ActiveTenantIndicator component — header slot showing active tenant name or 'No workspace selected' placeholder"
  - "PlatformShell bespoke layout component — 62px topbar + horizontal Tenants nav + indicator slot"
  - "Extended platform/layout.tsx — cookie read + tenant name fetch + PlatformShell wiring"
affects:
  - app/(dashboard)/platform/* (all routes now rendered inside PlatformShell chrome)
  - 02-03 (Plan 03 Server Action + TenantList wiring completes the active-tenant switch flow)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component reads cookie → passes prop to client shell (canonical App Router split)"
    - "Pure display component pattern: no hooks, no 'use client', renders inside client tree"
    - "Bespoke shell: single hardcoded nav tab array (no navItems prop) — Phase 2 scope"
    - "await cookies() in Server Component layout (not cookieStore.set — reserved for Server Action)"

key-files:
  created:
    - components/platform/ActiveTenantIndicator.tsx
    - components/layout/PlatformShell.tsx
  modified:
    - app/(dashboard)/platform/layout.tsx

key-decisions:
  - "Building2 icon used instead of BuildingOffice2 — BuildingOffice2 does not exist in installed lucide-react ^1.14.0"
  - "PlatformShell divider uses var(--ds-color-neutral-grey-70) instead of hardcoded #333 — token compliance per CLAUDE.md"
  - "User avatar background uses var(--ds-color-brand-primary) instead of hardcoded #7cc242 — token compliance"

requirements-completed: [PADM-03]

# Metrics
duration: 30min
completed: 2026-06-20
---

# Phase 02 Plan 02: Platform Admin Shell — Shell Components + Layout Wiring Summary

**ActiveTenantIndicator (header slot), PlatformShell (bespoke /platform chrome), and platform layout wired with cookie read and PlatformShell rendering**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-06-20
- **Tasks:** 3 executed (Task 4 is a human-verify checkpoint — pending)
- **Files modified:** 3

## Accomplishments

- `components/platform/ActiveTenantIndicator.tsx` created: Building2 icon (14px) + semibold span; isActive → Jade, placeholder → grey-40; 200ms color transition; all Plan 01 contract tests GREEN
- `components/layout/PlatformShell.tsx` created: `'use client'` bespoke shell with 62px sticky topbar, "Platform Admin" sub-label, `<ActiveTenantIndicator>` in right slot, ThemeToggle, user avatar, logout; single hardcoded "Tenants" tab with bottom-border active style; DashboardShell unchanged (D-01)
- `app/(dashboard)/platform/layout.tsx` extended: `await cookies()` after role guard, reads `platform_active_tenant` cookie, queries `tenants.name` if tenantId present, returns `<PlatformShell user={profile as AppUser} activeTenantName={activeTenantName}>{children}</PlatformShell>`

## Task Commits

Each task was committed atomically:

1. **Task 1: ActiveTenantIndicator component** — `4a23c8a` (feat)
2. **Task 2: PlatformShell bespoke layout component** — `4e205b6` (feat)
3. **Task 3: Wire PlatformShell + cookie read into platform layout** — `3feb97a` (feat)
4. **Task 4: Verify shell + header indicator in browser** — CHECKPOINT: human-verify pending

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified

- `components/platform/ActiveTenantIndicator.tsx` — Pure display component; Building2 icon + text span; isActive state on `Boolean(name)`; all colors via `var(--ds-*)` tokens; 3/3 Plan 01 contract tests pass
- `components/layout/PlatformShell.tsx` — `'use client'` shell; `PlatformShellProps { children, user: AppUser, activeTenantName: string | null }`; topbar + horizontal nav + content wrapper; no hardcoded hex; DashboardShell.tsx NOT modified
- `app/(dashboard)/platform/layout.tsx` — Server Component (no 'use client'); role guard preserved and runs first; `await cookies()` → reads `platform_active_tenant` → conditionally fetches `tenants.name`; returns `<PlatformShell>`; no `cookieStore.set()`

## Decisions Made

- `Building2` icon used (not `BuildingOffice2`): `BuildingOffice2` does not exist in the installed `lucide-react ^1.14.0` — verified at runtime before implementation. The 02-RESEARCH.md already flagged this as [ASSUMED] and recommended `Building2` as the fallback. This matches the 02-PATTERNS.md reference implementation exactly.
- Topbar divider uses `var(--ds-color-neutral-grey-70)` instead of the hardcoded `#333` present in `DashboardShell.tsx` — applying CLAUDE.md token compliance rule to the new bespoke file.
- User avatar background uses `var(--ds-color-brand-primary)` instead of hardcoded `#7cc242` — same token compliance reasoning.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Token Compliance] Replaced hardcoded hex values present in DashboardShell analog with var(--ds-*) tokens**
- **Found during:** Task 2 (PlatformShell build)
- **Issue:** The DashboardShell pattern includes several hardcoded hex values (`#333`, `#7cc242`, `#777`, `#888`, `#ccc`, `#666`) which CLAUDE.md forbids in new files
- **Fix:** Applied `var(--ds-color-neutral-grey-70)` for divider/border, `var(--ds-color-brand-primary)` for active/brand surfaces, `var(--ds-color-neutral-grey-40)` for muted text, `var(--ds-color-neutral-grey-60)` for secondary text, `var(--ds-color-neutral-grey-20)` for primary label text
- **Files modified:** `components/layout/PlatformShell.tsx` only
- **Commit:** `4e205b6` (same Task 2 commit — inline fix)

### Wave 0 RED Tests (Expected — Not Deviations)

Two Wave 0 RED test files (`TenantList.test.tsx`, `setActiveTenant.test.ts`) reference Plan 03 modules (`@/app/(dashboard)/platform/actions`, `@/components/platform/TenantList`) that do not yet exist. These are correctly RED per the Wave 0 scaffolding design from Plan 01. They will turn GREEN in Plan 03.

## Checkpoint Details — Task 4 (PENDING)

**Type:** checkpoint:human-verify
**Gate:** blocking

**What was built:**
- `/platform` route now renders `PlatformShell` with: EVEcosys Logo + "Platform Admin" sub-label in topbar; `ActiveTenantIndicator` in topbar right slot; single "Tenants" nav tab (Jade bottom-border when active); content area; logout button
- When no `platform_active_tenant` cookie is set: indicator shows "No workspace selected" in `var(--ds-color-neutral-grey-40)`
- When a valid tenant UUID cookie is set: layout reads it, fetches `tenants.name`, passes it to `PlatformShell` → indicator shows tenant name in `var(--ds-color-brand-primary)` (Jade)

**How to verify:**
1. Run `make dev` and log in as the seeded `platform_admin` dev user
2. Visit `http://localhost:3000/platform`. Expect: dark topbar with EVEcosys Logo + "Platform Admin" sub-label; horizontal nav with active "Tenants" tab (Jade bottom-border); the header indicator reads "No workspace selected" in grey
3. In browser devtools, set cookie `platform_active_tenant` = a real tenant UUID (from local `tenants` table) with path `/platform`, then reload. Expect: indicator now shows tenant name in Jade
4. Confirm no console errors; all colors match dark chrome (no off-token colors)

**Resume signal:** Type "approved" or describe issues.

## Known Stubs

None — no hardcoded empty values, placeholder text, or un-wired data flows in the components created. The "No workspace selected" placeholder is intentional UI copy (not a stub), defined in the UI-SPEC contract.

## Threat Flags

None — all new surface is covered by existing threat mitigations documented in the PLAN:
- T-2-03 (role guard) — preserved and runs before cookie read
- T-2-04 (cookie spoofing) — cookie value is UUID only; no data access granted by cookie alone
- T-2-05 (tampering via .set()) — layout only calls .get(); absence of .set() verified in acceptance criteria

## Self-Check: PASSED

- `components/platform/ActiveTenantIndicator.tsx`: EXISTS — Building2 icon, isActive flag, var(--ds-*) colors, no hardcoded hex
- `components/layout/PlatformShell.tsx`: EXISTS — starts with 'use client', exports PlatformShell, renders <ActiveTenantIndicator>, has 'Tenants' tab, no hardcoded brand hex
- `app/(dashboard)/platform/layout.tsx`: EXISTS — contains 'platform_active_tenant', contains 'PlatformShell', no 'use client', no 'cookieStore.set('
- Commits: `4a23c8a` (Task 1), `4e205b6` (Task 2), `3feb97a` (Task 3) — all present in git log
- Plan 01 contract test: `test/unit/components/platform/ActiveTenantIndicator.test.tsx` — 3/3 tests PASS
- TypeScript: no errors in Plan 02 files (pre-existing Wave 0 RED test errors for Plan 03 modules excluded)

---
*Phase: 02-platform-admin-shell*
*Completed: 2026-06-20*
