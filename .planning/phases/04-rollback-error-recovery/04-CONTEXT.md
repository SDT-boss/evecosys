# Phase 4: Rollback & Error Recovery - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

A provisioning failure at any step triggers automatic rollback to `Registered`, wipes all partial Vault credentials, and the full test suite (unit + Vitest integration against real local Supabase) passes with 100% compliance. Covers: hardening `BYODBRegistrationService` rollback, adding `ProvisioningRollbackError`, Vitest integration tests for the full provisioning flow, and closing any SEC-02/SEC-03/TEST-03 gaps left from Phase 3. No new tables. No Playwright. No frontend.

</domain>

<decisions>
## Implementation Decisions

### Vault failure during rollback
- If `vault.delete` throws during rollback, wrap both errors in a `ProvisioningRollbackError(originalError: Error, rollbackError: Error)` — two public readonly fields
- `ProvisioningRollbackError` defined in `lib/tenant/types.ts` alongside `InvalidStateTransitionError`, `AuthSessionError`, `TenantAccessError` — consistent single-import pattern for domain errors
- Rollback-specific tests live in a new dedicated file: `test/unit/lib/tenant/rollback.test.ts`

### Rolled-back tenant state surface
- `register()` continues to throw on rollback (caller gets an error, not a rolled-back Tenant object) — simple contract: register() either returns an Active result or throws
- Rollback path MUST explicitly call `transitionTenant(tenant, 'Registered')` in memory, even though the result is not returned — makes rollback's intent explicit and testable (tests can assert the state machine was invoked during rollback)
- Caller (API route) re-fetches tenant state if needed after catching the error

### Rollback trigger breadth
- Narrow scope: rollback only triggers when `vault.store` succeeds but a post-store step fails
- Pre-store failures (probe failure, bad credentials, state guard) are clean exits — no partial state to clean up, no `vault.delete` needed
- `vault.store` is atomic (Supabase Vault RPC): either returns a `secretId` or throws with nothing stored — no defensive try/catch for partial writes needed
- `rollback.test.ts` includes explicit tests asserting `vault.delete` is NOT called for pre-store failures (documents the clean-exit invariant)
- The existing `vi.spyOn(stateMachineModule, 'transition')` pattern for forcing post-store failure is kept — just moved from `registrationService.test.ts` to `rollback.test.ts`

### E2E / integration test scope
- TEST-04 = full Vitest unit suite passes AND Vitest integration tests pass against real local Supabase (Docker)
- No Playwright — this phase is service-layer only; browser not required to prove any behavior
- Integration test file: `test/integration/tenant-provisioning.test.ts`
- Vitest integration coverage: full provisioning happy path, rollback on post-store failure, RLS enforcement (cross-tenant isolation), Vault credential lifecycle (store + delete)
- Phase 4 begins with a Phase 3 gap audit: verify SEC-02 (RLS policies), SEC-03 (service-role gating), and TEST-03 (cross-tenant isolation tests) are implemented; close any gaps; update REQUIREMENTS.md to mark them complete

### Testing philosophy (carried forward to all future phases)
- Vitest: all DB contracts, RLS/permissions, business logic, API/server actions, BYODB compatibility, migration correctness
- Playwright: only real user workflows requiring a browser (auth flows, onboarding, critical UI-to-backend journeys)
- Target ratio: 80–90% Vitest, 10–20% Playwright
- Never test RLS policies, SQL functions, triggers, migration correctness, or schema validation in Playwright

### Claude's Discretion
- Exact Vitest integration test setup/teardown strategy (e.g., how to reset tenant state between tests)
- Whether to use a shared `beforeAll` or per-test setup for local Supabase connection
- Exact `ProvisioningRollbackError` message string

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core implementation files to harden
- `lib/tenant/registrationService.ts` — existing rollback implementation (inline try/catch after vault.store); Phase 4 hardens this with ProvisioningRollbackError and transitionTenant() call
- `lib/tenant/types.ts` — domain error classes; ProvisioningRollbackError goes here
- `lib/tenant/stateMachine.ts` — `transitionTenant()` function used in rollback path; `TRANSITIONS` map confirms `Provisioning → Registered` is valid
- `lib/tenant/vault.ts` — `VaultStore` interface and `VaultStorageError`; read before implementing rollback error handling

