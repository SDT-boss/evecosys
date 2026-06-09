# Phase 4: Rollback & Error Recovery - Research

**Researched:** 2026-06-09
**Domain:** TypeScript error types, Vitest unit/integration testing, Supabase Vault rollback, test isolation patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Vault failure during rollback:**
- If `vault.delete` throws during rollback, wrap both errors in a `ProvisioningRollbackError(originalError: Error, rollbackError: Error)` — two public readonly fields
- `ProvisioningRollbackError` defined in `lib/tenant/types.ts` alongside `InvalidStateTransitionError`, `AuthSessionError`, `TenantAccessError` — consistent single-import pattern for domain errors
- Rollback-specific tests live in a new dedicated file: `test/unit/lib/tenant/rollback.test.ts`

**Rolled-back tenant state surface:**
- `register()` continues to throw on rollback (caller gets an error, not a rolled-back Tenant object) — simple contract: register() either returns an Active result or throws
- Rollback path MUST explicitly call `transitionTenant(tenant, 'Registered')` in memory, even though the result is not returned — makes rollback's intent explicit and testable
- Caller (API route) re-fetches tenant state if needed after catching the error

**Rollback trigger breadth:**
- Narrow scope: rollback only triggers when `vault.store` succeeds but a post-store step fails
- Pre-store failures (probe failure, bad credentials, state guard) are clean exits — no partial state to clean up, no `vault.delete` needed
- `vault.store` is atomic (Supabase Vault RPC): either returns a `secretId` or throws with nothing stored — no defensive try/catch for partial writes needed
- `rollback.test.ts` includes explicit tests asserting `vault.delete` is NOT called for pre-store failures (documents the clean-exit invariant)
- The existing `vi.spyOn(stateMachineModule, 'transition')` pattern for forcing post-store failure is kept — just moved from `registrationService.test.ts` to `rollback.test.ts`

**E2E / integration test scope:**
- TEST-04 = full Vitest unit suite passes AND Vitest integration tests pass against real local Supabase (Docker)
- No Playwright — this phase is service-layer only; browser not required to prove any behavior
- Integration test file: `test/integration/tenant-provisioning.test.ts`
- Vitest integration coverage: full provisioning happy path, rollback on post-store failure, RLS enforcement (cross-tenant isolation), Vault credential lifecycle (store + delete)
- Phase 4 begins with a Phase 3 gap audit: verify SEC-02, SEC-03, and TEST-03 are implemented; close any gaps; update REQUIREMENTS.md to mark them complete

**Testing philosophy (carried forward to all future phases):**
- Vitest: all DB contracts, RLS/permissions, business logic, API/server actions, BYODB compatibility, migration correctness
- Playwright: only real user workflows requiring a browser (auth flows, onboarding, critical UI-to-backend journeys)
- Target ratio: 80-90% Vitest, 10-20% Playwright
- Never test RLS policies, SQL functions, triggers, migration correctness, or schema validation in Playwright

### Claude's Discretion
- Exact Vitest integration test setup/teardown strategy (e.g., how to reset tenant state between tests)
- Whether to use a shared `beforeAll` or per-test setup for local Supabase connection
- Exact `ProvisioningRollbackError` message string

