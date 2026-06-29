# Phase 1: Auth & Role Foundation - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the `platform_admin` role as a first-class citizen in the database (enum, RLS mechanism, seed), TypeScript types, a server-side active-tenant scoping helper, and route guards for `/platform` and `/board/settings`. No UI beyond stub pages. This phase is pure infrastructure — all subsequent phases depend on it landing cleanly.

**In scope:**
- `platform_admin` added to `users.role` CHECK constraint (new migration)
- `UserRole` type updated in `types/index.ts`
- `handle_new_user()` trigger updated to accept `platform_admin` metadata role
- `app.active_tenant_id` session-variable mechanism: migration defines a DB helper; `lib/supabase/server.ts` gains a `createPlatformClient(tenantId)` wrapper that calls `set_config` before returning the client
- SQL seed script for a local `platform_admin` dev user
- `app/(dashboard)/platform/layout.tsx` — role guard (platform_admin only)
- `app/(dashboard)/platform/page.tsx` — stub page (makes AUTH-02 testable)
- `app/(dashboard)/board/settings/layout.tsx` — role guard (board + owns a tenant) with redirect to `/login` on failure
- `app/(dashboard)/board/settings/page.tsx` — stub page (makes AUTH-03 testable)

**Out of scope:**
- RLS policies on data tables (vehicles, drivers, trips, alerts, charging_stations) — deferred to Phase 3 when the active-tenant switcher is wired up
- Platform Admin shell UI — Phase 2
- Tenant switcher states — Phase 3
- Board Settings tabs content — Phase 4

</domain>

<decisions>
## Implementation Decisions

### RLS Tenant-Scoping Mechanism (AUTH-01, AUTH-04)

- **D-01:** Use the **session-variable approach** — `set_config('app.active_tenant_id', <tenant_id>, true)` (transaction-local) called before any platform-admin data query. Security enforced at the database level via RLS policies that check `current_setting('app.active_tenant_id', true)`.
- **D-02:** The `set_config` call lives in a **server-side helper** — a new `createPlatformClient(tenantId: string)` function in `lib/supabase/server.ts`. This wrapper creates the Supabase server client AND issues the `set_config` RPC so callers don't have to remember to do it manually.
- **D-03:** Phase 1 only adds the **mechanism** (migration defines the pattern; helper is wired up). Table-level RLS policies for platform_admin on data tables (vehicles, drivers, etc.) are added in Phase 3 once the active-tenant context switcher is in place.

### Board Member ↔ Tenant Linkage (AUTH-03)

- **D-04:** **One-to-one** model: a board user is always the sole owner of exactly one tenant. The guard looks up `tenants WHERE owner_id = auth.uid()`.
- **D-05:** If a board user has **no corresponding tenant row** (not yet provisioned), the board settings route redirects to `/login` — same behavior as wrong role. Consistent with the existing guard pattern.

### Platform Admin User Creation

- **D-06:** A **SQL seed script** (`supabase/seed.sql` or a seed migration) creates a local `platform_admin` user for dev and testing. Runnable via `make db-reset`. No signup UI required.

### Phase 1 Route Scope

- **D-07:** Phase 1 creates **layout guard + stub page** for both `/platform` and `/board/settings`. This makes AUTH-02 and AUTH-03 independently testable — platform_admin can reach `/platform`; board user with a tenant can reach `/board/settings`; all other combinations redirect to `/login`.

### Claude's Discretion

- Exact wording of the stub page content (e.g., "Platform Admin — coming in Phase 2")
- Whether `createPlatformClient` issues `set_config` via a raw SQL RPC or a named Supabase function
- Migration naming/numbering following the existing `YYYYMMDDHHMMSS_*.sql` convention

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Auth Pattern
- `app/(dashboard)/manager/layout.tsx` — canonical role guard implementation; platform layout MUST follow this pattern exactly
- `app/(dashboard)/board/layout.tsx` — board guard pattern; board/settings guard extends this with tenant ownership check

### Database Schema
- `supabase/migrations/20240101000000_initial_schema.sql` — `users` table definition with `role` CHECK constraint; Phase 1 migration must alter this constraint
- `supabase/migrations/20260609120000_create_tenants.sql` — `tenants` table with `owner_id`; board-settings guard queries this table

### Types
- `types/index.ts` — `UserRole` type and `AppUser` interface; must be updated to include `'platform_admin'`

### Supabase Client Helpers
- `lib/supabase/server.ts` — server-side client factory; new `createPlatformClient(tenantId)` added here
- `lib/supabase/service.ts` — service-role client (bypasses RLS); platform admin does NOT use this for scoped queries

### Planning Artifacts
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-04 definitions
- `.planning/ROADMAP.md` — Phase 1 success criteria; all four criteria must be met

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabase/server.ts` — existing `createClient()` factory; `createPlatformClient(tenantId)` is a new sibling export in the same file
- `app/(dashboard)/manager/layout.tsx` and `board/layout.tsx` — copy this pattern verbatim for the platform layout; adjust role check to `'platform_admin'`
- `DashboardShell` component — platform stub page will likely NOT use DashboardShell (Phase 2 builds the platform shell); a minimal HTML stub is fine

### Established Patterns
- **Role guard:** `getUser()` → `profile.role !== '<role>'` → `redirect('/login')` — replicate exactly for platform layout
- **Migration files:** `YYYYMMDDHHMMSS_<slug>.sql`, never edit existing files — Phase 1 adds one migration for the role enum + session-variable helper
- **Seed data:** `supabase/seed.sql` if it exists, otherwise a dedicated seed migration; insert into `auth.users` + `public.users`
- **Auth trigger:** `handle_new_user()` already reads `raw_user_meta_data->>'role'`; adding `platform_admin` to the CHECK constraint automatically makes it valid without changing the trigger body

### Integration Points
- Phase 1 migration's session-variable mechanism is consumed by Phase 3's tenant switcher (`createPlatformClient(tenantId)` will be called after the user selects a tenant)
- `/platform/layout.tsx` guard is the entry point for Phase 2's Platform Admin Shell
- `/board/settings/layout.tsx` guard is the entry point for Phase 4's Board Tenant Settings tabs

</code_context>

<specifics>
## Specific Ideas

- `createPlatformClient(tenantId: string)` — new named export from `lib/supabase/server.ts` alongside the existing `createClient`. Calls `set_config` so callers in Phase 3+ get a correctly-scoped client without manual setup.
- The session variable should be **transaction-local** (`set_config('app.active_tenant_id', id, true)` — the third arg `true` makes it transaction-scoped, not session-scoped, which is safer in a serverless/stateless request model).

</specifics>

<deferred>
## Deferred Ideas

- RLS policies for platform_admin on data tables (vehicles, drivers, trips, alerts, charging_stations) — Phase 3, when the active-context switcher is implemented
- Visual platform admin shell beyond the stub — Phase 2
- Board settings UI — Phase 4

</deferred>

---

*Phase: 1-Auth & Role Foundation*
*Context gathered: 2026-06-13*
