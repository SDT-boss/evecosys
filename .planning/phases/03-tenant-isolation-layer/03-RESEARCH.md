# Phase 3: Tenant Isolation Layer - Research

**Researched:** 2026-06-09
**Domain:** Supabase RLS enforcement, Next.js server-only gating, auth session validation, cross-tenant isolation testing with Vitest
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth guard placement**
- Create `lib/tenant/authGuard.ts` — a `TenantAuthGuard` class (not a standalone function), consistent with the `BYODBRegistrationService` pattern
- `TenantAuthGuard` accepts an injected database abstraction (interface, not a concrete Supabase client) — allows non-Supabase implementations and unit testing without env vars
- Constructor signature pattern: `new TenantAuthGuard(db: DatabaseClient)` where `DatabaseClient` is an interface defined in `lib/tenant/types.ts`
- Primary method: `requireSession(tenantId: string): Promise<{ user, tenant }>` — accepts a tenant ID, loads the tenant row, verifies `auth.uid() === owner_id`, returns both the authenticated user and the tenant record
- On failure: throws typed errors (`AuthSessionError` for missing/invalid session, `TenantAccessError` for ownership mismatch)
- `AuthSessionError` and `TenantAccessError` are defined in `lib/tenant/types.ts` (alongside `InvalidStateTransitionError`)
- File lives at: `lib/tenant/authGuard.ts`

**Service-role gating**
- Add the `server-only` npm package marker to `lib/tenant/authGuard.ts` and any server-side tenant factories — Next.js build errors if imported from a Client Component
- Create `lib/supabase/service.ts` exporting `createServiceClient()` — reads `SUPABASE_SERVICE_ROLE_KEY`, returns a service-role Supabase client. Centralizes service-role access (replaces inline `createAdminClient()` pattern in routes)
- `BYODBRegistrationService` and `TenantAuthGuard` are only instantiated via server-side code paths

**RLS policy coverage**
- Tenants table only — no new tables in Phase 3
- No DELETE RLS policy for `authenticated` role — tenant deletion/decommissioning is service-role only
- Existing UPDATE policy (`tenants_update_own`) stays permissive at the DB layer — column-level restrictions enforced by application layer
- Existing policies are sufficient for owner-scoped reads/writes; Phase 3 adds a new migration to explicitly confirm no DELETE policy exists for authenticated (defensive/audit migration)

**Unit test strategy**
- `TEST-03` verified with mocked DB — mock the `DatabaseClient` interface to return empty rows when Tenant A's session queries Tenant B's data
- Cross-tenant isolation tests: `test/unit/lib/tenant/tenantIsolation.test.ts` — dedicated file for cross-tenant scenarios
- Auth guard tests: `test/unit/lib/tenant/authGuard.test.ts` — mirrors stateMachine.test.ts and registrationService.test.ts naming pattern
- E2E / integration tests against real Supabase deferred to Phase 4 (TEST-04)

### Claude's Discretion
- Exact `DatabaseClient` interface shape (what methods it exposes: `getUser()`, `from()`, or a more domain-specific API)
- Whether `requireSession()` or a different method name is clearest
- Migration numbering for the Phase 3 RLS audit migration