### Existing tests (migration targets)
- `test/unit/lib/tenant/registrationService.test.ts` — contains existing rollback tests (describe 'rollback on post-store failure'); these move to rollback.test.ts in Phase 4
- `test/unit/lib/tenant/tenantIsolation.test.ts` — Phase 3 cross-tenant isolation tests; verify TEST-03 coverage before marking complete

### Supabase migrations (integration test setup)
- `supabase/migrations/20260609120000_create_tenants.sql` — tenants table + RLS policies
- `supabase/migrations/20260609130000_byodb_vault_rpc.sql` — Vault RPCs (store_byodb_secret, delete_byodb_secret)
- `supabase/migrations/20260609140000_rls_audit_no_delete.sql` — RLS audit: no DELETE for authenticated role

### Phase 3 context (Phase 4 gap audit reference)
- `.planning/phases/03-tenant-isolation-layer/03-CONTEXT.md` — decisions and deferred items; confirms E2E/integration tests were explicitly deferred to Phase 4

### Project-level requirements
- `.planning/REQUIREMENTS.md` — ROLLBACK-01/02/03, TEST-04; also SEC-02/SEC-03/TEST-03 (Phase 3 pending items to audit and close)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BYODBRegistrationService.register()`: The rollback try/catch (lines wrapping `transition()` call) is the exact insertion point for `ProvisioningRollbackError` and `transitionTenant()` call
- `lib/tenant/stateMachine.ts` `transitionTenant()`: pure function returning a new Tenant with updated state — use in rollback path to call `transitionTenant(tenant, 'Registered')`
- `test/unit/lib/tenant/registrationService.test.ts` describe('rollback on post-store failure'): existing test with vi.spyOn pattern — move this block wholesale to `rollback.test.ts`
- `test/utils/supabaseMock.ts`: `makeSupabaseMock()` — reference for integration test setup; may be extended or a new integration-specific helper created

### Established Patterns
- Domain errors in `lib/tenant/types.ts`: `InvalidStateTransitionError`, `AuthSessionError`, `TenantAccessError` all follow `class X extends Error { constructor(public readonly field) {} name = 'X' }` pattern — `ProvisioningRollbackError` follows this exactly
- Per-concern test files: `stateMachine.test.ts`, `credentials.test.ts`, `registrationService.test.ts`, `authGuard.test.ts`, `tenantIsolation.test.ts` — `rollback.test.ts` fits this pattern
- Dependency injection: `BYODBRegistrationService(probe, vault)` — integration tests use real Supabase VaultStore implementation

### Integration Points
- `rollback.test.ts` imports from `lib/tenant/registrationService` (the service under test) and `lib/tenant/types` (ProvisioningRollbackError)
- Integration test (`test/integration/tenant-provisioning.test.ts`) connects to local Supabase via `lib/supabase/service.ts` (`createServiceClient()`) for service-role operations

</code_context>

<specifics>
## Specific Ideas

- Testing philosophy is explicit and strong: Vitest owns all DB/RLS/business logic correctness; Playwright is strictly for browser-requiring user journeys. This applies to all phases going forward.
- "Unit tests only" was initially selected for TEST-04, then revised — Phase 4 includes Vitest integration tests against real local Supabase, not Playwright.

</specifics>

<deferred>
## Deferred Ideas

- Playwright E2E for provisioning UI (when frontend management UI is built — deferred to v2 per REQUIREMENTS.md)
- Automated tenant health checks / connectivity re-validation on schedule — v2 requirement
- Scheduled retry on rollback failure (if ProvisioningRollbackError fires, automatic retry queue) — not in v1 scope

</deferred>

---

*Phase: 04-rollback-error-recovery*
*Context gathered: 2026-06-09*
