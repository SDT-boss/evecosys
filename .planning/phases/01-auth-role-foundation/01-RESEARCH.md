# Phase 1: Auth & Role Foundation — Research

**Researched:** 2026-06-13
**Domain:** Supabase RLS + Next.js 15 App Router route guards + PostgreSQL role enum migration
**Confidence:** HIGH (all findings drawn directly from reading the live codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01** Use session-variable approach: `set_config('app.active_tenant_id', <tenant_id>, true)` (transaction-local, third arg = true).
- **D-02** The `set_config` call lives in a new server-side helper `createPlatformClient(tenantId: string)` in `lib/supabase/server.ts`. Wrapper creates the Supabase server client AND issues `set_config` so callers never need to remember to do it.
- **D-03** Phase 1 only adds the mechanism. Table-level RLS policies for platform_admin on data tables (vehicles, drivers, etc.) are Phase 3.
- **D-04** One-to-one board ↔ tenant model. Guard queries `tenants WHERE owner_id = auth.uid()`.
- **D-05** Board user with no tenant row → redirect to `/login` (same as wrong role).
- **D-06** SQL seed script (`supabase/seed.sql` — newly created) creates a local `platform_admin` dev user. Runs automatically on `make db-reset`.
- **D-07** Phase 1 creates layout guard + stub page for both `/platform` and `/board/settings`.

### Claude's Discretion
- Exact wording of the stub page content.
- Whether `createPlatformClient` issues `set_config` via raw SQL RPC or a named Supabase function.
- Migration naming/numbering following the existing `YYYYMMDDHHMMSS_*.sql` convention.

### Deferred Ideas (OUT OF SCOPE)
- RLS policies on data tables (vehicles, drivers, trips, alerts, charging_stations) — Phase 3.
- Visual platform admin shell beyond the stub — Phase 2.
- Board settings UI — Phase 4.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | `platform_admin` role exists in DB schema with RLS policies that scope platform-admin queries to the active tenant context | Migration alters `users.role` CHECK constraint; `set_config` mechanism established via `createPlatformClient` |
| AUTH-02 | `/platform` route enforces `platform_admin` role at layout level; non-platform-admins redirected to `/login` | Exact copy of `manager/layout.tsx` guard pattern with `role !== 'platform_admin'` |
| AUTH-03 | Board tenant settings route enforces `board` role scoped to the user's own tenant | Extends `board/layout.tsx` pattern with a secondary `tenants WHERE owner_id = auth.uid()` query |
| AUTH-04 | RLS policies ensure platform admin data queries never surface data from a tenant other than the current active context | `set_config` mechanism in migration + `createPlatformClient` wrapper; `tenants` table already has `owner_id`; platform_admin RLS on `tenants` added in this phase |
</phase_requirements>

---

## Summary

Phase 1 is a pure-infrastructure phase: no new UI beyond two stubs, no new user-facing features. Every deliverable is either a database migration, a TypeScript type change, a server helper, or a route guard. All patterns already exist in the codebase in nearly-final form — the work is precise replication and careful extension, not invention.

The codebase has a completely consistent role guard pattern across `manager/layout.tsx`, `board/layout.tsx`, and `driver/layout.tsx`. All three use the same four-line skeleton: create client, get user, fetch profile, check role, redirect if wrong. The `platform/layout.tsx` guard is a straight copy with `role !== 'platform_admin'` substituted. The `board/settings/layout.tsx` is the same pattern with one extra query to `tenants WHERE owner_id = auth.uid()`.

The `users.role` CHECK constraint currently lists `('manager', 'board', 'driver')`. Adding `platform_admin` requires a single `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` migration, placed as a new file with a timestamp later than `20260609140000`. The trigger `handle_new_user()` already reads `raw_user_meta_data->>'role'` — no trigger body changes needed; the new value is valid as soon as the CHECK constraint accepts it.

No `supabase/seed.sql` exists yet. `make db-reset` runs `supabase db reset`, which automatically applies `seed.sql` if present. Creating that file to insert a local `platform_admin` user into both `auth.users` and `public.users` is the right approach.

**Primary recommendation:** Write one migration (enum extension + `set_config` helper + tenants RLS for platform_admin), update `UserRole` in `types/index.ts`, add `createPlatformClient` to `lib/supabase/server.ts`, create `supabase/seed.sql`, and scaffold the two layout guards with stubs. No external packages required.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Role enforcement for `/platform` | Frontend Server (Next.js layout, server component) | Database (RLS as defense-in-depth) | Route guard runs server-side at layout; RLS prevents direct DB bypass |
| Role enforcement for `/board/settings` | Frontend Server (Next.js layout, server component) | Database (RLS) | Same pattern; tenant ownership check is an additional DB query at layout time |
| `platform_admin` role in DB | Database (PostgreSQL CHECK constraint) | — | Enum is a DB-level contract; TypeScript type mirrors it |
| Active-tenant scoping mechanism | Database (session variable via `set_config`) | API/Backend (server helper that calls `set_config`) | The variable is DB-scoped; the helper is the call site |
| Seed data for local dev | Database (supabase/seed.sql) | — | Supabase CLI loads seed.sql on `db reset` automatically |

---

## Key Findings

### 1. Existing Role Guard Pattern (copy-exact)

All three existing layouts (`manager`, `board`, `driver`) follow an **identical four-step skeleton**. [VERIFIED: read from codebase]

```typescript
// Source: app/(dashboard)/manager/layout.tsx (verbatim)
export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'manager') redirect('/login')

  return (
    <DashboardShell navItems={NAV} user={profile as AppUser} alertBell={<AlertBellWrapper role="manager" />}>
      {children}
    </DashboardShell>
  )
}
```

**For `app/(dashboard)/platform/layout.tsx`:** Replace `'manager'` with `'platform_admin'`. Do NOT use `DashboardShell` — the CONTEXT.md explicitly notes the platform shell is Phase 2; a minimal HTML stub is correct here.

**For `app/(dashboard)/board/settings/layout.tsx`:** Use the same skeleton, but the role check is `profile.role !== 'board'`. After that check passes, add a secondary query:

```typescript
// After profile.role check passes:
const { data: tenant } = await supabase
  .from('tenants')
  .select('id')
  .eq('owner_id', user.id)
  .single()

if (!tenant) redirect('/login')
```

This implements D-04 and D-05 (one-to-one owner model; no tenant row = redirect to /login).

**Imports for all layouts:** [VERIFIED: read from codebase]
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppUser } from '@/types'
```

**No middleware.ts exists** in this project. [VERIFIED: read from filesystem] Role guards live exclusively in layout.tsx files — this is the established project pattern. Do not introduce middleware.

---

### 2. Migration Strategy

**Naming convention:** `YYYYMMDDHHMMSS_<slug>.sql` [VERIFIED: read from filesystem — four existing migrations confirm this]

**Existing migrations (must not be edited):** [VERIFIED: read from filesystem]
- `20240101000000_initial_schema.sql` — users table, RLS, trigger
- `20260609120000_create_tenants.sql` — tenants table
- `20260609130000_byodb_vault_rpc.sql` — Vault RPCs
- `20260609140000_rls_audit_no_delete.sql` — audit assertion

**New Phase 1 migration** must have a timestamp after `20260609140000`. A timestamp of `20260613120000` is appropriate (today's date).

**The `users.role` CHECK constraint** (exact current SQL from initial schema): [VERIFIED: read from codebase]

```sql
role TEXT NOT NULL CHECK (role IN ('manager', 'board', 'driver'))
```

PostgreSQL CHECK constraints on a column cannot be altered in-place with `ADD`; the constraint must be dropped and recreated. The correct ALTER pattern is:

```sql
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check,
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('manager', 'board', 'driver', 'platform_admin'));
```

Note: the constraint name may be auto-generated as `users_role_check` by PostgreSQL (the default for inline CHECK constraints). Verify the exact name using `\d public.users` or query `pg_constraint` if there is any doubt. Using `DROP CONSTRAINT IF EXISTS` is safe regardless.

**`handle_new_user()` trigger:** [VERIFIED: read from codebase] The trigger body already reads `raw_user_meta_data->>'role'` and inserts it directly. The CHECK constraint is the only gate. Once the constraint accepts `'platform_admin'`, the trigger works without changes. No trigger modification needed.

**`tenants` RLS for platform_admin:** The current `tenants` policies only allow owner-scoped access. A platform_admin querying `tenants` (Phase 2) needs a `SELECT` policy. Phase 1 should add this now since AUTH-04 requires that the mechanism is in place: [ASSUMED — policy structure is a Claude discretion item]

```sql
CREATE POLICY tenants_select_platform_admin ON public.tenants
  FOR SELECT USING (get_my_role() = 'platform_admin');