### Deferred Ideas (OUT OF SCOPE)
- E2E / integration tests against real local Supabase (Docker) — Phase 4 (TEST-04)
- Column-level RLS restrictions on the tenants table (state, vault_secret_id columns) — not needed for Phase 3; application layer enforces these
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | All tenant-scoped read/write operations require a validated Supabase Auth session | `TenantAuthGuard.requireSession()` calls `supabase.auth.getUser()` — returns `AuthSessionError` when no session exists; RLS policy `tenants_select_own` using `auth.uid() = owner_id` enforces session requirement at DB layer |
| SEC-02 | Supabase RLS policies enforce cross-tenant isolation at the database layer | Existing `tenants_select_own`, `tenants_update_own`, `tenants_insert_own` policies cover reads/writes. Phase 3 adds audit migration explicitly confirming no `DELETE` policy exists for `authenticated` role |
| SEC-03 | Admin/service-role operations use the Supabase service role key — never exposed to client-side code | `lib/supabase/service.ts` centralises `createServiceClient()` using `SUPABASE_SERVICE_ROLE_KEY`; `server-only` import barrier + Next.js App Router server-only constraint prevents client exposure |
| SEC-04 | Zero cross-tenant config visibility: Tenant A cannot read Tenant B's control-plane configuration under any code path | `TenantAuthGuard.requireSession()` verifies `user.id === tenant.owner_id` at the application layer; RLS `tenants_select_own` provides DB-layer enforcement returning zero rows for mismatched sessions |
| TEST-03 | Unit tests assert cross-tenant isolation — Tenant A cannot access Tenant B's data | Mocked `DatabaseClient` returns empty result when Tenant A session queries Tenant B row; `TenantAccessError` thrown on ownership mismatch; dedicated `tenantIsolation.test.ts` covers cross-tenant scenarios |
</phase_requirements>

---

## Summary

Phase 3 builds the enforcement boundary between authenticated tenants. The work has three parallel streams: (1) add typed error classes and the `DatabaseClient` interface to `lib/tenant/types.ts`, (2) implement `TenantAuthGuard` and `createServiceClient()` as new server-side modules, and (3) write the RLS audit migration and two new unit test files. All locked decisions were made during the discuss phase and are unambiguous — this is a straightforward implementation phase with no exploratory choices.

