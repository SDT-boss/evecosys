# Phase 2: Platform Admin Shell — Discussion Log

**Date:** 2026-06-18
**Areas discussed:** 4 of 4

---

## Area 1: Shell layout & nav

**Question:** Should the platform admin shell reuse `DashboardShell` or get a bespoke layout?

**Options presented:**
- A) Bespoke `PlatformShell` — new component dedicated to `/platform`
- B) Extend `DashboardShell` with an `activeTenant` prop

**User selection:** A — Bespoke PlatformShell

**Notes:** No changes to `DashboardShell`. Platform admin is a sufficiently different context to warrant its own shell component.

---

## Area 2: Tenant name — data gap

**Question:** The `tenants` table has no `name` column. PADM-01 needs name + status. Add a migration or derive from owner's `full_name`?

**Options presented:**
- A) Add `name` column via new migration
- B) Derive from owner's `full_name` in `users`

**User selection:** A — new migration adds `name` column

**Notes:** This column also serves Phase 4's branding settings where board members can update the tenant display name.

---

## Area 3: Active tenant persistence

**Question:** How should the active tenant survive page navigations within `/platform`?

**Options presented:**
- A) Cookie (`platform_active_tenant`) — server-readable, survives hard nav
- B) Zustand / React Context — client-only, resets on hard reload
- C) URL param — bookmarkable but requires carrying it through all navigations

**User selection:** A — cookie

**Notes:** Consistent with Supabase auth session pattern. Cookie is readable server-side so layout components can render the active tenant name without a client round-trip.

---

## Area 4: Tenant row click behavior

**Question:** When a platform admin clicks a tenant row — set active context only, navigate to detail page, or both?

**Options presented:**
- A) Set as active context only — stays on tenant list, updates cookie + header
- B) Navigate to tenant detail page
- C) Both — set active + navigate to detail

**User selection:** A — set active context only

**Notes:** Keeps Phase 2 focused. Phase 3 handles full switch-flow feedback (loading/success/error/blocked states).

---

## Claude's Discretion Items

- Exact wording for "no active tenant" placeholder in the header
- Whether `Decommissioned` tenants appear in the list or are filtered out
- Status badge colour mapping for Active/Pending/Suspended
- Animation or transition on active-tenant indicator update

---

*Discussion completed: 2026-06-18*
