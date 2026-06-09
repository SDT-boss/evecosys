# Phase 3: Tenant Isolation Layer - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Every tenant-scoped data operation is gated by a validated auth session and enforced by RLS policies at the database layer, with service-role operations never reachable from client code. Covers: TenantAuthGuard (server-only), RLS policy hardening on the tenants table, a centralized service-role client factory, and unit tests for cross-tenant isolation. No new tables introduced. No frontend. No E2E tests (deferred to Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Auth guard placement
- Create `lib/tenant/authGuard.ts` — a `TenantAuthGuard` class (not a standalone function), consistent with the `BYODBRegistrationService` pattern
- `TenantAuthGuard` accepts an injected database abstraction (interface, not a concrete Supabase client) — allows non-Supabase implementations and unit testing without env vars
- Constructor signature pattern: `new TenantAuthGuard(db: DatabaseClient)` where `DatabaseClient` is an interface defined in `lib/tenant/types.ts`
- Primary method: `requireSession(tenantId: string): Promise<{ user, tenant }>` — accepts a tenant ID, loads the tenant row, verifies `auth.uid() === owner_id`, returns both the authenticated user and the tenant record
- On failure: throws typed errors (`AuthSessionError` for missing/invalid session, `TenantAccessError` for ownership mismatch)
- `AuthSessionError` and `TenantAccessError` are defined in `lib/tenant/types.ts` (alongside `InvalidStateTransitionError`)
- File lives at: `lib/tenant/authGuard.ts`

### Service-role gating
- Add the `server-only` npm package marker to `lib/tenant/authGuard.ts` and any server-side tenant factories — Next.js build errors if imported from a Client Component
- Create `lib/supabase/service.ts` exporting `createServiceClient()` — reads `SUPABASE_SERVICE_ROLE_KEY`, returns a service-role Supabase client. Centralizes service-role access (replaces inline `createAdminClient()` pattern in routes)
- `BYODBRegistrationService` and `TenantAuthGuard` are only instantiated via server-side code paths

### RLS policy coverage
- Tenants table only — no new tables in Phase 3
- No DELETE RLS policy for `authenticated` role — tenant deletion/decommissioning is service-role only (aligns with the Decommissioned state machine transition being an admin operation)
- Existing UPDATE policy (`tenants_update_own`) stays permissive at the DB layer — column-level restrictions (state, vault_secret_id) enforced by the application layer (state machine, BYODBRegistrationService)
- Existing policies are sufficient for owner-scoped reads/writes; Phase 3 adds a new migration to explicitly confirm no DELETE policy exists for authenticated (defensive/audit migration)

### Unit test strategy
- `TEST-03` verified with mocked DB — mock the `DatabaseClient` interface to return empty rows when Tenant A's session queries Tenant B's data (mirrors real Supabase RLS behavior: zero rows, no error)
- Cross-tenant isolation tests: `test/unit/lib/tenant/tenantIsolation.test.ts` — dedicated file for cross-tenant scenarios
- Auth guard tests: `test/unit/lib/tenant/authGuard.test.ts` — mirrors stateMachine.test.ts and registrationService.test.ts naming pattern
- E2E / integration tests against real Supabase deferred to Phase 4 (TEST-04)

### Claude's Discretion
- Exact `DatabaseClient` interface shape (what methods it exposes: `getUser()`, `from()`, or a more domain-specific API)
- Whether `requireSession()` or a different method name is clearest
- Migration numbering for the Phase 3 RLS audit migration

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing migrations (read before writing new ones)
- `supabase/migrations/20260609120000_create_tenants.sql` — tenants table schema, existing RLS policies (select/update/insert own row), owner_id anchor
- `supabase/migrations/20260609130000_byodb_vault_rpc.sql` — Vault RPCs with REVOKE from anon/authenticated; establishes service-role-only pattern

### Existing Supabase client factories
- `lib/supabase/server.ts` — server client (anon key + cookies); `createClient()` pattern to follow for `createServiceClient()`
- `lib/supabase/client.ts` — browser client; shows the anon key pattern

### Existing tenant module (patterns to follow)
- `lib/tenant/types.ts` — where domain types and errors live (add AuthSessionError, TenantAccessError here)
- `lib/tenant/registrationService.ts` — class pattern with injected dependencies to mirror for TenantAuthGuard
- `lib/tenant/vault.ts` and `lib/tenant/vaultStore.ts` — interface + implementation pattern; DatabaseClient interface should follow this

### Existing tests (patterns to follow)
- `test/unit/lib/tenant/registrationService.test.ts` — vi.spyOn pattern for mocking; test file structure to mirror
- `test/utils/supabaseMock.ts` — existing Supabase mock utility; may be extended or the new DatabaseClient mock follows similar shape

### Existing API route with service-role pattern
- `app/api/users/create/route.ts` — inline `createAdminClient()` pattern that `createServiceClient()` will replace/centralize

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabase/server.ts`: `createClient()` — server Supabase client with cookies; TenantAuthGuard will use a `DatabaseClient` abstraction that the server client implements
- `test/utils/supabaseMock.ts`: `makeSupabaseMock()` — existing mock utility; the new `DatabaseClient` mock for auth guard tests should follow this pattern
- `lib/tenant/vaultStore.ts`: `SupabaseVaultStore` — accepts optional injected SupabaseClient; exact pattern to replicate for TenantAuthGuard (injected DB interface)

### Established Patterns
- Dependency injection via constructor: `BYODBRegistrationService(probe, vault)` — TenantAuthGuard follows same pattern
- Interface + implementation separation: `ConnectivityProbe` / `RealConnectivityProbe`, `VaultStore` / `SupabaseVaultStore` — DatabaseClient follows this
- Domain errors in `lib/tenant/types.ts`: `InvalidStateTransitionError` — `AuthSessionError` and `TenantAccessError` go here
- Pure application-layer state enforcement — RLS provides DB-layer backup, state machine enforces business rules above it

### Integration Points
- `TenantAuthGuard` integrates into API routes that handle tenant-scoped operations (currently Phase 2's registration endpoint, any future control-plane routes)
- `createServiceClient()` in `lib/supabase/service.ts` replaces inline `createAdminClient()` calls in `app/api/users/create/route.ts` and future routes
- New RLS audit migration goes in `supabase/migrations/` — must not edit existing migration files

</code_context>

<specifics>
## Specific Ideas

- DatabaseClient is an interface (not a concrete class) — matches the existing VaultStore/ConnectivityProbe pattern from Phase 2
- The `server-only` marker enforces server-side-only at build time — no runtime overhead

</specifics>

<deferred>
## Deferred Ideas

- E2E / integration tests against real local Supabase (Docker) — Phase 4 (TEST-04)
- Column-level RLS restrictions on the tenants table (state, vault_secret_id columns) — not needed for Phase 3; application layer enforces these

</deferred>

---

*Phase: 03-tenant-isolation-layer*
*Context gathered: 2026-06-09*