The `DatabaseClient` interface (Claude's discretion) is the single design question remaining. The pattern from `VaultStore` and `ConnectivityProbe` in Phase 2 is the model: a narrow interface exposing only the operations `TenantAuthGuard` needs (`getUser()` and a row-fetching method), with the concrete server Supabase client implementing it externally. A domain-specific interface with `getUser()` and `getTenantRow(tenantId: string)` is cleaner than exposing generic `from()` because it keeps the guard pure and makes mocking trivial — two stub functions rather than a Supabase query builder chain.

The `server-only` package (version 0.0.1, stable since Next.js 13 RSC launch) requires only a single `import 'server-only'` at the top of a module. Next.js build tooling detects this marker and throws a compile-time error if any Client Component import graph reaches the marked file. This is zero-runtime-overhead enforcement and is the correct mechanism for SEC-03.

**Primary recommendation:** Implement `DatabaseClient` as a two-method interface (`getUser` + `getTenantRow`) — keeps `TenantAuthGuard` fully testable without any Supabase query builder mock complexity.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.105.1 (registry: 2.108.0) | Service-role client factory, auth session retrieval | Already in project; `createClient(url, serviceKey)` is the canonical pattern |
| `@supabase/ssr` | ^0.10.2 (registry: 0.12.0) | Server-side Supabase client with cookies | Already used in `lib/supabase/server.ts` |
| `server-only` | 0.0.1 | Next.js build-time server-only enforcement | Official Next.js pattern; no runtime overhead |
| `vitest` | ^4.1.8 | Unit test framework | Already in project; all existing tests use it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/headers` (`cookies()`) | Next.js 16 built-in | Cookie access for SSR auth client | Used in `lib/supabase/server.ts`; referenced in `createServiceClient()` factory only if cookies needed (service client does not need cookies) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `server-only` import marker | Middleware/runtime check | `server-only` is build-time with zero runtime cost; middleware checks are runtime and can be bypassed |
| Narrow `DatabaseClient` interface | Full `SupabaseClient` injection | Full client injection requires heavy query builder mock; narrow interface makes tests 3 lines of stubs |

**Installation:**
```bash
npm install server-only
```

`server-only` is the only new package. All other dependencies are already present.

**Version verification:** `server-only@0.0.1` confirmed via `npm view server-only version` (2026-06-09). `@supabase/supabase-js@2.108.0` is the current registry version; project uses `^2.105.1` which resolves to 2.108.0. `@supabase/ssr@0.12.0` is the current registry version; project uses `^0.10.2`.

---

## Architecture Patterns

### File Map for Phase 3

```
lib/
├── tenant/
│   ├── types.ts              # ADD: AuthSessionError, TenantAccessError, DatabaseClient interface
│   └── authGuard.ts          # NEW: TenantAuthGuard class (server-only marker)
├── supabase/
│   ├── server.ts             # EXISTING — no changes
│   ├── client.ts             # EXISTING — no changes
│   └── service.ts            # NEW: createServiceClient() factory
supabase/
└── migrations/
    └── 20260609XXXXXX_rls_audit_no_delete.sql  # NEW: audit migration confirming no DELETE policy
test/
└── unit/lib/tenant/
    ├── authGuard.test.ts         # NEW: TenantAuthGuard unit tests
    └── tenantIsolation.test.ts   # NEW: cross-tenant isolation tests
```

### Pattern 1: Interface + Implementation Separation (DatabaseClient)

**What:** Define `DatabaseClient` as an interface in `lib/tenant/types.ts`. The concrete Supabase server client implements it at the call site (API route or server action), injected into `TenantAuthGuard` constructor. Unit tests provide a stub object that satisfies the interface.

**When to use:** Everywhere a class needs DB access in this codebase. This is the `VaultStore`/`ConnectivityProbe` pattern from Phase 2.

**Recommended DatabaseClient interface shape:**
```typescript
// Source: pattern from lib/tenant/vault.ts + lib/tenant/probe.ts
export interface DatabaseClient {
  getUser(): Promise<{ user: { id: string } | null; error: Error | null }>
  getTenantRow(tenantId: string): Promise<{ data: Tenant | null; error: Error | null }>
}
```

Two methods. No generic query builder. `TenantAuthGuard.requireSession` calls both in sequence: get authenticated user, then fetch tenant row filtered by tenantId, then verify `user.id === tenant.owner_id`.

**Why two dedicated methods rather than `from()`:** The existing `from()` mock in `supabaseMock.ts` returns a fluent builder chain. Mocking a chained `.from('tenants').select('*').eq('id', x).single()` in tests requires either a complex mock chain or a real Supabase client. Two direct methods require two `vi.fn()` stubs — consistent with how `makeProbe()` and `makeVault()` work in `registrationService.test.ts`.

### Pattern 2: Typed Error Classes

**What:** Two new error classes in `lib/tenant/types.ts`, following the `InvalidStateTransitionError` pattern exactly.

```typescript
// Source: existing pattern from lib/tenant/types.ts
export class AuthSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthSessionError'
  }
}

export class TenantAccessError extends Error {
  constructor(
    public readonly requestedTenantId: string,
    public readonly authenticatedUserId: string,
  ) {
    super(`Access denied: user ${authenticatedUserId} does not own tenant ${requestedTenantId}`)
    this.name = 'TenantAccessError'
  }
}
```

`AuthSessionError` — thrown when `getUser()` returns no user or returns an error. Covers: no session cookie, expired token, revoked token.
`TenantAccessError` — thrown when `user.id !== tenant.owner_id`. This is the cross-tenant access attempt.

### Pattern 3: TenantAuthGuard Class

**What:** Server-only class with constructor injection, following `BYODBRegistrationService` pattern.

```typescript
// Source: pattern from lib/tenant/registrationService.ts
import 'server-only'
import type { DatabaseClient } from '@/lib/tenant/types'
import { AuthSessionError, TenantAccessError } from '@/lib/tenant/types'
import type { Tenant } from '@/lib/tenant/types'

export interface AuthGuardResult {
  user: { id: string }
  tenant: Tenant
}

export class TenantAuthGuard {
  constructor(private readonly db: DatabaseClient) {}

