# Phase 1: Auth & Role Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 1-Auth & Role Foundation
**Areas discussed:** RLS scoping mechanism, Board ↔ tenant linkage, Platform admin user creation, Phase 1 /platform route scope

---

## RLS Scoping Mechanism (AUTH-01, AUTH-04)

### Q1: How should platform_admin data queries be scoped to the active tenant?

| Option | Description | Selected |
|--------|-------------|----------|
| Session variable | `set_config('app.active_tenant_id', ...)` — RLS checks `current_setting(...)`. Security at DB level. Standard Supabase multi-tenant pattern. | ✓ |
| Service client + app-layer filter | Platform admin uses `service.ts` (bypasses RLS); TypeScript filters by active_tenant_id. Simpler migration but security moves to app code. | |

**User's choice:** Session variable (Recommended)

---

### Q2: Where should the `set_config` call live?

| Option | Description | Selected |
|--------|-------------|----------|
| Server action / API route wrapper | `lib/supabase/server.ts` gains `createPlatformClient(tenantId)` that sets the variable automatically. | ✓ |
| Per-query in each layout/page | Each caller manually calls `set_config()` before data queries. Explicit but repetitive. | |

**User's choice:** Server action / API route wrapper (Recommended)

---

### Q3: Should Phase 1 include RLS policies on data tables, or just the mechanism?

| Option | Description | Selected |
|--------|-------------|----------|
| Just the mechanism in Phase 1 | Migration + helper only. Table-level RLS policies come in Phase 3 with the switcher. | ✓ |
| Full RLS on all tables in Phase 1 | Also adds platform_admin policies on vehicles, drivers, trips, alerts, charging_stations. | |

**User's choice:** Just the mechanism in Phase 1 (Recommended)

---

## Board ↔ Tenant Linkage (AUTH-03)

### Q1: One board user per tenant, or multiple?

| Option | Description | Selected |
|--------|-------------|----------|
| One-to-one: board user = tenant owner | Board guard looks up `tenants WHERE owner_id = auth.uid()`. Simple, matches existing schema. | ✓ |
| Many-to-one: multiple board members per tenant | Requires `tenant_id` on users table (new migration). More flexible but adds complexity not needed in v1. | |

**User's choice:** One-to-one: board user = tenant owner (Recommended)

---

### Q2: What happens if board user has no tenant row?

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /login | Same as wrong role. Simple, consistent with existing guard pattern. | ✓ |
| Show 'no tenant' error page | Distinct screen explaining the tenant isn't provisioned. Better UX but new page in Phase 1 scope. | |

**User's choice:** Redirect to /login (Recommended)

---

## Platform Admin User Creation

### Q1: How should a platform_admin user be created for local dev/testing?

| Option | Description | Selected |
|--------|-------------|----------|
| SQL seed script | `supabase/seed.sql` inserts a platform_admin into auth.users + public.users. Runnable via `make db-reset`. No UI needed. | ✓ |
| Supabase Auth metadata on signup | Use existing `handle_new_user()` trigger path: sign up and pass `role: platform_admin` in metadata. Per-tester manual step. | |

**User's choice:** SQL seed script (Recommended)

---

## Phase 1 /platform Route Scope

### Q1: What should Phase 1 create for the /platform route?

| Option | Description | Selected |
|--------|-------------|----------|
| Layout guard + stub page | `platform/layout.tsx` + `platform/page.tsx`. Makes AUTH-02 testable immediately. | ✓ |
| Layout guard only | Only the layout. Route is 404 until Phase 2. Harder to verify AUTH-02. | |

**User's choice:** Layout guard + stub page (Recommended)

---

### Q2: Should Phase 1 also add the board settings route?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — guard + stub page for /board/settings | Same pattern: board role + tenant ownership check. Makes AUTH-03 testable in Phase 1. | ✓ |
| No — defer to Phase 4 when settings UI is built | Phase 1 adds guard infra only; actual route created in Phase 4. | |

**User's choice:** Yes — guard + stub page for /board/settings (Recommended)

---

## Claude's Discretion

- Exact wording of stub page content
- Whether `createPlatformClient` issues `set_config` via raw SQL RPC or a named Supabase function
- Migration file naming following the existing `YYYYMMDDHHMMSS_<slug>.sql` convention
- Whether seed data lives in `supabase/seed.sql` or a dedicated seed migration

## Deferred Ideas

- RLS policies for platform_admin on data tables — Phase 3 (when context switcher is wired up)
- Visual platform admin shell beyond stub — Phase 2
- Board settings UI content — Phase 4
