# Phase 2: Platform Admin Shell - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers the `/platform` area as a working shell: platform admins see a list of all registered tenants (name + provisioning status), can click a tenant row to set it as the active context, and see the active tenant name persistently in the platform shell header across navigations within `/platform`.

**In scope:**
- `PlatformShell` — new bespoke layout component (topbar + horizontal nav + active-tenant indicator); does NOT modify `DashboardShell`
- `tenants` DB migration — adds `name TEXT NOT NULL DEFAULT ''` column
- `ActiveTenantIndicator` — header component showing current active tenant name
- Tenant list page at `/platform` — fetches all tenants server-side, displays name + mapped status badge
- Active-tenant cookie (`platform_active_tenant`) — set on row click, read by server components for header
- `/platform/layout.tsx` — passes active tenant from cookie to `PlatformShell`

**Out of scope:**
- Switch-flow feedback (loading/success/error/blocked states) — Phase 3
- Tenant detail page (`/platform/tenants/[id]`) — Phase 3 or later
- Board Settings tabs — Phase 4
- Storybook stories — Phase 5

</domain>

<decisions>
## Implementation Decisions

### Shell Layout (PADM-03)
- **D-01:** Build a **bespoke `PlatformShell`** component — new file, dedicated to `/platform`. Same visual style as `DashboardShell` (topbar + horizontal nav) but purpose-built. `DashboardShell` is not modified.
- **D-02:** The `PlatformShell` topbar includes an **`ActiveTenantIndicator`** slot showing the active tenant name. When no tenant is active yet, shows a neutral placeholder.

### Tenant Name — DB Migration (PADM-01)
- **D-03:** Add a `name TEXT NOT NULL DEFAULT ''` column to `public.tenants` via a new migration. This is the canonical display name and will be editable by board members in Phase 4's branding settings.
- **D-04:** Tenant list displays each row as: name (from `tenants.name`) + a status badge (mapped from `tenants.state`).

### Status Display Mapping (PADM-01)
- **D-05:** Map `tenants.state` to display label:
  - `'Registered'` → `'Pending'`
  - `'Provisioning'` → `'Pending'`
  - `'Active'` → `'Active'`
  - `'Suspended'` → `'Suspended'`
  - `'Decommissioned'` → Claude's discretion (filter out or show as Suspended)

### Active Tenant Persistence (PADM-02, PADM-04)
- **D-06:** Use a **cookie** (`platform_active_tenant`) to persist the active tenant ID. Set via Server Action on row click. Read by `/platform/layout.tsx` Server Component to pass active tenant name to `PlatformShell`.
- **D-07:** Cookie scope: path `/platform`, session-duration (no `max-age`), `httpOnly: false` so the client can also read it for optimistic UI in Phase 3.

### Tenant Row Click Behavior (PADM-02)
- **D-08:** Clicking a tenant row **sets it as active context only** — updates the cookie and refreshes the header indicator. No navigation to a detail page. Admin stays on the tenant list.
- **D-09:** Row click handled via a Server Action — no full page reload required; header indicator updates without navigating away.

### Claude's Discretion
- Exact wording for the "no active tenant" placeholder in the header
- Whether `Decommissioned` tenants appear in the list or are filtered out
- Visual style of the status badge colour mapping
- Animation or transition on active-tenant indicator update

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Shell Pattern
- `components/layout/DashboardShell.tsx` — canonical shell pattern; `PlatformShell` follows same topbar + horizontal nav structure but is a separate component
- `app/(dashboard)/manager/layout.tsx` — role guard + shell wiring pattern to follow
- `app/(dashboard)/platform/layout.tsx` — existing platform guard; Phase 2 extends it with cookie read + shell wiring

### Database Schema
- `supabase/migrations/20260609120000_create_tenants.sql` — current `tenants` table (no `name` column yet); Phase 2 migration adds it
- `supabase/migrations/20260613120000_platform_admin_role.sql` — `tenants_select_platform_admin` RLS policy; platform admin can SELECT all tenant rows

### Auth & Session
- `lib/supabase/server.ts` — `createClient()` and `createPlatformClient(tenantId)` helpers; tenant list query uses `createClient()` (RLS policy grants access)

### Tenant Domain Types
- `lib/tenant/types.ts` — `TenantState` type and `TENANT_STATES` array; status display mapping (D-05) must stay in sync with these values
- `types/index.ts` — `AppUser` interface; `PlatformShell` receives `user: AppUser`

### Phase 1 Context
- `.planning/phases/01-auth-role-foundation/01-CONTEXT.md` — active-tenant session-variable mechanism (`createPlatformClient`) is separate from the cookie and used for RLS-scoped queries in Phase 3+

### Planning Artifacts
- `.planning/REQUIREMENTS.md` — PADM-01 through PADM-04 definitions
- `.planning/ROADMAP.md` — Phase 2 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/layout/DashboardShell.tsx` — copy topbar + nav structure as starting point for `PlatformShell`
- `design-system/components/Table` — use for the tenant list
- `design-system/components/Badge` — use for Active/Pending/Suspended status chips
- `design-system/components/Skeleton` — use for tenant list loading state

### Established Patterns
- **Server Component data fetch:** layout fetches data, passes as props to client shell — replicate for tenant list (server component fetches tenants, renders client `TenantList`)
- **Role guard:** already in place in `platform/layout.tsx`; Phase 2 extends this layout
- **CSS tokens:** `var(--ds-*)` for all colours and spacing — no hardcoded hex values
- **Migration files:** `YYYYMMDDHHMMSS_<slug>.sql` naming; never edit existing files

### Integration Points
- `/platform/layout.tsx` — reads cookie → fetches active tenant name → passes to `PlatformShell`
- `createPlatformClient(tenantId)` (Phase 1) used in Phase 3 for RLS-scoped queries; Phase 2 only needs plain `createClient()` to list tenants
- `tenants.name` column added here is the same field Phase 4 board settings will allow editing

</code_context>

<specifics>
## Specific Ideas

- `PlatformShell` lives at `components/layout/PlatformShell.tsx` — sibling to `DashboardShell.tsx`
- `ActiveTenantIndicator` can live inline in `PlatformShell` or as `components/platform/ActiveTenantIndicator.tsx` if it needs Phase 5 stories
- Cookie name: `platform_active_tenant` (stores tenant UUID as string)
- Tenant list page is a Server Component at `app/(dashboard)/platform/page.tsx` — replaces current stub

</specifics>

<deferred>
## Deferred Ideas

- Tenant detail page (`/platform/tenants/[id]`) — Phase 3 or later
- Switch-flow feedback (loading spinner, success/error states) — Phase 3 (SWIT-01 through SWIT-04)
- RLS policies on data tables scoped by active tenant — Phase 3
- `tenants.name` editing UI — Phase 4 (BSET-01 branding settings)

</deferred>

---

*Phase: 2-Platform Admin Shell*
*Context gathered: 2026-06-18*