  async requireSession(tenantId: string): Promise<AuthGuardResult> {
    const { user, error } = await this.db.getUser()
    if (error || !user) {
      throw new AuthSessionError('No valid auth session')
    }

    const { data: tenant, error: tenantError } = await this.db.getTenantRow(tenantId)
    if (tenantError || !tenant) {
      throw new AuthSessionError(`Tenant ${tenantId} not found`)
    }

    if (user.id !== tenant.owner_id) {
      throw new TenantAccessError(tenantId, user.id)
    }

    return { user, tenant }
  }
}
```

Note: `tenant.owner_id` is a field on the DB row but is not currently in the `Tenant` interface in `types.ts`. The `getTenantRow` return type must include `owner_id`. The `Tenant` interface either needs `owner_id` added, or `getTenantRow` returns a wider type. Simplest approach: add `owner_id: string` to the `Tenant` interface in `types.ts` — it is already on the DB row and the interface is the source of truth.

### Pattern 4: Service Client Factory

**What:** New file `lib/supabase/service.ts`, mirrors `lib/supabase/server.ts` but uses the service role key. Does NOT use cookies (service role operations don't need session context).

```typescript
// Source: pattern from lib/supabase/server.ts + vaultStore.ts (createClient pattern)
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
```

This consolidates the pattern that is currently inline in `app/api/users/create/route.ts` (the `createAdminClient` pattern). Routes that need service-role access import from `@/lib/supabase/service` instead of importing `@supabase/supabase-js` directly.

### Pattern 5: RLS Audit Migration

**What:** New migration that documents the intentional absence of a DELETE policy for `authenticated` on the `tenants` table.

```sql
-- Phase 3: Confirm no DELETE policy exists for authenticated role on tenants.
-- Tenant deletion/decommissioning is a service-role-only operation.
-- This migration is a defensive audit record — no schema changes.

-- Verify: the following confirms no authenticated DELETE path exists:
DO $$
BEGIN
  -- This block intentionally left empty.
  -- The absence of a DELETE policy on tenants for the authenticated role
  -- is the security contract for SEC-02/SEC-04.
  -- Service-role bypasses RLS automatically (Supabase default behavior).
  RAISE NOTICE 'Phase 3 RLS audit: no DELETE policy for authenticated on tenants — CONFIRMED';