```

This relies on the existing `get_my_role()` function. [VERIFIED: `get_my_role()` exists in initial_schema.sql]

**`get_my_role()` does not yet accept `'platform_admin'`** as a valid return value — but it returns whatever is in `public.users.role`, so no change to the function is needed; it will return the string correctly once the row exists. [VERIFIED: read function body]

**app.active_tenant_id helper function (migration):** The migration should also define a named SQL helper to make the `set_config` call explicit in code reviews. Claude's discretion applies here; a simple wrapper works:

```sql
-- Optional named function so SQL search can find the pattern
CREATE OR REPLACE FUNCTION public.set_active_tenant(tenant_id TEXT)
RETURNS void AS $$
  SELECT set_config('app.active_tenant_id', tenant_id, true);
$$ LANGUAGE SQL SECURITY INVOKER;
```

The transaction-local flag (`true` as the third argument) is mandatory — it ensures the variable resets at transaction end, which is correct behavior in a stateless serverless request model. [VERIFIED: D-01 from CONTEXT.md, confirmed against Supabase `set_config` semantics via training knowledge — ASSUMED for fine-grained serverless edge case details]

**apply method:** `make migrate` (runs `npx supabase db push --local`) or `make db-reset` (full reset + migrations + seed). [VERIFIED: Makefile read]

---

### 3. `set_config` Session Variable Pattern

**The core call:** [ASSUMED — based on PostgreSQL documentation and Supabase patterns, not Context7-verified in this session]

```typescript
// In createPlatformClient:
await supabase.rpc('set_active_tenant', { tenant_id: tenantId })
```

Or as raw SQL via `supabase.rpc` with a direct SQL expression:

```typescript
await supabase.from('_').select(`set_config('app.active_tenant_id', '${tenantId}', true)`)
// UNSAFE — string interpolation. Use the RPC wrapper instead.
```

**Recommended approach (Claude's discretion):** Use `supabase.rpc('set_active_tenant', { tenant_id: tenantId })` calling the SQL function defined in the migration. This keeps the SQL name in one place and avoids string injection risk.

**Serverless gotcha:** In Next.js App Router server components and route handlers, each HTTP request is a new DB connection from the pool. The transaction-local setting (`true`) means the variable is scoped to the transaction, which aligns with the single-request model. There is no risk of "bleeding" across requests when `true` is used. [ASSUMED — training knowledge; not verified against Supabase edge function docs in this session]

**RLS policy that reads the variable:**

```sql
-- Example for Phase 3 when data-table RLS is added:
USING (tenant_id = current_setting('app.active_tenant_id', true)::uuid)
-- The second arg 'true' to current_setting makes it return NULL rather than
-- throwing if the variable is not set — safer in mixed-access scenarios.
```

Phase 1 only defines this mechanism on the `tenants` table itself (via `tenants_select_platform_admin`). The `current_setting` pattern on data tables is Phase 3 work. [VERIFIED: D-03 from CONTEXT.md]

---

### 4. TypeScript Type Updates

**Current `types/index.ts` — exact state:** [VERIFIED: read from codebase]

```typescript
export type UserRole = 'manager' | 'board' | 'driver'