### Deferred Ideas (OUT OF SCOPE)
- Playwright E2E for provisioning UI (when frontend management UI is built — deferred to v2 per REQUIREMENTS.md)
- Automated tenant health checks / connectivity re-validation on schedule — v2 requirement
- Scheduled retry on rollback failure (if ProvisioningRollbackError fires, automatic retry queue) — not in v1 scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROLLBACK-01 | If any provisioning step fails during the `Provisioning` state, an automatic rollback is triggered | Rollback path already exists in `registrationService.ts` (lines 61-70); Phase 4 hardens it with `ProvisioningRollbackError` and explicit `transitionTenant()` call |
| ROLLBACK-02 | Rollback resets tenant state to `Registered` and wipes all partial provisioning state | `transitionTenant(tenant, 'Registered')` call required in rollback path; `Provisioning → Registered` is a valid transition in `TRANSITIONS` map |
| ROLLBACK-03 | Failed or partial credentials are never persisted in Supabase Vault during a rolled-back provisioning attempt | `vault.delete(stored.secretId)` in the catch block covers this; `ProvisioningRollbackError` wraps dual-failure case; integration test verifies via real Vault RPC |
| TEST-04 | 100% test compliance — test suite passes before PR merge | Currently 293 tests all green; Phase 4 adds rollback unit tests + integration tests; full suite must remain green |
</phase_requirements>

---

## Summary

Phase 4 is a hardening and test-completion phase, not a greenfield feature phase. The core rollback mechanism is already implemented in `BYODBRegistrationService.register()` (the try/catch on lines 61-70 of `registrationService.ts`). Phase 4 has three work streams: (1) harden the rollback error surface by introducing `ProvisioningRollbackError` and an explicit `transitionTenant()` call, (2) migrate and expand rollback tests into a dedicated `rollback.test.ts`, and (3) add Vitest integration tests against real local Supabase for the full provisioning lifecycle.

A Phase 3 gap audit is required first. REQUIREMENTS.md shows SEC-02, SEC-03, and TEST-03 as "Pending", but the Phase 3 VERIFICATION.md (verified 2026-06-09) marks all three as SATISFIED. The audit will confirm the implementations are complete, then mark them complete in REQUIREMENTS.md. The code and tests already exist — this is a bookkeeping step.

The integration test challenge is the primary research area requiring discretion: Vitest runs with `environment: 'jsdom'` globally, but integration tests need Node environment and real Supabase connection. This requires a separate Vitest project configuration or a workspace setup.

**Primary recommendation:** Use Vitest workspaces to split unit tests (jsdom, mocked) and integration tests (node, real Supabase) into separate projects within the same `vitest.config.mts`, invoked with different run commands.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.8 (installed) | Unit + integration test runner | Already used for all 293 existing tests; project standard |
| @supabase/supabase-js | ^2.105.1 (installed) | Supabase client for integration tests | Already used in `SupabaseVaultStore`, `createServiceClient()` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest workspaces | built into vitest 4.x | Separate unit/integration test environments | Required when integration tests need `environment: 'node'` but unit tests use `jsdom` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest workspaces | Separate `vitest.integration.config.mts` file | Separate config is simpler but requires a different npm script to invoke; workspaces allows `vitest run --project integration` from a single config |
| `beforeAll` shared Supabase setup | Per-test `createServiceClient()` | `beforeAll` is more efficient (single connection); per-test is safer for isolation but slower |

**Installation:** No new packages needed. Everything is already installed.

**Version verification:** Vitest 4.1.8 confirmed via `npx vitest --version`. `@supabase/supabase-js` ^2.105.1 confirmed via `package.json`.

---

## Architecture Patterns

### Existing File Structure (as built through Phase 3)
```
lib/tenant/
├── types.ts              # Domain types + error classes (add ProvisioningRollbackError here)
├── stateMachine.ts       # transition() + transitionTenant() — pure, synchronous
├── registrationService.ts # BYODBRegistrationService — harden rollback here
├── vault.ts              # VaultStore interface + VaultStorageError
├── vaultStore.ts         # SupabaseVaultStore — concrete implementation
├── probe.ts              # ConnectivityProbe interface
├── probeDriver.ts        # Concrete probe
├── credentials.ts        # normalizeCredential()
└── authGuard.ts          # TenantAuthGuard (server-only)

test/unit/lib/tenant/
├── stateMachine.test.ts
├── credentials.test.ts
├── registrationService.test.ts  # Phase 4: rollback describe block moves OUT of here
├── authGuard.test.ts
├── tenantIsolation.test.ts
└── rollback.test.ts             # Phase 4: new file — rollback-specific tests

test/integration/
├── auth.integration.test.tsx    # Existing integration test (React/jsdom based)
└── tenant-provisioning.test.ts  # Phase 4: new file — real Supabase integration
```