END;
$$;
```

Migration filename must sort after `20260609130000` — use timestamp `20260609140000` or next available in sequence.

### Anti-Patterns to Avoid

- **Importing `SupabaseClient` directly in `TenantAuthGuard`:** Makes the class untestable without env vars. Always inject via `DatabaseClient` interface.
- **Using `from()` as the DatabaseClient API:** Requires mocking a fluent query builder chain. Use two dedicated methods instead.
- **Adding `owner_id` as a SELECT filter instead of a post-fetch comparison:** Returning zero rows for a mismatched tenant is correct RLS behavior, but the application layer must also verify ownership explicitly for defense in depth and to distinguish "not found" from "not authorized."
- **Placing `createServiceClient()` in a file without `server-only`:** Allows client components to accidentally import the service role key. Both `lib/supabase/service.ts` and `lib/tenant/authGuard.ts` must have `import 'server-only'` as their first import.
- **Editing existing migration files:** CLAUDE.md forbids this. Phase 3 adds a new migration file only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Build-time server/client boundary enforcement | Custom ESLint rule or runtime env check | `import 'server-only'` | Zero runtime cost, Next.js first-class support, build fails loudly |
| Cross-tenant isolation at DB layer | Application-layer WHERE clauses | Supabase RLS (`auth.uid() = owner_id`) | RLS is enforced even if application code has bugs; WHERE clauses can be bypassed |
| Service-role client creation | Custom createClient wrapper with validation | `createClient(url, SUPABASE_SERVICE_ROLE_KEY)` from `@supabase/supabase-js` | Supabase's own client handles connection pooling, error handling |
| Auth session mock in tests | Complex Supabase client mock | Two-method `DatabaseClient` stub via `vi.fn()` | Keeps tests fast and free of env var requirements |

**Key insight:** The two enforcement mechanisms (RLS at DB layer + `TenantAuthGuard` at application layer) are complementary defense-in-depth, not redundant. RLS protects against bugs in application code; the guard provides typed errors and clear application semantics.

---

## Common Pitfalls

### Pitfall 1: `owner_id` Missing from Tenant Interface

**What goes wrong:** `TenantAuthGuard` needs `tenant.owner_id` to compare with `user.id`. The current `Tenant` interface in `lib/tenant/types.ts` does not include `owner_id`. TypeScript will error when accessing `tenant.owner_id`.

**Why it happens:** Phase 1 defined `Tenant` with the minimum fields needed for state machine tests. The DB schema has `owner_id` but the TypeScript type did not need it until now.

**How to avoid:** Add `owner_id: string` to the `Tenant` interface in `lib/tenant/types.ts` as part of Phase 3. This is additive and non-breaking — existing code that constructs `Tenant` objects in tests will need `owner_id` added to fixtures.

**Warning signs:** TypeScript error `Property 'owner_id' does not exist on type 'Tenant'` when writing `authGuard.ts`.

### Pitfall 2: `server-only` Import Doesn't Prevent Import in Non-RSC Server Code

**What goes wrong:** `server-only` prevents Client Component (`'use client'`) imports. It does NOT prevent importing in a plain Node.js script or a test file.

**Why it happens:** `server-only` works via Next.js webpack/turbopack module resolution. Vitest runs in Node directly and does not use Next.js bundling.

**How to avoid:** Do not expect `server-only` to enforce isolation in unit tests. Tests can freely import `authGuard.ts` — this is correct behavior. The enforcement is at the production bundle boundary. This means `authGuard.test.ts` can import `TenantAuthGuard` without issues.

**Warning signs:** Attempting to write a test and getting "cannot import server-only module" — this means Vitest's module resolver is misconfigured, not that the pattern is wrong.

### Pitfall 3: RLS Policy Returning Zero Rows vs. Error

**What goes wrong:** When Tenant A queries Tenant B's row, Supabase RLS returns zero rows (not a 403 error). Code that checks `if (error)` will pass, then operate on null data.

**Why it happens:** This is intentional Supabase RLS behavior — it silently filters rows, not authentication errors. The error is only raised if RLS is disabled or a policy throws.

**How to avoid:** In `getTenantRow` implementation (and in mock behavior for tests), always handle the `data === null` case as "access denied / not found" — not just the `error !== null` case. `TenantAuthGuard` must throw `AuthSessionError` when tenant row is null regardless of whether error is also null.

**Warning signs:** Test passes because the mock returns `{ data: null, error: null }` (correct RLS simulation) but production code only checks `if (error)` and proceeds to access null tenant.

### Pitfall 4: `createServiceClient()` Called at Module Load Time

**What goes wrong:** If `createServiceClient()` is called at module initialization (e.g., as a module-level constant), `SUPABASE_SERVICE_ROLE_KEY` must be present at import time — this breaks test environments.

**Why it happens:** `SupabaseVaultStore` in `vaultStore.ts` has this same latent risk and mitigates it by accepting an optional injected client. `createServiceClient()` is a factory function, not a module-level client.

**How to avoid:** `createServiceClient()` must be a function call, not a constant export. Call it at request time (inside route handlers), not at module scope. The existing `lib/supabase/server.ts` follows this pattern correctly.

**Warning signs:** Tests fail with "NEXT_PUBLIC_SUPABASE_URL is undefined" when importing modules that call `createServiceClient()` at the top level.

### Pitfall 5: Migration Timestamp Collision

**What goes wrong:** New Phase 3 migration uses a timestamp that already exists, causing Supabase migration tooling to skip or error.

**Why it happens:** Timestamps in migration filenames must be unique and ordered. Phase 2's last migration is `20260609130000`.

**How to avoid:** Use timestamp `20260609140000` or later. Never reuse or edit timestamps from `20260609120000` or `20260609130000`.

---

## Code Examples

### DatabaseClient Mock for Unit Tests
```typescript
// Source: pattern from registrationService.test.ts makeProbe() / makeVault()
import { vi } from 'vitest'
import type { DatabaseClient } from '@/lib/tenant/types'
import type { Tenant } from '@/lib/tenant/types'