export interface AppUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  force_password_reset_at?: string
  created_at: string
}
```

**Required change:** Add `'platform_admin'` to `UserRole`:

```typescript
export type UserRole = 'manager' | 'board' | 'driver' | 'platform_admin'
```

No other changes to `AppUser` are needed for Phase 1.

**TypeScript ripple effects:** The `layout.tsx` guard casts `profile as AppUser`. Once `UserRole` includes `'platform_admin'`, TypeScript will accept a profile with that role being passed as `AppUser`. Existing layouts that check `profile.role !== 'manager'` etc. are unaffected — the union is additive.

**`get_my_role()` return type:** The function is typed as `RETURNS TEXT` in SQL — no change needed at the DB function level.

---

### 5. Supabase Client Extension

**Current `lib/supabase/server.ts` — exact state:** [VERIFIED: read from codebase]

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**`createPlatformClient` addition** — new named export in the same file:

```typescript
export async function createPlatformClient(tenantId: string) {
  const client = await createClient()
  await client.rpc('set_active_tenant', { tenant_id: tenantId })
  return client
}
```

Key points:
- It calls `createClient()` internally — no duplication of cookie logic.
- The `set_active_tenant` RPC must be defined in the migration first.
- Returns the same `SupabaseClient` type — callers use it identically to `createClient()`.
- Phase 3 callers will import `createPlatformClient` instead of `createClient` whenever they need tenant-scoped queries.
- `lib/supabase/service.ts` is NOT used for platform admin queries — service role bypasses RLS entirely. [VERIFIED: service.ts comment and CONTEXT.md note]

---

### 6. Tenants Table Schema

**Exact schema from `20260609120000_create_tenants.sql`:** [VERIFIED: read from codebase]

```sql
CREATE TABLE public.tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  state       TEXT NOT NULL DEFAULT 'Registered'
              CHECK (state IN ('Registered', 'Provisioning', 'Active', 'Suspended', 'Decommissioned')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`owner_id` exists and references `auth.users(id)`. [VERIFIED]

**Current RLS policies on `tenants`:** [VERIFIED: read from codebase]
- `tenants_select_own` — `USING (auth.uid() = owner_id)` — owner can read their row
- `tenants_update_own` — owner can update their row
- `tenants_insert_own` — owner can insert for themselves
- No DELETE policy (confirmed by `20260609140000_rls_audit_no_delete.sql`)

**Platform admin SELECT policy needed:** The board-settings guard queries `tenants WHERE owner_id = auth.uid()` — this works with the existing `tenants_select_own` policy (the board user IS the owner). No new policy is needed for AUTH-03.

For AUTH-04 (platform admin can query tenants), a new `tenants_select_platform_admin` policy is needed so that Phase 2 platform admin queries work. This belongs in the Phase 1 migration.

**`vault_secret_id` column:** Added by `20260609130000_byodb_vault_rpc.sql`. Not relevant to Phase 1 but planner should be aware it exists.

---

### 7. Seed Strategy

**`supabase/seed.sql` does not exist yet.** [VERIFIED: filesystem check]

**How `make db-reset` works:** Runs `npx supabase db reset`, which applies all migrations in `supabase/migrations/` in timestamp order, then automatically runs `supabase/seed.sql` if present. [VERIFIED: Makefile + Supabase CLI behavior — ASSUMED for exact Supabase CLI seed.sql behavior; this is well-established Supabase CLI documentation]

**Seed script structure** for a local `platform_admin` dev user:

```sql
-- supabase/seed.sql
-- Local dev seed: creates a platform_admin user for testing.
-- Applied automatically by: make db-reset (supabase db reset)
-- DO NOT run against production.

-- 1. Create the auth user (Supabase auth.users)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'platform-admin@evecosys.local',
  crypt('DevPassword123!', gen_salt('bf')),
  NOW(),
  '{"role": "platform_admin", "full_name": "Dev Platform Admin"}'::jsonb,
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 2. The handle_new_user() trigger fires on auth.users INSERT and creates the public.users row.
-- If the trigger is not active in seed context, insert manually:
INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'platform-admin@evecosys.local',
  'Dev Platform Admin',
  'platform_admin'
) ON CONFLICT (id) DO NOTHING;
```

**Note on `crypt()`:** Requires `pgcrypto` extension. The initial schema uses `uuid-ossp` but not `pgcrypto`. The migration should add `CREATE EXTENSION IF NOT EXISTS pgcrypto;` — or the seed can use Supabase's admin API approach by inserting a pre-hashed password constant. An alternative is to use Supabase's local auth admin API in the global-setup script (same approach used for existing E2E users). [ASSUMED — pgcrypto availability depends on Supabase local instance version]

**Simpler alternative (recommended):** Mirror the existing E2E setup pattern — add the platform_admin user to `e2e/helpers/auth.helpers.ts` `TEST_USERS` and `ensureUser` calls in `global-setup.ts`. This avoids seed.sql complexity and keeps user management consistent. However, CONTEXT.md D-06 explicitly specifies a SQL seed script, so follow D-06.

---

### 8. Validation Architecture

**Test framework:** Vitest (unit/integration) + Playwright (E2E) [VERIFIED: CLAUDE.md + vitest.config.ts + e2e/ directory]

**Vitest config:** `vitest.config.ts` — environment `jsdom`, setup `test/setup.ts`, excludes `e2e/`. [VERIFIED: read from codebase]

**E2E pattern:** `e2e/tests/auth-guards/role-isolation.spec.ts` already tests role isolation for existing roles. The Phase 1 E2E tests follow the same pattern. [VERIFIED: read from codebase]

**E2E global-setup:** Creates test users in Supabase and saves auth state to `e2e/.auth/<role>.json`. A `platform_admin` test user needs to be added here. The `TEST_USERS` type `UserSpec` currently hard-codes `role: 'manager' | 'driver' | 'board'`. This type must be widened to include `'platform_admin'`. [VERIFIED: read from auth.helpers.ts]

**Per-requirement test map:**

| Req ID | Behavior | Test Type | File | Notes |
|--------|----------|-----------|------|-------|
| AUTH-01 | `platform_admin` is valid in DB `users.role` | Vitest (DB integration) | `test/integration/` — new file | Query `public.users` where role = 'platform_admin'; assert no error |
| AUTH-02 | `/platform` accessible by platform_admin; redirects others to /login | Playwright E2E | `e2e/tests/auth-guards/role-isolation.spec.ts` — extend | Add `platform_admin` storageState + two route tests |
| AUTH-03 | `/board/settings` accessible by board user with tenant; denies others | Playwright E2E | `e2e/tests/auth-guards/role-isolation.spec.ts` — extend | Board user with tenant can access; manager/driver/platform_admin cannot |
| AUTH-04 | Platform admin query returns no rows from a different tenant | Vitest (unit) | `test/unit/lib/tenant/tenantIsolation.test.ts` — extend OR new file | Mock `createPlatformClient` and assert `set_active_tenant` is called with correct tenantId; unit-test the RLS policy logic separately |

**Memory note on testing philosophy:** Per `MEMORY.md`, Vitest covers DB/RLS/business logic; Playwright covers browser-requiring user journeys. AUTH-02 and AUTH-03 (route redirect behavior) are correctly Playwright. AUTH-01 and AUTH-04 (DB/type correctness) are correctly Vitest.

**Quick run command:** `npx vitest run test/unit/lib/tenant/`
**Full suite command:** `make test`
**E2E command:** `make e2e` (requires running app + local Supabase)

**Wave 0 gaps (test infrastructure not yet created):**
- [ ] `test/unit/lib/platform/` — new directory for AUTH-01/AUTH-04 unit tests
- [ ] `e2e/.auth/platform-admin.json` — storageState for platform_admin E2E user (generated by global-setup)
- [ ] `e2e/helpers/auth.helpers.ts` — extend `TEST_USERS` and `AUTH_STATE_PATH` with `platform_admin` role
- [ ] `e2e/global-setup.ts` — add `ensureTestUser('platform_admin')` call

---

## Risks & Edge Cases

### Risk 1: CHECK constraint name collision
**What goes wrong:** `ALTER TABLE ... DROP CONSTRAINT` fails if the constraint name is not exactly `users_role_check`. PostgreSQL auto-generates constraint names from the column name; the actual name may differ.
**Prevention:** Use `DROP CONSTRAINT IF EXISTS users_role_check` (safe if name is wrong; no-op) AND verify the actual name: `SELECT conname FROM pg_constraint WHERE conrelid = 'public.users'::regclass AND contype = 'c';`. Document both the expected name and the fallback in the migration comment.
**Fallback SQL:**
```sql
DO $$ BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('manager', 'board', 'driver', 'platform_admin'));
```

### Risk 2: `crypt()` / `pgcrypto` unavailable in seed
**What goes wrong:** `supabase/seed.sql` uses `crypt()` but the local Supabase instance does not have `pgcrypto` enabled.
**Prevention:** Add `CREATE EXTENSION IF NOT EXISTS pgcrypto;` at the top of seed.sql, or use a pre-computed bcrypt hash constant for the dev password.
**Alternative:** Use Supabase admin API in `e2e/global-setup.ts` to create the platform_admin user — the same pattern used for all other test users — and skip the seed.sql approach for auth.users. Still create the `public.users` row in seed.sql with a manual INSERT (no password needed).

### Risk 3: `tenants` SELECT policy missing for platform_admin
**What goes wrong:** Phase 2 attempts to list tenants as platform_admin but gets zero rows — the existing `tenants_select_own` policy filters by `owner_id = auth.uid()`, and the platform_admin does not own any tenant.
**Prevention:** Phase 1 migration adds `tenants_select_platform_admin` policy. Do not wait for Phase 2.

### Risk 4: `get_my_role()` caching / STABLE function
**What goes wrong:** `get_my_role()` is marked `STABLE`, meaning PostgreSQL may cache its result within a query. If a RLS policy calls `get_my_role()` multiple times, the cache is fine. But if the `platform_admin` role is not in `public.users` yet (e.g., seed not run), `get_my_role()` returns NULL, and the new `tenants_select_platform_admin` policy silently returns no rows.
**Prevention:** Ensure the seed runs before any manual testing. `make db-reset` always applies seed.sql after migrations.

### Risk 5: Board layout nesting — `/board/settings` guard scope
**What goes wrong:** `app/(dashboard)/board/settings/layout.tsx` will be nested inside `app/(dashboard)/board/layout.tsx`. The parent board layout already checks `profile.role !== 'board'`. The settings layout's tenant check is additive, but the parent guard runs first — a non-board user never reaches the settings guard.
**This is intentional and correct behavior.** The settings layout guard only needs to check the tenant ownership, but for safety it should also re-check the role (the profile is fetched again in the child layout anyway, following the existing pattern).

### Risk 6: Missing `server-only` annotation on `createPlatformClient`
**What goes wrong:** If `createPlatformClient` is imported from a Client Component, it exposes `NEXT_PUBLIC_SUPABASE_ANON_KEY` at runtime (acceptable) but also executes server-side cookie access in a client context (not acceptable).
**Prevention:** The existing `lib/supabase/server.ts` does NOT have `import 'server-only'` — it relies on the `cookies()` call from `next/headers` to throw at runtime if called from a client. This pattern is already established. `createPlatformClient` inherits the same protection. No change needed, but worth noting.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (unit/integration) + Playwright (E2E) |
| Vitest config | `vitest.config.ts` (project root) |
| Playwright config | `playwright.config.ts` (project root) |
| Quick run command | `npx vitest run test/unit/` |
| Full suite command | `make test` (Vitest) and `make e2e` (Playwright) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `platform_admin` valid in `users.role` and TypeScript `UserRole` type | Vitest unit | `npx vitest run test/unit/lib/platform/` | No — Wave 0 |
| AUTH-02 | `/platform` allows platform_admin, redirects others to /login | Playwright E2E | `make e2e --grep "platform"` | No — Wave 0 (extend role-isolation.spec.ts) |
| AUTH-03 | `/board/settings` allows board+tenant owner, denies others | Playwright E2E | `make e2e --grep "board/settings"` | No — Wave 0 (extend role-isolation.spec.ts) |
| AUTH-04 | `createPlatformClient` calls `set_active_tenant` with correct tenantId | Vitest unit | `npx vitest run test/unit/lib/platform/` | No — Wave 0 |

### Wave 0 Gaps
- [ ] `test/unit/lib/platform/createPlatformClient.test.ts` — unit test for AUTH-01 and AUTH-04
- [ ] Extend `e2e/tests/auth-guards/role-isolation.spec.ts` — add `/platform` and `/board/settings` route tests (AUTH-02, AUTH-03)
- [ ] `e2e/helpers/auth.helpers.ts` — add `platform_admin` to `TEST_USERS`, `AUTH_STATE_PATH`, and widen `UserSpec` role type
- [ ] `e2e/global-setup.ts` — add `ensureTestUser('platform_admin')` and storageState generation for platform_admin

---

## Package Legitimacy Audit

**No external packages are installed in this phase.** All dependencies (`@supabase/ssr`, `next`, `typescript`) are already installed. No new `npm install` commands are required.

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Supabase local (Docker) | Migration + seed | Must be running | `make db-start` then `make db-reset` |
| `npx supabase` CLI | Migrations | Installed via `npx` in Makefile | No global install needed |
| `pgcrypto` extension | seed.sql `crypt()` | Likely available | Local Supabase includes common extensions; use `CREATE EXTENSION IF NOT EXISTS pgcrypto` |
| Next.js 16 dev server | Route guard testing | N/A at research time | `make dev` for manual verification; E2E requires running app |

**No blocking missing dependencies.** Phase 1 is pure code + migration work.

---

## Sources

### Primary (HIGH confidence — read directly from codebase)
- `app/(dashboard)/manager/layout.tsx` — canonical role guard pattern, verified verbatim
- `app/(dashboard)/board/layout.tsx` — board guard pattern, verified verbatim
- `app/(dashboard)/driver/layout.tsx` — driver guard, confirms all layouts are identical skeleton
- `supabase/migrations/20240101000000_initial_schema.sql` — exact `users.role` CHECK constraint and `handle_new_user` trigger
- `supabase/migrations/20260609120000_create_tenants.sql` — tenants schema, `owner_id`, RLS policies
- `types/index.ts` — exact `UserRole` and `AppUser` definitions
- `lib/supabase/server.ts` — exact `createClient` implementation
- `lib/supabase/service.ts` — service role client (not used for platform admin)
- `e2e/tests/auth-guards/role-isolation.spec.ts` — existing role isolation E2E tests
- `e2e/helpers/auth.helpers.ts` — E2E user setup pattern
- `e2e/global-setup.ts` — test user provisioning pattern
- `vitest.config.ts` — test environment configuration
- `Makefile` — `db-reset`, `migrate`, `make test` commands

### Tertiary (ASSUMED — training knowledge, not verified from docs in this session)
- Supabase `db reset` auto-runs `seed.sql` — standard Supabase CLI behavior
- `set_config(..., true)` transaction-local semantics in a serverless/pooled connection context
- `pgcrypto` availability in local Supabase

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `supabase db reset` automatically runs `seed.sql` if present | Seed Strategy | seed.sql not applied on db-reset; must run seed manually or via different command |
| A2 | `set_config('app.active_tenant_id', id, true)` with `true` (transaction-local) resets safely at transaction end in a serverless pooled context | set_config Pattern | Variable bleeds across requests if connection is reused without reset; cross-tenant data exposure |
| A3 | `pgcrypto` extension is available in local Supabase for `crypt()` in seed.sql | Seed Strategy | seed.sql fails; need to pre-compute bcrypt hash or use admin API for user creation |
| A4 | `tenants_select_platform_admin` policy using `get_my_role() = 'platform_admin'` is the correct pattern for Phase 1 | Migration Strategy | Platform admin cannot query tenants table in Phase 2 unless policy is correct |
| A5 | PostgreSQL auto-generates constraint name `users_role_check` for the inline CHECK on `users.role` | Migration Strategy | DROP CONSTRAINT fails; migration errors out |

**Recommendation for A2:** If the project ever uses PgBouncer in transaction-mode pooling (as Supabase's connection pooler does), `set_config` with `true` is correctly scoped to the transaction and resets at commit/rollback. This is the safe and standard pattern for Supabase. The risk is LOW.

---

## Open Questions

1. **Stub page content for `/platform`**
   - What we know: CONTEXT.md says "minimal HTML stub is fine"; Claude's discretion
   - Recommendation: Use `<h1>Platform Admin — coming in Phase 2</h1>` as a simple placeholder

2. **`createPlatformClient` RPC vs raw SQL**
   - What we know: CONTEXT.md marks this as Claude's discretion
   - Recommendation: Use a named SQL function `set_active_tenant(tenant_id TEXT)` called via `.rpc()` — cleaner, auditable, avoids string interpolation

3. **Whether to add `platform_admin` to E2E global-setup or only to seed.sql**
   - What we know: D-06 requires SQL seed; E2E tests for AUTH-02/AUTH-03 need a `platform_admin` storageState
   - Recommendation: Both — seed.sql creates the user for `make db-reset` scenarios; global-setup's `ensureUser` creates/syncs it for E2E runs (same pattern as existing roles)