### Pattern 1: ProvisioningRollbackError — Two-Field Error Class

**What:** A domain error that captures both the original provisioning failure and any secondary vault.delete failure during rollback.

**When to use:** Only in `BYODBRegistrationService.register()` catch block when `vault.delete` throws.

**Example:**
```typescript
// In lib/tenant/types.ts — follows existing pattern exactly
export class ProvisioningRollbackError extends Error {
  constructor(
    public readonly originalError: Error,
    public readonly rollbackError: Error,
  ) {
    super(`Provisioning rollback failed: ${rollbackError.message} (original error: ${originalError.message})`)
    this.name = 'ProvisioningRollbackError'
  }
}
```

This follows the exact pattern of `InvalidStateTransitionError`, `AuthSessionError`, and `TenantAccessError` in `types.ts`: extends Error, typed public readonly fields, sets `this.name`.

### Pattern 2: Hardened Rollback in registrationService.ts

**What:** The existing try/catch on lines 61-70 needs two additions: `transitionTenant()` call (for testability) and a nested try/catch around `vault.delete` to produce `ProvisioningRollbackError`.

**Current implementation (lines 60-70):**
```typescript
// Step 5 — transition with rollback if anything after store fails
try {
  const nextState = transition(tenant.state, 'Active')
  return {
    tenant: { ...tenant, state: nextState, updated_at: new Date().toISOString() },
    secretId: stored.secretId,
  }
} catch (err) {
  await this.vault.delete(stored.secretId)
  throw err
}
```

**Hardened version:**
```typescript
// Step 5 — transition with rollback if anything after store fails
try {
  const nextState = transition(tenant.state, 'Active')
  return {
    tenant: { ...tenant, state: nextState, updated_at: new Date().toISOString() },
    secretId: stored.secretId,
  }
} catch (originalErr) {
  // Rollback: reset state in memory (makes rollback intent explicit and testable)
  transitionTenant(tenant, 'Registered')

  // Clean up vault — wrap dual failure in ProvisioningRollbackError
  try {
    await this.vault.delete(stored.secretId)
  } catch (rollbackErr) {
    throw new ProvisioningRollbackError(
      originalErr instanceof Error ? originalErr : new Error(String(originalErr)),
      rollbackErr instanceof Error ? rollbackErr : new Error(String(rollbackErr)),
    )
  }
  throw originalErr
}
```

Note: `transitionTenant()` is imported from `@/lib/tenant/stateMachine` (already imported as `transition` — add `transitionTenant` to the import). The result of `transitionTenant()` is NOT returned; the call exists solely to make the rollback state change explicit and spy-testable.

### Pattern 3: Vitest Workspace for Integration Tests

**What:** The existing `vitest.config.mts` uses `environment: 'jsdom'` globally. Integration tests against real Supabase must run in `environment: 'node'`. Vitest workspaces solve this.

**When to use:** When a project needs multiple Vitest environments simultaneously.

**How to configure:**
```typescript
// vitest.config.mts — workspace approach
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      'server-only': path.resolve(__dirname, 'test/__mocks__/server-only.ts'),
    },
  },
  test: {
    workspace: [
      {
        // Unit tests — existing behavior preserved
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: './test/setup.ts',
          globals: true,
          include: ['test/unit/**/*.test.{ts,tsx}', 'test/integration/auth.integration.test.tsx'],
          exclude: ['node_modules/**', 'e2e/**'],
        },
      },
      {
        // Integration tests — real Supabase, Node environment
        test: {
          name: 'integration',
          environment: 'node',
          globals: true,
          include: ['test/integration/tenant-provisioning.test.ts'],
          exclude: ['node_modules/**'],
        },
      },
    ],
  },
})
```