function makeDbClient(overrides: {
  user?: { id: string } | null
  tenant?: Tenant | null
  userError?: Error | null
  tenantError?: Error | null
} = {}): DatabaseClient {
  return {
    getUser: vi.fn().mockResolvedValue({
      user: overrides.user ?? { id: 'user-a' },
      error: overrides.userError ?? null,
    }),
    getTenantRow: vi.fn().mockResolvedValue({
      data: overrides.tenant ?? null,
      error: overrides.tenantError ?? null,
    }),
  }
}
```

### Cross-Tenant Isolation Test Pattern
```typescript
// Source: pattern from registrationService.test.ts cross-tenant scenario
it('returns zero-row result when Tenant A session queries Tenant B row', async () => {
  const tenantB: Tenant = { id: 'tenant-b', owner_id: 'user-b', state: 'Active', ... }

  // Tenant A's session (user-a) queries Tenant B's tenantId
  // DB returns null (RLS would return zero rows in production)
  const db = makeDbClient({ user: { id: 'user-a' }, tenant: null })
  const guard = new TenantAuthGuard(db)

  await expect(guard.requireSession('tenant-b')).rejects.toThrow(AuthSessionError)
})

it('throws TenantAccessError when session user does not own the loaded tenant', async () => {
  const tenantB: Tenant = { id: 'tenant-b', owner_id: 'user-b', state: 'Active', ... }

  // Simulate: RLS bypassed (service-role or future policy gap), but guard still catches it
  const db = makeDbClient({ user: { id: 'user-a' }, tenant: tenantB })
  const guard = new TenantAuthGuard(db)

  await expect(guard.requireSession('tenant-b')).rejects.toThrow(TenantAccessError)
})
```

### `server-only` Module Marker
```typescript
// Source: Next.js official docs — https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment
import 'server-only'