Alternative (simpler): keep `vitest.config.mts` unchanged and add a separate `vitest.integration.config.mts` with `environment: 'node'` and `include: ['test/integration/tenant-provisioning.test.ts']`. Invoke via `npx vitest run --config vitest.integration.config.mts`. This avoids touching the working unit test config.

**RECOMMENDATION (Claude's Discretion):** Use a separate integration config file. It is the lower-risk change — the existing unit test config is working for 293 tests and should not be modified. The integration tests are a distinct operational concern (require Docker, real Supabase, env vars) and are invoked separately.

### Pattern 4: Integration Test Setup/Teardown

**What:** Integration tests need a real Supabase connection, isolated test data, and cleanup between tests.

**Recommended approach — `beforeAll` with cleanup in `afterEach`:**
```typescript
// test/integration/tenant-provisioning.test.ts
import { createClient } from '@supabase/supabase-js'
import { SupabaseVaultStore } from '@/lib/tenant/vaultStore'
import { BYODBRegistrationService } from '@/lib/tenant/registrationService'

// Service-role client for test setup/teardown (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

let testTenantId: string

beforeEach(async () => {
  // Insert a Provisioning tenant for each test
  const { data } = await supabase
    .from('tenants')
    .insert({ owner_id: TEST_USER_ID, state: 'Provisioning' })
    .select('id')
    .single()
  testTenantId = data!.id
})

afterEach(async () => {
  // Clean up tenant row and any vault secrets
  await supabase.from('tenants').delete().eq('id', testTenantId)
  // vault cleanup handled by rollback logic under test, or explicit delete if test left one
})
```

Note: `auth.uid()` in RLS policies resolves to the JWT sub claim. Integration tests using the service-role client bypass RLS entirely, which is correct for setup/teardown but means the test must explicitly verify RLS behavior using an anon/authenticated client for the "Tenant A cannot see Tenant B" assertion.

### Anti-Patterns to Avoid

- **Calling `transitionTenant()` and returning its result in the rollback path:** The user decision is explicit — call it for testability, but do NOT return the rolled-back tenant object. The caller should re-fetch state after catching the error.
- **Putting `ProvisioningRollbackError` in its own file:** It belongs in `lib/tenant/types.ts` per the locked decision — single import location for all domain errors.
- **Modifying existing migration files:** Any new DB changes (if needed) go in a new migration file. The RLS audit migration already exists.
- **Using jsdom environment for integration tests:** Real Supabase RPC calls fail in jsdom. Integration tests require `environment: 'node'`.
- **Skipping the Phase 3 gap audit:** REQUIREMENTS.md shows SEC-02, SEC-03, TEST-03 as pending, but the Phase 3 VERIFICATION.md confirms they are satisfied. The audit is a documentation close-out step, not implementation work.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dual-error wrapping | Custom multi-error class | `ProvisioningRollbackError(originalError, rollbackError)` pattern (already decided) | Two-field error class is idiomatic TypeScript; wraps without losing either error's stack trace |
| Integration test Supabase setup | Custom connection pooling | `createClient()` with service-role key, one client per test file | Supabase JS client handles connection management; no pooling needed at test scale |
| Test environment switching | Per-test env detection | Vitest workspace or separate config file | Vitest 4.x built-in workspace support handles environment isolation cleanly |
| Vault secret cleanup | Custom cleanup tracker | `afterEach` delete via service-role client | Direct DB delete is reliable; no need to track secret IDs across tests separately |

**Key insight:** The rollback mechanism's plumbing already exists. This phase is about error wrapping, test coverage, and integration verification — not building new infrastructure.

---

## Common Pitfalls

### Pitfall 1: spyOn Pattern Requires Module-Level Import

**What goes wrong:** `vi.spyOn(stateMachineModule, 'transition')` only works if the spy target is the same module object that `registrationService.ts` uses internally. If Vitest has already resolved the import to a different object reference, the spy has no effect.

**Why it happens:** ESM module caching; spy must intercept the same export binding.

**How to avoid:** The existing test in `registrationService.test.ts` already uses `await import('@/lib/tenant/stateMachine')` for the spy target and calls `spy.mockRestore()` after. Copy this pattern exactly into `rollback.test.ts`.

**Warning signs:** `vault.delete` is not called even though spy appears to throw — spy is on wrong module reference.

### Pitfall 2: Integration Tests Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

**What goes wrong:** Integration tests fail with "supabaseUrl is required" or connection refused.

**Why it happens:** Vitest does not load `.env.local` automatically. The integration test process has no env vars.

**How to avoid:** Use Vitest's `dotenv` option or load env manually. In a separate integration config:
```typescript
// vitest.integration.config.mts
import { defineConfig, loadEnv } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    test: {
      environment: 'node',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      },
      include: ['test/integration/tenant-provisioning.test.ts'],
    },
  }
})
```

**Warning signs:** `process.env.NEXT_PUBLIC_SUPABASE_URL` is `undefined` inside the integration test.

### Pitfall 3: vault_secret_id Column Not Updated in registrationService

**What goes wrong:** Integration test asserts `tenants.vault_secret_id` is set after successful registration, but it's null — because `BYODBRegistrationService.register()` never writes to the DB.

**Why it happens:** `BYODBRegistrationService` is a pure in-memory service. It does not persist the tenant state or `vault_secret_id` to the database — that is the responsibility of the caller (API route). The service returns `{ tenant, secretId }` but does not perform DB writes.

**How to avoid:** Integration tests should test the service's return value (`result.secretId`), not the DB column. If the test needs to verify DB persistence, it must include a DB write step that mirrors what the API route would do. Alternatively, scope the integration test to only what the service layer does: returns the correct secretId and the rolled-back state after failure.

**Warning signs:** Test fails asserting `tenants.vault_secret_id IS NOT NULL` after calling `svc.register()` directly.

### Pitfall 4: RLS Blocks Integration Test Assertions

**What goes wrong:** Integration test uses service-role client for setup but anon client for assertions — anon client returns zero rows for tenants not owned by the test user.

**Why it happens:** RLS `tenants_select_own` requires `auth.uid() = owner_id`. An anon client has no JWT, so `auth.uid()` is null.

**How to avoid:** For setup/teardown, always use the service-role client. For RLS behavior assertions, sign in as the test user and use the resulting session client. For rollback verification (confirming vault secret is gone), use the service-role client to query `vault.secrets` directly.

**Warning signs:** `{ data: null, error: null }` on a select that should return rows.

### Pitfall 5: registrationService.test.ts Rollback Tests Left in Place

**What goes wrong:** After migrating rollback tests to `rollback.test.ts`, the describe block in `registrationService.test.ts` is not removed, causing duplicate test coverage and potential conflicts when the spy is active in both files simultaneously.

**Why it happens:** Test migration is easy to do partially.

**How to avoid:** The `describe('rollback on post-store failure', ...)` block (lines 173-262 of `registrationService.test.ts`) must be deleted entirely when `rollback.test.ts` is created.

---

## Code Examples

### ProvisioningRollbackError (to add to lib/tenant/types.ts)

```typescript
// Follows existing pattern: extends Error, typed readonly fields, sets this.name
export class ProvisioningRollbackError extends Error {
  constructor(
    public readonly originalError: Error,
    public readonly rollbackError: Error,
  ) {
    super(
      `Provisioning rollback failed: ${rollbackError.message} (original error: ${originalError.message})`,
    )
    this.name = 'ProvisioningRollbackError'
  }
}
```

### Import addition in registrationService.ts

```typescript
// Add transitionTenant to the existing stateMachine import
import { transition, transitionTenant } from '@/lib/tenant/stateMachine'
// Add ProvisioningRollbackError to the existing types import
import type { Tenant } from '@/lib/tenant/types'
import { ProvisioningRollbackError } from '@/lib/tenant/types'
```

### rollback.test.ts spy pattern (from existing registrationService.test.ts — verbatim)

```typescript
import * as stateMachineMod from '@/lib/tenant/stateMachine'

// Inside the test:
const spy = vi.spyOn(stateMachineMod, 'transition').mockImplementationOnce(() => {
  throw new InvalidStateTransitionError('Provisioning', 'Active')
})

// ... test assertions ...

spy.mockRestore()
```

### Integration test — RLS cross-tenant assertion using user session

```typescript
// Create a real signed-in Supabase client to test RLS
const { data: signInData } = await supabase.auth.signInWithPassword({
  email: TEST_USER_A_EMAIL,
  password: TEST_USER_A_PASSWORD,
})
const userClient = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${signInData.session!.access_token}` } },
})
// Querying Tenant B's ID returns zero rows (RLS enforced)
const { data } = await userClient.from('tenants').select('*').eq('id', TENANT_B_ID)
expect(data).toHaveLength(0)
```

---

## Phase 3 Gap Audit Findings

**Result: No gaps. SEC-02, SEC-03, TEST-03 are fully implemented.**

| Requirement | Status in REQUIREMENTS.md | Phase 3 VERIFICATION.md | Implementation Exists? |
|-------------|--------------------------|------------------------|----------------------|
| SEC-02 | Pending | SATISFIED | Yes — `20260609140000_rls_audit_no_delete.sql` and existing RLS policies (select/update/insert own) |
| SEC-03 | Pending | SATISFIED | Yes — `lib/supabase/service.ts` with `import 'server-only'` |
| TEST-03 | Pending | SATISFIED | Yes — `test/unit/lib/tenant/tenantIsolation.test.ts` (3 tests, all green) |

**Action required in Phase 4:** Update REQUIREMENTS.md to mark SEC-02, SEC-03, TEST-03 as `[x]` (complete). No code changes needed for these requirements.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Single Vitest config for all tests | Vitest workspaces or separate config for integration | Integration tests can use `node` environment while unit tests keep `jsdom` |
| Inline rollback tests in registrationService.test.ts | Dedicated rollback.test.ts | Clear separation of concerns; rollback invariants documented in one place |
| `throw err` on vault.delete failure hides secondary error | `ProvisioningRollbackError(originalError, rollbackError)` | Both errors preserved for debugging; callers can inspect both |

---

## Open Questions

1. **Integration test user identity**
   - What we know: Integration tests need a real JWT to test RLS behavior with an authenticated client. Local Supabase supports `signInWithPassword`.
   - What's unclear: Whether to create test users via migration seed data or via test setup code (`supabase.auth.admin.createUser`). The service-role client has `auth.admin` access.
   - Recommendation: Use `supabase.auth.admin.createUser()` in `beforeAll` to create ephemeral test users, then delete them in `afterAll`. This avoids seeding user fixtures into migrations.

2. **Integration test run command in CI**
   - What we know: `make test` runs `vitest` which covers all unit tests. Integration tests require Docker/local Supabase and won't run in standard CI without it.
   - What's unclear: Whether TEST-04 requires integration tests to pass in GitHub Actions CI or only locally.
   - Recommendation: Based on CONTEXT.md ("full Vitest unit suite passes AND Vitest integration tests pass against real local Supabase (Docker)"), integration tests are local-only verification. The CI `make test` command covers unit tests. Integration tests are invoked manually with a separate command (e.g., `make test-integration`). Document this clearly in the plan.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 |
| Config file | `vitest.config.mts` (unit); `vitest.integration.config.mts` (new, Wave 0) |
| Quick run command | `npx vitest run test/unit/lib/tenant/rollback.test.ts` |
| Full suite command | `npx vitest run` |
| Integration run command | `npx vitest run --config vitest.integration.config.mts` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROLLBACK-01 | Post-store failure triggers vault.delete | unit | `npx vitest run test/unit/lib/tenant/rollback.test.ts` | Wave 0 |
| ROLLBACK-01 | Pre-store failure does NOT trigger vault.delete | unit | `npx vitest run test/unit/lib/tenant/rollback.test.ts` | Wave 0 |
| ROLLBACK-02 | transitionTenant(tenant, 'Registered') called in rollback path | unit | `npx vitest run test/unit/lib/tenant/rollback.test.ts` | Wave 0 |
| ROLLBACK-03 | vault.delete called with correct secretId on post-store failure | unit | `npx vitest run test/unit/lib/tenant/rollback.test.ts` | Wave 0 |
| ROLLBACK-03 | ProvisioningRollbackError thrown when vault.delete also fails | unit | `npx vitest run test/unit/lib/tenant/rollback.test.ts` | Wave 0 |
| ROLLBACK-03 | Full provisioning lifecycle — vault secret deleted on rollback | integration | `npx vitest run --config vitest.integration.config.mts` | Wave 0 |
| TEST-04 | Full Vitest unit suite passes | unit | `npx vitest run` | ✅ (293 tests green) |
| TEST-04 | Integration tests pass against real local Supabase | integration | `npx vitest run --config vitest.integration.config.mts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run test/unit/lib/tenant/rollback.test.ts`
- **Per wave merge:** `npx vitest run` (full unit suite)
- **Phase gate:** Full unit suite + integration suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `test/unit/lib/tenant/rollback.test.ts` — covers ROLLBACK-01, ROLLBACK-02, ROLLBACK-03 (unit)
- [ ] `test/integration/tenant-provisioning.test.ts` — covers ROLLBACK-01/02/03 and TEST-04 (integration)
- [ ] `vitest.integration.config.mts` — integration test config with `environment: 'node'` and env var loading

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `lib/tenant/registrationService.ts` — existing rollback implementation confirmed
- Direct code read: `lib/tenant/types.ts` — existing error class pattern confirmed
- Direct code read: `lib/tenant/stateMachine.ts` — `transitionTenant()` signature and `Provisioning → Registered` transition confirmed
- Direct code read: `lib/tenant/vaultStore.ts` — `SupabaseVaultStore` implementation confirmed
- Direct code read: `test/unit/lib/tenant/registrationService.test.ts` — existing spy pattern confirmed (lines 240-261)
- Direct code read: `vitest.config.mts` — `environment: 'jsdom'` confirmed; workspace approach identified as needed
- Direct test run: `npx vitest run` — 293 tests passing, 35 test files, all green (confirmed 2026-06-09)
- Direct read: `.planning/phases/03-tenant-isolation-layer/03-VERIFICATION.md` — SEC-02, SEC-03, TEST-03 all SATISFIED

### Secondary (MEDIUM confidence)
- Vitest 4.x workspace documentation pattern — cross-referenced with installed version 4.1.8; workspace API is stable in 4.x

### Tertiary (LOW confidence)
- `supabase.auth.admin.createUser()` for ephemeral test users — approach is standard but not verified against the specific `@supabase/supabase-js` 2.105.1 API surface in this codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; no new dependencies needed
- Architecture: HIGH — existing patterns are fully readable in the codebase; `ProvisioningRollbackError` shape derived directly from existing error classes
- Pitfalls: HIGH for unit test patterns (spyOn already exists in codebase); MEDIUM for integration test env var loading (not yet done in this project)
- Phase 3 gap audit: HIGH — Phase 3 VERIFICATION.md is authoritative and was read directly

**Research date:** 2026-06-09
**Valid until:** 2026-07-09 (stable libraries; rollback logic is simple and won't change)