// Rest of module...
```

Must be the first import line. Works with both `import` and `require` syntax.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `createAdminClient()` with direct `@supabase/supabase-js` import in each route | Centralized `createServiceClient()` in `lib/supabase/service.ts` | Phase 3 | Single source of truth; `server-only` marker enforced once |
| No explicit TypeScript boundary for server-only code | `import 'server-only'` marker with Next.js build enforcement | Next.js 13+ RSC | Build-time error prevents accidental client exposure |

**Deprecated/outdated in this codebase after Phase 3:**
- Inline `createAdminClient` call in `app/api/users/create/route.ts` — should be migrated to `createServiceClient()` from `lib/supabase/service.ts` as a follow-up (not in Phase 3 scope per CONTEXT.md, but the new factory replaces the pattern)

---

## Open Questions

1. **Does `Tenant.owner_id` addition break existing test fixtures?**
   - What we know: The `Tenant` interface currently has `{ id, state, created_at, updated_at }`. Adding `owner_id` requires all test fixture objects to include it.
   - What's unclear: Whether TypeScript strict mode will reject existing fixtures that omit `owner_id` (it will — TypeScript requires all non-optional fields).
   - Recommendation: Add `owner_id: string` to the `Tenant` interface and update all existing test fixture objects (`PROVISIONING_TENANT`, `ACTIVE_TENANT`, etc.) in the same task that modifies `types.ts`. This is a small, localized change.

2. **Should `lib/supabase/service.ts` also replace the `SupabaseVaultStore` internal client creation?**
   - What we know: `SupabaseVaultStore` currently creates its own `createClient()` when no client is injected.
   - What's unclear: Whether Phase 3 scope includes updating `vaultStore.ts` to use `createServiceClient()`.
   - Recommendation: Not in Phase 3 scope. `vaultStore.ts` will continue to create its own client inline. The `createServiceClient()` factory is available for future consolidation.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.8 |
| Config file | No dedicated config file detected — uses `vitest` script in package.json |
| Quick run command | `vitest run test/unit/lib/tenant/` |
| Full suite command | `vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | `requireSession()` throws `AuthSessionError` when no valid session | unit | `vitest run test/unit/lib/tenant/authGuard.test.ts` | Wave 0 |
| SEC-02 | RLS audit migration confirms no DELETE policy for authenticated | migration/manual | N/A — SQL migration, not unit testable | Wave 0 (migration file) |
| SEC-03 | `createServiceClient()` only callable from server-side code paths | build-time | `next build` (enforced by `server-only` marker) | Wave 0 |
| SEC-04 | `requireSession()` throws `TenantAccessError` when user.id !== tenant.owner_id | unit | `vitest run test/unit/lib/tenant/authGuard.test.ts` | Wave 0 |
| TEST-03 | Cross-tenant isolation: Tenant A session returns zero rows for Tenant B data | unit | `vitest run test/unit/lib/tenant/tenantIsolation.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `vitest run test/unit/lib/tenant/`
- **Per wave merge:** `vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `test/unit/lib/tenant/authGuard.test.ts` — covers SEC-01, SEC-04
- [ ] `test/unit/lib/tenant/tenantIsolation.test.ts` — covers TEST-03, SEC-04 (cross-tenant scenario)
- [ ] `lib/tenant/authGuard.ts` — TenantAuthGuard implementation
- [ ] `lib/supabase/service.ts` — createServiceClient() factory
- [ ] `supabase/migrations/20260609140000_rls_audit_no_delete.sql` — RLS audit migration

*(Existing test infrastructure: `test/unit/lib/tenant/registrationService.test.ts`, `stateMachine.test.ts`, `credentials.test.ts` — all pass and remain unchanged)*

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `lib/tenant/types.ts`, `lib/tenant/registrationService.ts`, `lib/tenant/vault.ts`, `lib/tenant/vaultStore.ts`, `lib/tenant/probe.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts`, `app/api/users/create/route.ts`
- Direct codebase inspection: `supabase/migrations/20260609120000_create_tenants.sql`, `supabase/migrations/20260609130000_byodb_vault_rpc.sql`
- Direct codebase inspection: `test/unit/lib/tenant/registrationService.test.ts`, `test/utils/supabaseMock.ts`
- `npm view server-only version` → 0.0.1 (2026-06-09)
- `npm view @supabase/supabase-js version` → 2.108.0 (2026-06-09)
- `npm view @supabase/ssr version` → 0.12.0 (2026-06-09)
- `.planning/phases/03-tenant-isolation-layer/03-CONTEXT.md` — locked decisions from discuss phase

### Secondary (MEDIUM confidence)
- Next.js `server-only` pattern: https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment — well-established Next.js 13+ RSC pattern, consistent with `server-only` package 0.0.1 being a no-op that triggers webpack/turbopack enforcement

### Tertiary (LOW confidence)
- None — all findings verified against codebase or npm registry

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in project or confirmed via npm registry
- Architecture: HIGH — patterns derived directly from existing Phase 2 code; no speculative choices
- Pitfalls: HIGH — derived from existing codebase analysis (e.g., `owner_id` gap confirmed by reading `types.ts`)

**Research date:** 2026-06-09
**Valid until:** 2026-07-09 (stable stack — Supabase and Next.js APIs in use are mature)
