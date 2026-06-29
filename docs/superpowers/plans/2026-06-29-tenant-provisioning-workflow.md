# Tenant Provisioning Workflow (EVE-45) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tenant provisioning orchestrator that runs an ordered, retryable, rollback-safe sequence of steps (BYODB bind → config seed → feature-flag bootstrap → metering bootstrap → readiness gate → activate) so a tenant only becomes routable (`Active`) after every step and a readiness gate pass.

**Architecture:** A `ProvisioningOrchestrator` executes a list of `ProvisioningStep`s against a mutable `ProvisioningContext`. Per-step progress, attempts, and run status are persisted in new `provisioning_runs` / `provisioning_run_steps` tables via a `ProvisioningRunStore` (so the orchestrator is unit-testable with a fake). Steps depend on small injected interfaces (`ConnectivityProbe`, `VaultStore`, `ProvisioningDb`) — all already-tested primitives are reused from `lib/tenant/`. Activation is the *last* step, so any earlier failure leaves the tenant in `Provisioning` (non-routable); fatal failures trigger reverse-order compensation. An `AuditSink` seam is wired through with a no-op default (real audit log is EVE-55).

**Tech Stack:** TypeScript, Next.js 16 App Router (route handlers), Supabase (Postgres + RLS, service-role client), Vitest (unit), Playwright (E2E). Follows existing patterns in `lib/tenant/` and `app/api/board/settings/byodb/route.ts`.

---

## Context for the implementer

**What already exists and is reused (do NOT rebuild):**

- `lib/tenant/types.ts` — `Tenant`, `TenantState` (`Registered | Provisioning | Active | Suspended | Decommissioned`), `InvalidStateTransitionError`.
- `lib/tenant/stateMachine.ts` — `transition(from, to)` (pure, validates the `TRANSITIONS` table, throws `InvalidStateTransitionError`).
- `lib/tenant/credentials.ts` — `normalizeCredential(input)`, `BYODBCredentialInput`, `CredentialValidationError`.
- `lib/tenant/probe.ts` — `ConnectivityProbe` interface, `ProbeResult` (`{ reachable, ownsSchema, error? }`), `ConnectivityError`.
- `lib/tenant/probeDriver.ts` — `RealConnectivityProbe` (concrete probe used in routes).
- `lib/tenant/vault.ts` — `VaultStore` interface (`store(name, secret)`, `delete(secretId)`), `StoredSecret`, `VaultStorageError`.
- `lib/tenant/vaultStore.ts` — `SupabaseVaultStore` (concrete, service-role).
- `lib/supabase/service.ts` — `createServiceClient()` (service-role, bypasses RLS).
- `lib/supabase/server.ts` — `createClient()` (request-scoped, RLS-enforced).

**Conventions to follow:**

- Migrations: new file per change in `supabase/migrations/`, named `YYYYMMDDHHMMSS_description.sql`. Latest existing is `20260629000000_grant_public_api_roles.sql`. This plan uses `20260629120000`, `20260629120001`, `20260629120002`.
- Unit tests live in `test/unit/...` mirroring source path; run with `npx vitest run <path>`. The `@` alias maps to repo root. `server-only` is shimmed in `vitest.config.ts`, so `server-only`-marked modules are unit-testable.
- E2E tests live in `e2e/tests/<area>/`, import `{ test, expect }` from `../../fixtures/index`, use `adminClient` / helpers from `e2e/helpers/supabase.admin.ts`. API-level specs use `page.request`.
- Commit after every green test (frequent commits).

**Naming contract (used consistently across all tasks):**

- `ProvisioningStepName = 'bind_byodb' | 'seed_config' | 'bootstrap_feature_flags' | 'bootstrap_metering' | 'readiness_gate' | 'activate'`
- `ProvisioningRunStatus = 'Running' | 'Provisioned' | 'RolledBack' | 'AwaitingManualIntervention'`
- `StepRecordStatus = 'Running' | 'Completed' | 'Failed' | 'Compensated'`
- Error classes: `RetryableProvisioningError` (transient → retry), `ManualInterventionError` (operator must act → stop, no rollback), `ReadinessError` (fatal → rollback). Any other thrown `Error` is treated as **fatal**.
- Interfaces: `ProvisioningStep`, `ProvisioningContext`, `ProvisioningDb`, `ProvisioningRunStore`, `AuditSink`, and class `ProvisioningOrchestrator`.

---

## File Structure

**Design doc**
- Create: `docs/superpowers/specs/2026-06-29-tenant-provisioning-workflow-design.md` — sequence, decision points, retry/rollback/manual-intervention, security & audit requirements, dependencies.

**Migrations**
- Create: `supabase/migrations/20260629120000_provisioning_runs.sql` — `provisioning_runs` + `provisioning_run_steps` + RLS.
- Create: `supabase/migrations/20260629120001_tenant_config.sql` — `tenant_config` + RLS.
- Create: `supabase/migrations/20260629120002_tenant_storage_metering.sql` — `tenant_storage_metering` + RLS.

**Core library (`lib/tenant/provisioning/`)** — each file one responsibility:
- `types.ts` — names, statuses, `ProvisioningContext`, `ProvisioningStep`, `ProvisioningDb`, `ProvisioningRun`, `ProvisioningRunStore`.
- `errors.ts` — `RetryableProvisioningError`, `ManualInterventionError`, `ReadinessError`, `classifyError`.
- `constants.ts` — `DEFAULT_FEATURE_FLAGS`, `DEFAULT_TENANT_CONFIG`, `DEFAULT_QUOTA_BYTES`, `PROVISIONING_STEP_ORDER`.
- `audit.ts` — `AuditSink`, `ProvisioningAuditEvent`, `noopAuditSink`.
- `steps/bindByodb.ts` — `createBindByodbStep(probe, vault)`.
- `steps/seedConfig.ts` — `createSeedConfigStep(db)`.
- `steps/bootstrapFeatureFlags.ts` — `createBootstrapFeatureFlagsStep(db)`.
- `steps/bootstrapMetering.ts` — `createBootstrapMeteringStep(db)`.
- `steps/readinessGate.ts` — `createReadinessGateStep(db)`.
- `steps/activate.ts` — `createActivateStep(db)`.
- `orchestrator.ts` — `ProvisioningOrchestrator`.
- `supabaseProvisioningDb.ts` — `SupabaseProvisioningDb` (implements `ProvisioningDb`).
- `supabaseRunStore.ts` — `SupabaseProvisioningRunStore` (implements `ProvisioningRunStore`).
- `buildOrchestrator.ts` — wires real deps into a ready-to-run orchestrator.

**API**
- Create: `app/api/platform/tenants/[tenantId]/provision/route.ts` — `POST` (run provisioning), `GET` (latest run status).

**Tests**
- `test/unit/lib/tenant/provisioning/errors.test.ts`
- `test/unit/lib/tenant/provisioning/steps/bindByodb.test.ts`
- `test/unit/lib/tenant/provisioning/steps/seedConfig.test.ts`
- `test/unit/lib/tenant/provisioning/steps/bootstrapFeatureFlags.test.ts`
- `test/unit/lib/tenant/provisioning/steps/bootstrapMetering.test.ts`
- `test/unit/lib/tenant/provisioning/steps/readinessGate.test.ts`
- `test/unit/lib/tenant/provisioning/steps/activate.test.ts`
- `test/unit/lib/tenant/provisioning/orchestrator.test.ts`
- `e2e/tests/platform/tenant-provisioning.spec.ts`

---

## Task 1: Design document

**Files:**
- Create: `docs/superpowers/specs/2026-06-29-tenant-provisioning-workflow-design.md`

- [ ] **Step 1: Write the design doc**

Create the file with this content:

```markdown
# Tenant Provisioning Workflow — Design (EVE-45)

## Goal
Provision a BYODB tenant from `Registered` to a routable `Active` state through a
single, ordered, rollback-safe workflow. A tenant must never be routable until
every provisioning step and a readiness gate have passed.

## Provisioning sequence
1. **bind_byodb** — validate + connectivity-probe the BYODB credentials, then store
   them in Supabase Vault. Produces `secretId`.
2. **seed_config** — insert the tenant's default config row (`tenant_config`).
3. **bootstrap_feature_flags** — write the canonical default feature-flag set.
4. **bootstrap_metering** — insert a zeroed `tenant_storage_metering` row with a
   default quota.
5. **readiness_gate** — verify all artifacts exist (secret bound, config row,
   feature flags, metering row). Fails the run if any check fails.
6. **activate** — transition `Provisioning → Active` (validated by the state
   machine) and persist. This is the ONLY step that makes a tenant routable.

## Decision points & failure handling
- Each step declares `maxAttempts`. Failures are classified:
  - **Retryable** (`RetryableProvisioningError`, e.g. BYODB unreachable): retried up
    to `maxAttempts`; if still failing → treated as fatal → rollback.
  - **Manual intervention** (`ManualInterventionError`, e.g. BYODB reachable but no
    schema ownership): run stops at `AwaitingManualIntervention`. NO rollback — an
    operator fixes the underlying issue and re-runs. Tenant stays `Provisioning`.
  - **Fatal** (any other error, incl. `CredentialValidationError`, `ReadinessError`,
    `InvalidStateTransitionError`): run rolls back completed steps in reverse order
    and ends `RolledBack`.
- **No routable partial tenant:** `activate` is last; any earlier failure leaves the
  tenant `Provisioning`. Rollback never leaves a tenant `Active`.

## State model
- Tenant lifecycle states are unchanged (`Registered → Provisioning → Active → …`).
- Step-level progress is tracked separately in `provisioning_runs` /
  `provisioning_run_steps`. The tenant stays `Provisioning` for the whole run and
  flips to `Active` only on the `activate` step.

## Security & audit requirements
- All provisioning is triggered by a `platform_admin` (route role guard) and runs
  through the service-role client; tenant identity is resolved from the `tenants`
  row, never trusted from the request body.
- BYODB credentials are validated and probed before storage, stored only in Vault,
  and never logged or placed in error messages or shared state.
- Bootstrap writes (config, flags, metering) are always scoped by `tenant_id`, so
  provisioning one tenant cannot mutate another's state.
- Every step/run outcome is emitted to an `AuditSink`. V1 ships a `noopAuditSink`;
  the durable audit log is delivered by **EVE-55** (audit logging & compliance),
  which will provide a real `AuditSink` implementation — no schema work here.

## Dependencies
- **Control-plane state:** `tenants` table + state machine (`lib/tenant/`).
- **Runtime routing:** consumers treat only `Active` tenants as routable.
- **Deployment orchestration (EVE-46):** out of scope; this workflow assumes the
  BYODB target already exists and is reachable.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-06-29-tenant-provisioning-workflow-design.md
git commit -m "docs(provisioning): EVE-45 tenant provisioning workflow design"
```

---

## Task 2: Migration — provisioning_runs & provisioning_run_steps

**Files:**
- Create: `supabase/migrations/20260629120000_provisioning_runs.sql`

- [ ] **Step 1: Write the migration**

```sql
-- EVE-45: provisioning run tracking. One run per provisioning attempt for a tenant,
-- with per-step progress. Tenant lifecycle state stays in public.tenants; these
-- tables only track the orchestration. Service role writes; tenant owner can read.

CREATE TABLE public.provisioning_runs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'Running'
              CHECK (status IN ('Running', 'Provisioned', 'RolledBack', 'AwaitingManualIntervention')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.provisioning_run_steps (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id      UUID NOT NULL REFERENCES public.provisioning_runs(id) ON DELETE CASCADE,
  step_name   TEXT NOT NULL
              CHECK (step_name IN ('bind_byodb', 'seed_config', 'bootstrap_feature_flags',
                                   'bootstrap_metering', 'readiness_gate', 'activate')),
  status      TEXT NOT NULL
              CHECK (status IN ('Running', 'Completed', 'Failed', 'Compensated')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provisioning_runs_tenant ON public.provisioning_runs(tenant_id);
CREATE INDEX idx_provisioning_run_steps_run ON public.provisioning_run_steps(run_id);

-- keep updated_at fresh (reuse the same pattern as tenants)
CREATE TRIGGER trg_provisioning_runs_updated_at
  BEFORE UPDATE ON public.provisioning_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_tenants_updated_at();

CREATE TRIGGER trg_provisioning_run_steps_updated_at
  BEFORE UPDATE ON public.provisioning_run_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_tenants_updated_at();

ALTER TABLE public.provisioning_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provisioning_run_steps ENABLE ROW LEVEL SECURITY;

-- Tenant owner can read their own runs (service role bypasses RLS for writes)
CREATE POLICY provisioning_runs_select_own ON public.provisioning_runs
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY provisioning_run_steps_select_own ON public.provisioning_run_steps
  FOR SELECT USING (
    run_id IN (
      SELECT pr.id FROM public.provisioning_runs pr
      JOIN public.tenants t ON t.id = pr.tenant_id
      WHERE t.owner_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply the migration locally and verify it parses**

Run: `make db-reset`
Expected: completes without error; output lists the new migration applied (no SQL syntax error).

> If Docker/Supabase is unavailable in your environment, instead run a SQL lint check by eye and proceed; the CI `build`/`test` jobs do not apply migrations, but a teammate must run `make db-reset` before merge.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260629120000_provisioning_runs.sql
git commit -m "feat(provisioning): add provisioning_runs and run_steps tables (EVE-45)"
```

---

## Task 3: Migration — tenant_config

**Files:**
- Create: `supabase/migrations/20260629120001_tenant_config.sql`

- [ ] **Step 1: Write the migration**

```sql
-- EVE-45: per-tenant configuration seeded during provisioning (seed_config step).
-- Distinct from feature_flags (which live on tenants). One row per tenant.

CREATE TABLE public.tenant_config (
  tenant_id   UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenant_config_updated_at
  BEFORE UPDATE ON public.tenant_config
  FOR EACH ROW EXECUTE FUNCTION public.set_tenants_updated_at();

ALTER TABLE public.tenant_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_config_select_own ON public.tenant_config
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );
```

- [ ] **Step 2: Apply locally**

Run: `make db-reset`
Expected: completes without error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260629120001_tenant_config.sql
git commit -m "feat(provisioning): add tenant_config table (EVE-45)"
```

---

## Task 4: Migration — tenant_storage_metering

**Files:**
- Create: `supabase/migrations/20260629120002_tenant_storage_metering.sql`

- [ ] **Step 1: Write the migration**

```sql
-- EVE-45: minimal storage metering bootstrap. Provisioning inserts a zeroed row
-- with a default quota. Real usage accounting is deferred to a later ticket.

CREATE TABLE public.tenant_storage_metering (
  tenant_id    UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  bytes_used   BIGINT NOT NULL DEFAULT 0,
  quota_bytes  BIGINT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenant_storage_metering_updated_at
  BEFORE UPDATE ON public.tenant_storage_metering
  FOR EACH ROW EXECUTE FUNCTION public.set_tenants_updated_at();

ALTER TABLE public.tenant_storage_metering ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_storage_metering_select_own ON public.tenant_storage_metering
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );
```

- [ ] **Step 2: Apply locally**

Run: `make db-reset`
Expected: completes without error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260629120002_tenant_storage_metering.sql
git commit -m "feat(provisioning): add tenant_storage_metering table (EVE-45)"
```

---

## Task 5: Constants

**Files:**
- Create: `lib/tenant/provisioning/constants.ts`

- [ ] **Step 1: Write the constants**

```typescript
import type { ProvisioningStepName } from '@/lib/tenant/provisioning/types'

/**
 * Canonical V1 feature-flag set. Must match the DEFAULT in
 * supabase/migrations/20260620130000_add_tenant_feature_flags.sql.
 */
export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  member_invitations: true,
  fleet: true,
  carbon: true,
  trips: true,
  driver_behaviour_score: true,
  alerts: true,
  charging_stations: true,
  auth_troubleshooting: true,
}

/** Default config seeded into tenant_config.settings during provisioning. */
export const DEFAULT_TENANT_CONFIG: Record<string, string> = {
  locale: 'en-MY',
  timezone: 'Asia/Kuala_Lumpur',
  distance_unit: 'km',
}

/** Default storage quota for a newly provisioned tenant: 5 GiB. */
export const DEFAULT_QUOTA_BYTES = 5 * 1024 * 1024 * 1024

/** Canonical execution order of provisioning steps. */
export const PROVISIONING_STEP_ORDER: readonly ProvisioningStepName[] = [
  'bind_byodb',
  'seed_config',
  'bootstrap_feature_flags',
  'bootstrap_metering',
  'readiness_gate',
  'activate',
] as const
```

- [ ] **Step 2: Commit** (compiles once Task 6 types exist; this file imports a type only)

```bash
git add lib/tenant/provisioning/constants.ts
git commit -m "feat(provisioning): provisioning constants (EVE-45)"
```

> Note: this file imports `ProvisioningStepName` from `types.ts` (Task 6). If you execute Task 6 first the import resolves immediately; otherwise expect a transient unresolved-import until Task 6 lands. The constant *values* are independent.

---

## Task 6: Core types & interfaces

**Files:**
- Create: `lib/tenant/provisioning/types.ts`

- [ ] **Step 1: Write the types**

```typescript
import type { Tenant, TenantState } from '@/lib/tenant/types'
import type { BYODBCredentialInput } from '@/lib/tenant/credentials'

export type ProvisioningStepName =
  | 'bind_byodb'
  | 'seed_config'
  | 'bootstrap_feature_flags'
  | 'bootstrap_metering'
  | 'readiness_gate'
  | 'activate'

export type ProvisioningRunStatus =
  | 'Running'
  | 'Provisioned'
  | 'RolledBack'
  | 'AwaitingManualIntervention'

export type StepRecordStatus = 'Running' | 'Completed' | 'Failed' | 'Compensated'

/**
 * Mutable state passed to every step. Steps read `tenant`/`byodbInput` and may
 * write `secretId` (bind_byodb sets it; compensate/readiness read it).
 * Credentials live only inside `byodbInput`; never log this object.
 */
export interface ProvisioningContext {
  tenant: Tenant
  byodbInput: BYODBCredentialInput
  secretId?: string
}

/**
 * A single provisioning step. `run` throws on failure (the orchestrator classifies
 * the error). `compensate` undoes a previously-completed step and MUST be idempotent.
 */
export interface ProvisioningStep {
  readonly name: ProvisioningStepName
  readonly maxAttempts: number
  run(ctx: ProvisioningContext): Promise<void>
  compensate(ctx: ProvisioningContext): Promise<void>
}

/**
 * Data-access surface for steps that touch Postgres (everything except probe/vault).
 * Keeps Supabase specifics out of step logic so steps are unit-testable with a fake.
 */
export interface ProvisioningDb {
  seedConfig(tenantId: string, settings: Record<string, string>): Promise<void>
  deleteConfig(tenantId: string): Promise<void>
  setFeatureFlags(tenantId: string, flags: Record<string, boolean>): Promise<void>
  initMetering(tenantId: string, quotaBytes: number): Promise<void>
  deleteMetering(tenantId: string): Promise<void>
  setTenantState(tenantId: string, state: TenantState): Promise<void>
  hasConfig(tenantId: string): Promise<boolean>
  hasMetering(tenantId: string): Promise<boolean>
  getFeatureFlags(tenantId: string): Promise<Record<string, boolean> | null>
}

export interface StepRecord {
  name: ProvisioningStepName
  status: StepRecordStatus
  attempts: number
  error?: string
}

export interface ProvisioningRun {
  runId: string
  tenantId: string
  status: ProvisioningRunStatus
  steps: StepRecord[]
}

/**
 * Persistence for run + per-step progress. The orchestrator depends on this
 * interface only, so it can be unit-tested with an in-memory fake.
 */
export interface ProvisioningRunStore {
  createRun(tenantId: string): Promise<{ runId: string }>
  recordStep(
    runId: string,
    step: ProvisioningStepName,
    status: StepRecordStatus,
    attempts: number,
    error?: string,
  ): Promise<void>
  setRunStatus(runId: string, status: ProvisioningRunStatus): Promise<void>
  getRun(runId: string): Promise<ProvisioningRun | null>
  getLatestRunForTenant(tenantId: string): Promise<ProvisioningRun | null>
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: exit 0 (types-only file; `constants.ts` import now resolves).

- [ ] **Step 3: Commit**

```bash
git add lib/tenant/provisioning/types.ts
git commit -m "feat(provisioning): core provisioning types and interfaces (EVE-45)"
```

---

## Task 7: Errors & classification

**Files:**
- Create: `lib/tenant/provisioning/errors.ts`
- Test: `test/unit/lib/tenant/provisioning/errors.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import {
  RetryableProvisioningError,
  ManualInterventionError,
  ReadinessError,
  classifyError,
} from '@/lib/tenant/provisioning/errors'
import { CredentialValidationError } from '@/lib/tenant/credentials'

describe('classifyError', () => {
  it('classifies RetryableProvisioningError as retryable, not manual', () => {
    expect(classifyError(new RetryableProvisioningError('db unreachable'))).toEqual({
      retryable: true,
      manual: false,
    })
  })

  it('classifies ManualInterventionError as manual, not retryable', () => {
    expect(classifyError(new ManualInterventionError('no schema ownership'))).toEqual({
      retryable: false,
      manual: true,
    })
  })

  it('classifies ReadinessError as fatal (neither retryable nor manual)', () => {
    expect(classifyError(new ReadinessError('missing config'))).toEqual({
      retryable: false,
      manual: false,
    })
  })

  it('classifies CredentialValidationError as fatal', () => {
    expect(classifyError(new CredentialValidationError('bad host'))).toEqual({
      retryable: false,
      manual: false,
    })
  })

  it('classifies an unknown Error as fatal', () => {
    expect(classifyError(new Error('boom'))).toEqual({ retryable: false, manual: false })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/tenant/provisioning/errors.test.ts`
Expected: FAIL — cannot resolve `@/lib/tenant/provisioning/errors`.

- [ ] **Step 3: Write the implementation**

```typescript
/** Transient failure — the orchestrator should retry up to the step's maxAttempts. */
export class RetryableProvisioningError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RetryableProvisioningError'
  }
}

/** Failure that needs an operator. The run halts at AwaitingManualIntervention; no rollback. */
export class ManualInterventionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManualInterventionError'
  }
}

/** The readiness gate found a missing/invalid artifact. Fatal → rollback. */
export class ReadinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReadinessError'
  }
}

/**
 * Classify a thrown value into orchestrator behaviour.
 * - retryable: retry until maxAttempts, then treat as fatal
 * - manual: stop the run for operator intervention, no rollback
 * - neither (fatal): roll back completed steps
 */
export function classifyError(err: unknown): { retryable: boolean; manual: boolean } {
  if (err instanceof RetryableProvisioningError) return { retryable: true, manual: false }
  if (err instanceof ManualInterventionError) return { retryable: false, manual: true }
  return { retryable: false, manual: false }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/tenant/provisioning/errors.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tenant/provisioning/errors.ts test/unit/lib/tenant/provisioning/errors.test.ts
git commit -m "feat(provisioning): error types and classification (EVE-45)"
```

---

## Task 8: Audit seam

**Files:**
- Create: `lib/tenant/provisioning/audit.ts`

- [ ] **Step 1: Write the audit seam**

```typescript
import type { ProvisioningStepName } from '@/lib/tenant/provisioning/types'

/**
 * A single provisioning audit event. Never include credentials or secret VALUES —
 * `secretId` references are acceptable, raw secrets are not.
 */
export interface ProvisioningAuditEvent {
  tenantId: string
  runId: string
  step?: ProvisioningStepName
  action: string
  outcome: 'ok' | 'error'
  error?: string
  at: string
}

/** Sink for provisioning audit events. EVE-55 will provide a durable implementation. */
export interface AuditSink {
  record(event: ProvisioningAuditEvent): Promise<void>
}

/** No-op default — provisioning works without a durable audit log (EVE-55). */
export const noopAuditSink: AuditSink = {
  async record() {
    /* intentionally empty until EVE-55 */
  },
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/tenant/provisioning/audit.ts
git commit -m "feat(provisioning): audit sink seam with no-op default (EVE-45)"
```

---

## Task 9: Step — bind_byodb

**Files:**
- Create: `lib/tenant/provisioning/steps/bindByodb.ts`
- Test: `test/unit/lib/tenant/provisioning/steps/bindByodb.test.ts`

This step reuses the existing tested primitives: `normalizeCredential`, `ConnectivityProbe`, `VaultStore`. It does NOT transition state (that is the `activate` step's job).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createBindByodbStep } from '@/lib/tenant/provisioning/steps/bindByodb'
import {
  RetryableProvisioningError,
  ManualInterventionError,
} from '@/lib/tenant/provisioning/errors'
import { CredentialValidationError } from '@/lib/tenant/credentials'
import type { ConnectivityProbe, ProbeResult } from '@/lib/tenant/probe'
import type { VaultStore } from '@/lib/tenant/vault'
import type { ProvisioningContext } from '@/lib/tenant/provisioning/types'
import type { Tenant } from '@/lib/tenant/types'

const TENANT: Tenant = {
  id: 'tenant-1',
  owner_id: 'owner-1',
  name: 'T',
  state: 'Provisioning',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function ctx(): ProvisioningContext {
  return {
    tenant: TENANT,
    byodbInput: {
      kind: 'structured',
      params: { engine: 'postgres', host: 'db', port: 5432, database: 'd', user: 'u', password: 'p' },
    },
  }
}

function probeOf(result: ProbeResult): ConnectivityProbe {
  return { probe: vi.fn().mockResolvedValue(result) }
}

function vaultOf(secretId = 'sec-1'): VaultStore & { store: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } {
  return {
    store: vi.fn().mockResolvedValue({ secretId }),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

describe('bind_byodb step', () => {
  it('has the correct name and maxAttempts', () => {
    const step = createBindByodbStep(probeOf({ reachable: true, ownsSchema: true }), vaultOf())
    expect(step.name).toBe('bind_byodb')
    expect(step.maxAttempts).toBe(3)
  })

  it('probes, stores in vault, and writes secretId to ctx on success', async () => {
    const probe = probeOf({ reachable: true, ownsSchema: true })
    const vault = vaultOf('stored-id')
    const step = createBindByodbStep(probe, vault)
    const c = ctx()

    await step.run(c)

    expect(probe.probe).toHaveBeenCalledOnce()
    expect(vault.store).toHaveBeenCalledWith('byodb/tenant-1', expect.any(String))
    expect(c.secretId).toBe('stored-id')
  })

  it('throws CredentialValidationError (fatal) on invalid input, before probe', async () => {
    const probe = probeOf({ reachable: true, ownsSchema: true })
    const vault = vaultOf()
    const step = createBindByodbStep(probe, vault)
    const c = ctx()
    c.byodbInput = { kind: 'structured', params: { engine: 'postgres', host: '', port: 5432, database: 'd', user: 'u', password: 'p' } }

    await expect(step.run(c)).rejects.toThrow(CredentialValidationError)
    expect(probe.probe).not.toHaveBeenCalled()
  })

  it('throws RetryableProvisioningError when db unreachable, without storing', async () => {
    const probe = probeOf({ reachable: false, ownsSchema: false, error: 'timeout' })
    const vault = vaultOf()
    const step = createBindByodbStep(probe, vault)

    await expect(step.run(ctx())).rejects.toThrow(RetryableProvisioningError)
    expect(vault.store).not.toHaveBeenCalled()
  })

  it('throws ManualInterventionError when reachable but no schema ownership', async () => {
    const probe = probeOf({ reachable: true, ownsSchema: false })
    const vault = vaultOf()
    const step = createBindByodbStep(probe, vault)

    await expect(step.run(ctx())).rejects.toThrow(ManualInterventionError)
    expect(vault.store).not.toHaveBeenCalled()
  })

  it('compensate deletes the stored secret when secretId is set', async () => {
    const vault = vaultOf()
    const step = createBindByodbStep(probeOf({ reachable: true, ownsSchema: true }), vault)
    const c = ctx()
    c.secretId = 'sec-9'

    await step.compensate(c)
    expect(vault.delete).toHaveBeenCalledWith('sec-9')
  })

  it('compensate is a no-op when no secretId was stored', async () => {
    const vault = vaultOf()
    const step = createBindByodbStep(probeOf({ reachable: true, ownsSchema: true }), vault)

    await step.compensate(ctx())
    expect(vault.delete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/bindByodb.test.ts`
Expected: FAIL — cannot resolve `bindByodb`.

- [ ] **Step 3: Write the implementation**

```typescript
import { normalizeCredential } from '@/lib/tenant/credentials'
import type { ConnectivityProbe } from '@/lib/tenant/probe'
import type { VaultStore } from '@/lib/tenant/vault'
import type { ProvisioningStep, ProvisioningContext } from '@/lib/tenant/provisioning/types'
import {
  RetryableProvisioningError,
  ManualInterventionError,
} from '@/lib/tenant/provisioning/errors'

/**
 * bind_byodb — validate + connectivity-probe BYODB credentials, then store them in
 * Vault. Writes the resulting secretId onto ctx. Does NOT change tenant state.
 *
 * Error mapping:
 *   - invalid input        → CredentialValidationError (fatal, thrown by normalize)
 *   - unreachable database  → RetryableProvisioningError (transient)
 *   - no schema ownership   → ManualInterventionError (operator must grant access)
 */
export function createBindByodbStep(probe: ConnectivityProbe, vault: VaultStore): ProvisioningStep {
  return {
    name: 'bind_byodb',
    maxAttempts: 3,

    async run(ctx: ProvisioningContext): Promise<void> {
      const params = normalizeCredential(ctx.byodbInput)

      const result = await probe.probe(params)
      if (!result.reachable) {
        throw new RetryableProvisioningError(
          `BYODB unreachable for tenant ${ctx.tenant.id}: ${result.error ?? 'unreachable'}`,
        )
      }
      if (!result.ownsSchema) {
        throw new ManualInterventionError(
          `BYODB for tenant ${ctx.tenant.id} reachable but lacks schema ownership`,
        )
      }

      const stored = await vault.store(`byodb/${ctx.tenant.id}`, JSON.stringify(params))
      ctx.secretId = stored.secretId
    },

    async compensate(ctx: ProvisioningContext): Promise<void> {
      if (ctx.secretId) {
        await vault.delete(ctx.secretId)
      }
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/bindByodb.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tenant/provisioning/steps/bindByodb.ts test/unit/lib/tenant/provisioning/steps/bindByodb.test.ts
git commit -m "feat(provisioning): bind_byodb step (EVE-45)"
```

---

## Task 10: Step — seed_config

**Files:**
- Create: `lib/tenant/provisioning/steps/seedConfig.ts`
- Test: `test/unit/lib/tenant/provisioning/steps/seedConfig.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createSeedConfigStep } from '@/lib/tenant/provisioning/steps/seedConfig'
import { DEFAULT_TENANT_CONFIG } from '@/lib/tenant/provisioning/constants'
import type { ProvisioningDb, ProvisioningContext } from '@/lib/tenant/provisioning/types'
import type { Tenant } from '@/lib/tenant/types'

const TENANT: Tenant = {
  id: 'tenant-1', owner_id: 'o', name: 'T', state: 'Provisioning',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

function ctx(): ProvisioningContext {
  return { tenant: TENANT, byodbInput: { kind: 'structured', params: { engine: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u', password: 'p' } } }
}

function fakeDb(): ProvisioningDb {
  return {
    seedConfig: vi.fn().mockResolvedValue(undefined),
    deleteConfig: vi.fn().mockResolvedValue(undefined),
    setFeatureFlags: vi.fn(), initMetering: vi.fn(), deleteMetering: vi.fn(),
    setTenantState: vi.fn(), hasConfig: vi.fn(), hasMetering: vi.fn(), getFeatureFlags: vi.fn(),
  }
}

describe('seed_config step', () => {
  it('has the correct name and maxAttempts', () => {
    const step = createSeedConfigStep(fakeDb())
    expect(step.name).toBe('seed_config')
    expect(step.maxAttempts).toBe(2)
  })

  it('seeds default config scoped to the tenant id', async () => {
    const db = fakeDb()
    await createSeedConfigStep(db).run(ctx())
    expect(db.seedConfig).toHaveBeenCalledWith('tenant-1', DEFAULT_TENANT_CONFIG)
  })

  it('compensate deletes the config for the tenant', async () => {
    const db = fakeDb()
    await createSeedConfigStep(db).compensate(ctx())
    expect(db.deleteConfig).toHaveBeenCalledWith('tenant-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/seedConfig.test.ts`
Expected: FAIL — cannot resolve `seedConfig`.

- [ ] **Step 3: Write the implementation**

```typescript
import type { ProvisioningStep, ProvisioningContext, ProvisioningDb } from '@/lib/tenant/provisioning/types'
import { DEFAULT_TENANT_CONFIG } from '@/lib/tenant/provisioning/constants'

/** seed_config — insert the tenant's default configuration row. */
export function createSeedConfigStep(db: ProvisioningDb): ProvisioningStep {
  return {
    name: 'seed_config',
    maxAttempts: 2,
    async run(ctx: ProvisioningContext): Promise<void> {
      await db.seedConfig(ctx.tenant.id, DEFAULT_TENANT_CONFIG)
    },
    async compensate(ctx: ProvisioningContext): Promise<void> {
      await db.deleteConfig(ctx.tenant.id)
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/seedConfig.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tenant/provisioning/steps/seedConfig.ts test/unit/lib/tenant/provisioning/steps/seedConfig.test.ts
git commit -m "feat(provisioning): seed_config step (EVE-45)"
```

---

## Task 11: Step — bootstrap_feature_flags

**Files:**
- Create: `lib/tenant/provisioning/steps/bootstrapFeatureFlags.ts`
- Test: `test/unit/lib/tenant/provisioning/steps/bootstrapFeatureFlags.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createBootstrapFeatureFlagsStep } from '@/lib/tenant/provisioning/steps/bootstrapFeatureFlags'
import { DEFAULT_FEATURE_FLAGS } from '@/lib/tenant/provisioning/constants'
import type { ProvisioningDb, ProvisioningContext } from '@/lib/tenant/provisioning/types'
import type { Tenant } from '@/lib/tenant/types'

const TENANT: Tenant = {
  id: 'tenant-1', owner_id: 'o', name: 'T', state: 'Provisioning',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
function ctx(): ProvisioningContext {
  return { tenant: TENANT, byodbInput: { kind: 'structured', params: { engine: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u', password: 'p' } } }
}
function fakeDb(): ProvisioningDb {
  return {
    seedConfig: vi.fn(), deleteConfig: vi.fn(),
    setFeatureFlags: vi.fn().mockResolvedValue(undefined),
    initMetering: vi.fn(), deleteMetering: vi.fn(),
    setTenantState: vi.fn(), hasConfig: vi.fn(), hasMetering: vi.fn(), getFeatureFlags: vi.fn(),
  }
}

describe('bootstrap_feature_flags step', () => {
  it('has the correct name and maxAttempts', () => {
    const step = createBootstrapFeatureFlagsStep(fakeDb())
    expect(step.name).toBe('bootstrap_feature_flags')
    expect(step.maxAttempts).toBe(2)
  })

  it('writes the canonical default flags scoped to the tenant id', async () => {
    const db = fakeDb()
    await createBootstrapFeatureFlagsStep(db).run(ctx())
    expect(db.setFeatureFlags).toHaveBeenCalledWith('tenant-1', DEFAULT_FEATURE_FLAGS)
  })

  it('compensate is a no-op (flags removed with the tenant row on full teardown)', async () => {
    const db = fakeDb()
    await expect(createBootstrapFeatureFlagsStep(db).compensate(ctx())).resolves.toBeUndefined()
    expect(db.setFeatureFlags).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/bootstrapFeatureFlags.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write the implementation**

```typescript
import type { ProvisioningStep, ProvisioningContext, ProvisioningDb } from '@/lib/tenant/provisioning/types'
import { DEFAULT_FEATURE_FLAGS } from '@/lib/tenant/provisioning/constants'

/**
 * bootstrap_feature_flags — write the canonical default feature-flag set so
 * provisioning is the source of truth (idempotent; safe to re-run).
 * Compensation is a no-op: flags are non-routable metadata on the tenant row.
 */
export function createBootstrapFeatureFlagsStep(db: ProvisioningDb): ProvisioningStep {
  return {
    name: 'bootstrap_feature_flags',
    maxAttempts: 2,
    async run(ctx: ProvisioningContext): Promise<void> {
      await db.setFeatureFlags(ctx.tenant.id, DEFAULT_FEATURE_FLAGS)
    },
    async compensate(): Promise<void> {
      /* no-op: flags carry no routing meaning and are reset on re-provision */
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/bootstrapFeatureFlags.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tenant/provisioning/steps/bootstrapFeatureFlags.ts test/unit/lib/tenant/provisioning/steps/bootstrapFeatureFlags.test.ts
git commit -m "feat(provisioning): bootstrap_feature_flags step (EVE-45)"
```

---

## Task 12: Step — bootstrap_metering

**Files:**
- Create: `lib/tenant/provisioning/steps/bootstrapMetering.ts`
- Test: `test/unit/lib/tenant/provisioning/steps/bootstrapMetering.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createBootstrapMeteringStep } from '@/lib/tenant/provisioning/steps/bootstrapMetering'
import { DEFAULT_QUOTA_BYTES } from '@/lib/tenant/provisioning/constants'
import type { ProvisioningDb, ProvisioningContext } from '@/lib/tenant/provisioning/types'
import type { Tenant } from '@/lib/tenant/types'

const TENANT: Tenant = {
  id: 'tenant-1', owner_id: 'o', name: 'T', state: 'Provisioning',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
function ctx(): ProvisioningContext {
  return { tenant: TENANT, byodbInput: { kind: 'structured', params: { engine: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u', password: 'p' } } }
}
function fakeDb(): ProvisioningDb {
  return {
    seedConfig: vi.fn(), deleteConfig: vi.fn(), setFeatureFlags: vi.fn(),
    initMetering: vi.fn().mockResolvedValue(undefined),
    deleteMetering: vi.fn().mockResolvedValue(undefined),
    setTenantState: vi.fn(), hasConfig: vi.fn(), hasMetering: vi.fn(), getFeatureFlags: vi.fn(),
  }
}

describe('bootstrap_metering step', () => {
  it('has the correct name and maxAttempts', () => {
    const step = createBootstrapMeteringStep(fakeDb())
    expect(step.name).toBe('bootstrap_metering')
    expect(step.maxAttempts).toBe(2)
  })

  it('initializes a metering row with the default quota scoped to the tenant', async () => {
    const db = fakeDb()
    await createBootstrapMeteringStep(db).run(ctx())
    expect(db.initMetering).toHaveBeenCalledWith('tenant-1', DEFAULT_QUOTA_BYTES)
  })

  it('compensate deletes the metering row for the tenant', async () => {
    const db = fakeDb()
    await createBootstrapMeteringStep(db).compensate(ctx())
    expect(db.deleteMetering).toHaveBeenCalledWith('tenant-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/bootstrapMetering.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write the implementation**

```typescript
import type { ProvisioningStep, ProvisioningContext, ProvisioningDb } from '@/lib/tenant/provisioning/types'
import { DEFAULT_QUOTA_BYTES } from '@/lib/tenant/provisioning/constants'

/** bootstrap_metering — create the tenant's zeroed storage-metering row + quota. */
export function createBootstrapMeteringStep(db: ProvisioningDb): ProvisioningStep {
  return {
    name: 'bootstrap_metering',
    maxAttempts: 2,
    async run(ctx: ProvisioningContext): Promise<void> {
      await db.initMetering(ctx.tenant.id, DEFAULT_QUOTA_BYTES)
    },
    async compensate(ctx: ProvisioningContext): Promise<void> {
      await db.deleteMetering(ctx.tenant.id)
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/bootstrapMetering.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tenant/provisioning/steps/bootstrapMetering.ts test/unit/lib/tenant/provisioning/steps/bootstrapMetering.test.ts
git commit -m "feat(provisioning): bootstrap_metering step (EVE-45)"
```

---

## Task 13: Step — readiness_gate

**Files:**
- Create: `lib/tenant/provisioning/steps/readinessGate.ts`
- Test: `test/unit/lib/tenant/provisioning/steps/readinessGate.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createReadinessGateStep } from '@/lib/tenant/provisioning/steps/readinessGate'
import { ReadinessError } from '@/lib/tenant/provisioning/errors'
import { DEFAULT_FEATURE_FLAGS } from '@/lib/tenant/provisioning/constants'
import type { ProvisioningDb, ProvisioningContext } from '@/lib/tenant/provisioning/types'
import type { Tenant } from '@/lib/tenant/types'

const TENANT: Tenant = {
  id: 'tenant-1', owner_id: 'o', name: 'T', state: 'Provisioning',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
function ctx(secretId: string | undefined = 'sec-1'): ProvisioningContext {
  return { tenant: TENANT, secretId, byodbInput: { kind: 'structured', params: { engine: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u', password: 'p' } } }
}
function fakeDb(over: Partial<ProvisioningDb> = {}): ProvisioningDb {
  return {
    seedConfig: vi.fn(), deleteConfig: vi.fn(), setFeatureFlags: vi.fn(),
    initMetering: vi.fn(), deleteMetering: vi.fn(), setTenantState: vi.fn(),
    hasConfig: vi.fn().mockResolvedValue(true),
    hasMetering: vi.fn().mockResolvedValue(true),
    getFeatureFlags: vi.fn().mockResolvedValue(DEFAULT_FEATURE_FLAGS),
    ...over,
  }
}

describe('readiness_gate step', () => {
  it('has the correct name and maxAttempts', () => {
    const step = createReadinessGateStep(fakeDb())
    expect(step.name).toBe('readiness_gate')
    expect(step.maxAttempts).toBe(1)
  })

  it('passes when all artifacts are present', async () => {
    await expect(createReadinessGateStep(fakeDb()).run(ctx())).resolves.toBeUndefined()
  })

  it('throws ReadinessError when BYODB secret is not bound', async () => {
    await expect(createReadinessGateStep(fakeDb()).run(ctx(undefined))).rejects.toThrow(ReadinessError)
  })

  it('throws ReadinessError when config is missing', async () => {
    const db = fakeDb({ hasConfig: vi.fn().mockResolvedValue(false) })
    await expect(createReadinessGateStep(db).run(ctx())).rejects.toThrow(ReadinessError)
  })

  it('throws ReadinessError when metering row is missing', async () => {
    const db = fakeDb({ hasMetering: vi.fn().mockResolvedValue(false) })
    await expect(createReadinessGateStep(db).run(ctx())).rejects.toThrow(ReadinessError)
  })

  it('throws ReadinessError when feature flags are missing a canonical key', async () => {
    const partial = { ...DEFAULT_FEATURE_FLAGS }
    delete (partial as Record<string, boolean>).fleet
    const db = fakeDb({ getFeatureFlags: vi.fn().mockResolvedValue(partial) })
    await expect(createReadinessGateStep(db).run(ctx())).rejects.toThrow(ReadinessError)
  })

  it('compensate is a no-op (the gate performs no writes)', async () => {
    await expect(createReadinessGateStep(fakeDb()).compensate(ctx())).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/readinessGate.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write the implementation**

```typescript
import type { ProvisioningStep, ProvisioningContext, ProvisioningDb } from '@/lib/tenant/provisioning/types'
import { ReadinessError } from '@/lib/tenant/provisioning/errors'
import { DEFAULT_FEATURE_FLAGS } from '@/lib/tenant/provisioning/constants'

/**
 * readiness_gate — verify every provisioning artifact exists before activation.
 * Read-only: performs no writes, so it never needs compensation. Fails the run
 * (ReadinessError → fatal → rollback) if any check fails.
 */
export function createReadinessGateStep(db: ProvisioningDb): ProvisioningStep {
  return {
    name: 'readiness_gate',
    maxAttempts: 1,

    async run(ctx: ProvisioningContext): Promise<void> {
      const failures: string[] = []

      if (!ctx.secretId) failures.push('BYODB secret not bound')

      if (!(await db.hasConfig(ctx.tenant.id))) failures.push('tenant_config missing')
      if (!(await db.hasMetering(ctx.tenant.id))) failures.push('tenant_storage_metering missing')

      const flags = await db.getFeatureFlags(ctx.tenant.id)
      if (!flags) {
        failures.push('feature_flags missing')
      } else {
        const missing = Object.keys(DEFAULT_FEATURE_FLAGS).filter((k) => !(k in flags))
        if (missing.length > 0) failures.push(`feature_flags missing keys: ${missing.join(', ')}`)
      }

      if (failures.length > 0) {
        throw new ReadinessError(
          `Tenant ${ctx.tenant.id} not ready for activation: ${failures.join('; ')}`,
        )
      }
    },

    async compensate(): Promise<void> {
      /* no-op: read-only gate */
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/readinessGate.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tenant/provisioning/steps/readinessGate.ts test/unit/lib/tenant/provisioning/steps/readinessGate.test.ts
git commit -m "feat(provisioning): readiness_gate step (EVE-45)"
```

---

## Task 14: Step — activate

**Files:**
- Create: `lib/tenant/provisioning/steps/activate.ts`
- Test: `test/unit/lib/tenant/provisioning/steps/activate.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createActivateStep } from '@/lib/tenant/provisioning/steps/activate'
import { InvalidStateTransitionError } from '@/lib/tenant/types'
import type { ProvisioningDb, ProvisioningContext } from '@/lib/tenant/provisioning/types'
import type { Tenant } from '@/lib/tenant/types'

function tenant(state: Tenant['state']): Tenant {
  return { id: 'tenant-1', owner_id: 'o', name: 'T', state, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
}
function ctx(state: Tenant['state']): ProvisioningContext {
  return { tenant: tenant(state), byodbInput: { kind: 'structured', params: { engine: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u', password: 'p' } } }
}
function fakeDb(): ProvisioningDb {
  return {
    seedConfig: vi.fn(), deleteConfig: vi.fn(), setFeatureFlags: vi.fn(),
    initMetering: vi.fn(), deleteMetering: vi.fn(),
    setTenantState: vi.fn().mockResolvedValue(undefined),
    hasConfig: vi.fn(), hasMetering: vi.fn(), getFeatureFlags: vi.fn(),
  }
}

describe('activate step', () => {
  it('has the correct name and maxAttempts', () => {
    const step = createActivateStep(fakeDb())
    expect(step.name).toBe('activate')
    expect(step.maxAttempts).toBe(2)
  })

  it('transitions Provisioning → Active and persists', async () => {
    const db = fakeDb()
    await createActivateStep(db).run(ctx('Provisioning'))
    expect(db.setTenantState).toHaveBeenCalledWith('tenant-1', 'Active')
  })

  it('throws InvalidStateTransitionError when not in Provisioning, without persisting', async () => {
    const db = fakeDb()
    await expect(createActivateStep(db).run(ctx('Registered'))).rejects.toThrow(InvalidStateTransitionError)
    expect(db.setTenantState).not.toHaveBeenCalled()
  })

  it('compensate reverts tenant state to Provisioning (never leaves it Active)', async () => {
    const db = fakeDb()
    await createActivateStep(db).compensate(ctx('Provisioning'))
    expect(db.setTenantState).toHaveBeenCalledWith('tenant-1', 'Provisioning')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/activate.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write the implementation**

```typescript
import type { ProvisioningStep, ProvisioningContext, ProvisioningDb } from '@/lib/tenant/provisioning/types'
import { transition } from '@/lib/tenant/stateMachine'

/**
 * activate — the ONLY step that makes a tenant routable. Validates the transition
 * with the state machine, then persists Active. Compensation reverts to Provisioning
 * so rollback can never leave a tenant Active.
 */
export function createActivateStep(db: ProvisioningDb): ProvisioningStep {
  return {
    name: 'activate',
    maxAttempts: 2,
    async run(ctx: ProvisioningContext): Promise<void> {
      // throws InvalidStateTransitionError (fatal) if not Provisioning
      const next = transition(ctx.tenant.state, 'Active')
      await db.setTenantState(ctx.tenant.id, next)
    },
    async compensate(ctx: ProvisioningContext): Promise<void> {
      await db.setTenantState(ctx.tenant.id, 'Provisioning')
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/activate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tenant/provisioning/steps/activate.ts test/unit/lib/tenant/provisioning/steps/activate.test.ts
git commit -m "feat(provisioning): activate step (EVE-45)"
```

---

## Task 15: Orchestrator

**Files:**
- Create: `lib/tenant/provisioning/orchestrator.ts`
- Test: `test/unit/lib/tenant/provisioning/orchestrator.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { ProvisioningOrchestrator } from '@/lib/tenant/provisioning/orchestrator'
import { RetryableProvisioningError, ManualInterventionError } from '@/lib/tenant/provisioning/errors'
import type {
  ProvisioningStep,
  ProvisioningRunStore,
  ProvisioningContext,
  ProvisioningRun,
  ProvisioningStepName,
  StepRecordStatus,
} from '@/lib/tenant/provisioning/types'
import type { Tenant } from '@/lib/tenant/types'

const TENANT: Tenant = {
  id: 'tenant-1', owner_id: 'o', name: 'T', state: 'Provisioning',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
function ctx(): ProvisioningContext {
  return { tenant: TENANT, byodbInput: { kind: 'structured', params: { engine: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u', password: 'p' } } }
}

/** In-memory run store that records the final status and step records. */
function memStore() {
  const recorded: { step: ProvisioningStepName; status: StepRecordStatus; attempts: number }[] = []
  let runStatus: ProvisioningRun['status'] = 'Running'
  const store: ProvisioningRunStore = {
    createRun: vi.fn().mockResolvedValue({ runId: 'run-1' }),
    recordStep: vi.fn().mockImplementation(async (_r, step, status, attempts) => {
      recorded.push({ step, status, attempts })
    }),
    setRunStatus: vi.fn().mockImplementation(async (_r, s) => { runStatus = s }),
    getRun: vi.fn().mockImplementation(async () => ({
      runId: 'run-1', tenantId: 'tenant-1', status: runStatus,
      steps: recorded.filter(r => r.status === 'Completed' || r.status === 'Failed').map(r => ({ name: r.step, status: r.status, attempts: r.attempts })),
    })),
    getLatestRunForTenant: vi.fn(),
  }
  return { store, recorded, getStatus: () => runStatus }
}

/** Configurable fake step recording run/compensate calls. */
function fakeStep(
  name: ProvisioningStepName,
  behavior: { fail?: () => Error; failTimes?: number; maxAttempts?: number },
  log: string[],
): ProvisioningStep {
  let calls = 0
  return {
    name,
    maxAttempts: behavior.maxAttempts ?? 3,
    async run() {
      calls++
      log.push(`run:${name}:${calls}`)
      if (behavior.fail && calls <= (behavior.failTimes ?? Infinity)) throw behavior.fail()
    },
    async compensate() { log.push(`compensate:${name}`) },
  }
}

describe('ProvisioningOrchestrator', () => {
  it('runs all steps in order and ends Provisioned', async () => {
    const log: string[] = []
    const { store, getStatus } = memStore()
    const steps = [fakeStep('seed_config', {}, log), fakeStep('activate', {}, log)]
    const orch = new ProvisioningOrchestrator(steps, store)

    const run = await orch.provision(ctx())

    expect(log).toEqual(['run:seed_config:1', 'run:activate:1'])
    expect(getStatus()).toBe('Provisioned')
    expect(run.status).toBe('Provisioned')
  })

  it('retries a retryable failure then succeeds', async () => {
    const log: string[] = []
    const { store, recorded } = memStore()
    const steps = [fakeStep('seed_config', { fail: () => new RetryableProvisioningError('x'), failTimes: 1, maxAttempts: 3 }, log)]
    const orch = new ProvisioningOrchestrator(steps, store)

    await orch.provision(ctx())

    expect(log).toEqual(['run:seed_config:1', 'run:seed_config:2'])
    const completed = recorded.find(r => r.step === 'seed_config' && r.status === 'Completed')
    expect(completed?.attempts).toBe(2)
  })

  it('rolls back completed steps in reverse on a fatal failure', async () => {
    const log: string[] = []
    const { store, getStatus } = memStore()
    const steps = [
      fakeStep('seed_config', {}, log),
      fakeStep('bootstrap_metering', {}, log),
      fakeStep('activate', { fail: () => new Error('boom'), maxAttempts: 1 }, log),
    ]
    const orch = new ProvisioningOrchestrator(steps, store)

    const run = await orch.provision(ctx())

    expect(log).toEqual([
      'run:seed_config:1', 'run:bootstrap_metering:1', 'run:activate:1',
      'compensate:bootstrap_metering', 'compensate:seed_config',
    ])
    expect(getStatus()).toBe('RolledBack')
    expect(run.status).toBe('RolledBack')
  })

  it('rolls back when a retryable failure exhausts maxAttempts', async () => {
    const log: string[] = []
    const { store, getStatus } = memStore()
    const steps = [
      fakeStep('seed_config', {}, log),
      fakeStep('bootstrap_metering', { fail: () => new RetryableProvisioningError('x'), maxAttempts: 2 }, log),
    ]
    const orch = new ProvisioningOrchestrator(steps, store)

    await orch.provision(ctx())

    expect(log).toEqual([
      'run:seed_config:1', 'run:bootstrap_metering:1', 'run:bootstrap_metering:2',
      'compensate:seed_config',
    ])
    expect(getStatus()).toBe('RolledBack')
  })

  it('halts at AwaitingManualIntervention WITHOUT rolling back', async () => {
    const log: string[] = []
    const { store, getStatus } = memStore()
    const steps = [
      fakeStep('seed_config', {}, log),
      fakeStep('bind_byodb', { fail: () => new ManualInterventionError('grant access'), maxAttempts: 1 }, log),
      fakeStep('activate', {}, log),
    ]
    const orch = new ProvisioningOrchestrator(steps, store)

    const run = await orch.provision(ctx())

    expect(log).toEqual(['run:seed_config:1', 'run:bind_byodb:1'])
    expect(log).not.toContain('compensate:seed_config')
    expect(getStatus()).toBe('AwaitingManualIntervention')
    expect(run.status).toBe('AwaitingManualIntervention')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/tenant/provisioning/orchestrator.test.ts`
Expected: FAIL — cannot resolve `orchestrator`.

- [ ] **Step 3: Write the implementation**

```typescript
import type {
  ProvisioningStep,
  ProvisioningContext,
  ProvisioningRun,
  ProvisioningRunStore,
} from '@/lib/tenant/provisioning/types'
import { classifyError } from '@/lib/tenant/provisioning/errors'
import { type AuditSink, noopAuditSink } from '@/lib/tenant/provisioning/audit'

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Runs provisioning steps in order with per-step retry, manual-intervention halt,
 * and reverse-order rollback. `activate` must be the last step so any earlier
 * failure leaves the tenant non-routable.
 */
export class ProvisioningOrchestrator {
  constructor(
    private readonly steps: ProvisioningStep[],
    private readonly runStore: ProvisioningRunStore,
    private readonly audit: AuditSink = noopAuditSink,
  ) {}

  async provision(ctx: ProvisioningContext): Promise<ProvisioningRun> {
    const tenantId = ctx.tenant.id
    const { runId } = await this.runStore.createRun(tenantId)
    await this.audit.record({ tenantId, runId, action: 'run.start', outcome: 'ok', at: nowIso() })

    const completed: ProvisioningStep[] = []

    for (const step of this.steps) {
      let attempts = 0
      // attempt loop
      // eslint-disable-next-line no-constant-condition
      while (true) {
        attempts++
        await this.runStore.recordStep(runId, step.name, 'Running', attempts)
        try {
          await step.run(ctx)
          await this.runStore.recordStep(runId, step.name, 'Completed', attempts)
          await this.audit.record({ tenantId, runId, step: step.name, action: 'step.complete', outcome: 'ok', at: nowIso() })
          completed.push(step)
          break
        } catch (err) {
          const { retryable, manual } = classifyError(err)
          const message = err instanceof Error ? err.message : String(err)

          if (retryable && attempts < step.maxAttempts) {
            await this.audit.record({ tenantId, runId, step: step.name, action: 'step.retry', outcome: 'error', error: message, at: nowIso() })
            continue
          }

          await this.runStore.recordStep(runId, step.name, 'Failed', attempts, message)
          await this.audit.record({ tenantId, runId, step: step.name, action: 'step.fail', outcome: 'error', error: message, at: nowIso() })

          if (manual) {
            await this.runStore.setRunStatus(runId, 'AwaitingManualIntervention')
            await this.audit.record({ tenantId, runId, step: step.name, action: 'run.manual', outcome: 'error', error: message, at: nowIso() })
            return this.finalRun(runId, tenantId)
          }

          await this.rollback(completed, ctx, runId)
          await this.runStore.setRunStatus(runId, 'RolledBack')
          await this.audit.record({ tenantId, runId, step: step.name, action: 'run.rollback', outcome: 'error', error: message, at: nowIso() })
          return this.finalRun(runId, tenantId)
        }
      }
    }

    await this.runStore.setRunStatus(runId, 'Provisioned')
    await this.audit.record({ tenantId, runId, action: 'run.complete', outcome: 'ok', at: nowIso() })
    return this.finalRun(runId, tenantId)
  }

  private async rollback(completed: ProvisioningStep[], ctx: ProvisioningContext, runId: string): Promise<void> {
    for (const step of [...completed].reverse()) {
      try {
        await step.compensate(ctx)
        await this.runStore.recordStep(runId, step.name, 'Compensated', 0)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        // Best-effort: log via audit and keep compensating the rest.
        await this.audit.record({
          tenantId: ctx.tenant.id, runId, step: step.name,
          action: 'compensate.fail', outcome: 'error', error: message, at: nowIso(),
        })
      }
    }
  }

  private async finalRun(runId: string, tenantId: string): Promise<ProvisioningRun> {
    const run = await this.runStore.getRun(runId)
    return run ?? { runId, tenantId, status: 'RolledBack', steps: [] }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/tenant/provisioning/orchestrator.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tenant/provisioning/orchestrator.ts test/unit/lib/tenant/provisioning/orchestrator.test.ts
git commit -m "feat(provisioning): orchestrator with retry, rollback, manual-intervention (EVE-45)"
```

---

## Task 16: Supabase ProvisioningDb implementation

**Files:**
- Create: `lib/tenant/provisioning/supabaseProvisioningDb.ts`

No new unit test (thin Supabase adapter, exercised by the E2E in Task 19; the interface contract is covered by the step unit tests with a fake). Verify it compiles.

- [ ] **Step 1: Write the implementation**

```typescript
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProvisioningDb } from '@/lib/tenant/provisioning/types'
import type { TenantState } from '@/lib/tenant/types'

/**
 * Supabase-backed ProvisioningDb. Constructed with a SERVICE-ROLE client
 * (RLS-bypassing) — provisioning writes are platform operations. Every method is
 * scoped by tenantId so one tenant's provisioning can never touch another's rows.
 */
export class SupabaseProvisioningDb implements ProvisioningDb {
  constructor(private readonly client: SupabaseClient) {}

  async seedConfig(tenantId: string, settings: Record<string, string>): Promise<void> {
    const { error } = await this.client
      .from('tenant_config')
      .upsert({ tenant_id: tenantId, settings }, { onConflict: 'tenant_id' })
    if (error) throw new Error(`seedConfig failed: ${error.message}`)
  }

  async deleteConfig(tenantId: string): Promise<void> {
    const { error } = await this.client.from('tenant_config').delete().eq('tenant_id', tenantId)
    if (error) throw new Error(`deleteConfig failed: ${error.message}`)
  }

  async setFeatureFlags(tenantId: string, flags: Record<string, boolean>): Promise<void> {
    const { error } = await this.client.from('tenants').update({ feature_flags: flags }).eq('id', tenantId)
    if (error) throw new Error(`setFeatureFlags failed: ${error.message}`)
  }

  async initMetering(tenantId: string, quotaBytes: number): Promise<void> {
    const { error } = await this.client
      .from('tenant_storage_metering')
      .upsert({ tenant_id: tenantId, bytes_used: 0, quota_bytes: quotaBytes }, { onConflict: 'tenant_id' })
    if (error) throw new Error(`initMetering failed: ${error.message}`)
  }

  async deleteMetering(tenantId: string): Promise<void> {
    const { error } = await this.client.from('tenant_storage_metering').delete().eq('tenant_id', tenantId)
    if (error) throw new Error(`deleteMetering failed: ${error.message}`)
  }

  async setTenantState(tenantId: string, state: TenantState): Promise<void> {
    const { error } = await this.client.from('tenants').update({ state }).eq('id', tenantId)
    if (error) throw new Error(`setTenantState failed: ${error.message}`)
  }

  async hasConfig(tenantId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('tenant_config').select('tenant_id').eq('tenant_id', tenantId).maybeSingle()
    if (error) throw new Error(`hasConfig failed: ${error.message}`)
    return data !== null
  }

  async hasMetering(tenantId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('tenant_storage_metering').select('tenant_id').eq('tenant_id', tenantId).maybeSingle()
    if (error) throw new Error(`hasMetering failed: ${error.message}`)
    return data !== null
  }

  async getFeatureFlags(tenantId: string): Promise<Record<string, boolean> | null> {
    const { data, error } = await this.client
      .from('tenants').select('feature_flags').eq('id', tenantId).maybeSingle()
    if (error) throw new Error(`getFeatureFlags failed: ${error.message}`)
    return (data?.feature_flags as Record<string, boolean> | undefined) ?? null
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/tenant/provisioning/supabaseProvisioningDb.ts
git commit -m "feat(provisioning): Supabase ProvisioningDb adapter (EVE-45)"
```

---

## Task 17: Supabase ProvisioningRunStore implementation

**Files:**
- Create: `lib/tenant/provisioning/supabaseRunStore.ts`

- [ ] **Step 1: Write the implementation**

```typescript
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ProvisioningRunStore,
  ProvisioningRun,
  ProvisioningRunStatus,
  ProvisioningStepName,
  StepRecordStatus,
  StepRecord,
} from '@/lib/tenant/provisioning/types'

/** Supabase-backed run store (service-role client). */
export class SupabaseProvisioningRunStore implements ProvisioningRunStore {
  constructor(private readonly client: SupabaseClient) {}

  async createRun(tenantId: string): Promise<{ runId: string }> {
    const { data, error } = await this.client
      .from('provisioning_runs')
      .insert({ tenant_id: tenantId, status: 'Running' })
      .select('id')
      .single()
    if (error || !data) throw new Error(`createRun failed: ${error?.message ?? 'no id'}`)
    return { runId: data.id as string }
  }

  async recordStep(
    runId: string,
    step: ProvisioningStepName,
    status: StepRecordStatus,
    attempts: number,
    error?: string,
  ): Promise<void> {
    // One row per (run, step); upsert so retries update the same row.
    const { error: upsertError } = await this.client
      .from('provisioning_run_steps')
      .upsert(
        { run_id: runId, step_name: step, status, attempts, error: error ?? null },
        { onConflict: 'run_id,step_name' },
      )
    if (upsertError) throw new Error(`recordStep failed: ${upsertError.message}`)
  }

  async setRunStatus(runId: string, status: ProvisioningRunStatus): Promise<void> {
    const { error } = await this.client.from('provisioning_runs').update({ status }).eq('id', runId)
    if (error) throw new Error(`setRunStatus failed: ${error.message}`)
  }

  async getRun(runId: string): Promise<ProvisioningRun | null> {
    const { data: run, error } = await this.client
      .from('provisioning_runs').select('id, tenant_id, status').eq('id', runId).maybeSingle()
    if (error) throw new Error(`getRun failed: ${error.message}`)
    if (!run) return null

    const { data: steps, error: stepsError } = await this.client
      .from('provisioning_run_steps')
      .select('step_name, status, attempts, error')
      .eq('run_id', runId)
    if (stepsError) throw new Error(`getRun steps failed: ${stepsError.message}`)

    return {
      runId: run.id as string,
      tenantId: run.tenant_id as string,
      status: run.status as ProvisioningRunStatus,
      steps: (steps ?? []).map(
        (s): StepRecord => ({
          name: s.step_name as ProvisioningStepName,
          status: s.status as StepRecordStatus,
          attempts: s.attempts as number,
          error: (s.error as string | null) ?? undefined,
        }),
      ),
    }
  }

  async getLatestRunForTenant(tenantId: string): Promise<ProvisioningRun | null> {
    const { data, error } = await this.client
      .from('provisioning_runs')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`getLatestRunForTenant failed: ${error.message}`)
    if (!data) return null
    return this.getRun(data.id as string)
  }
}
```

- [ ] **Step 2: Add the unique constraint the upsert relies on**

The `recordStep` upsert uses `onConflict: 'run_id,step_name'`. Add a matching unique constraint via a new migration: `supabase/migrations/20260629120003_provisioning_run_steps_unique.sql`

```sql
-- EVE-45: one row per (run, step) so the run store can upsert step progress.
ALTER TABLE public.provisioning_run_steps
  ADD CONSTRAINT provisioning_run_steps_run_step_unique UNIQUE (run_id, step_name);
```

- [ ] **Step 3: Apply migration locally**

Run: `make db-reset`
Expected: completes without error.

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/tenant/provisioning/supabaseRunStore.ts supabase/migrations/20260629120003_provisioning_run_steps_unique.sql
git commit -m "feat(provisioning): Supabase run store + unique (run,step) constraint (EVE-45)"
```

---

## Task 18: Orchestrator builder (wire real dependencies)

**Files:**
- Create: `lib/tenant/provisioning/buildOrchestrator.ts`

- [ ] **Step 1: Write the implementation**

```typescript
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ProvisioningOrchestrator } from '@/lib/tenant/provisioning/orchestrator'
import { SupabaseProvisioningDb } from '@/lib/tenant/provisioning/supabaseProvisioningDb'
import { SupabaseProvisioningRunStore } from '@/lib/tenant/provisioning/supabaseRunStore'
import { createBindByodbStep } from '@/lib/tenant/provisioning/steps/bindByodb'
import { createSeedConfigStep } from '@/lib/tenant/provisioning/steps/seedConfig'
import { createBootstrapFeatureFlagsStep } from '@/lib/tenant/provisioning/steps/bootstrapFeatureFlags'
import { createBootstrapMeteringStep } from '@/lib/tenant/provisioning/steps/bootstrapMetering'
import { createReadinessGateStep } from '@/lib/tenant/provisioning/steps/readinessGate'
import { createActivateStep } from '@/lib/tenant/provisioning/steps/activate'
import { RealConnectivityProbe } from '@/lib/tenant/probeDriver'
import { SupabaseVaultStore } from '@/lib/tenant/vaultStore'
import { noopAuditSink, type AuditSink } from '@/lib/tenant/provisioning/audit'

/**
 * Wires the full provisioning step list + Supabase-backed store/db into a
 * ready-to-run orchestrator. `admin` MUST be a service-role client.
 * EVE-55 will pass a real AuditSink here in place of the no-op default.
 */
export function buildOrchestrator(admin: SupabaseClient, audit: AuditSink = noopAuditSink): ProvisioningOrchestrator {
  const db = new SupabaseProvisioningDb(admin)
  const store = new SupabaseProvisioningRunStore(admin)

  const steps = [
    createBindByodbStep(new RealConnectivityProbe(), new SupabaseVaultStore(admin)),
    createSeedConfigStep(db),
    createBootstrapFeatureFlagsStep(db),
    createBootstrapMeteringStep(db),
    createReadinessGateStep(db),
    createActivateStep(db),
  ]

  return new ProvisioningOrchestrator(steps, store, audit)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/tenant/provisioning/buildOrchestrator.ts
git commit -m "feat(provisioning): orchestrator builder wiring real deps (EVE-45)"
```

---

## Task 19: API route — provision a tenant (platform_admin)

**Files:**
- Create: `app/api/platform/tenants/[tenantId]/provision/route.ts`

This follows the auth/role/state-guard pattern from `app/api/board/settings/byodb/route.ts`, but the role guard is `platform_admin` and it delegates the full sequence to the orchestrator.

- [ ] **Step 1: Write the route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { buildOrchestrator } from '@/lib/tenant/provisioning/buildOrchestrator'
import { transition } from '@/lib/tenant/stateMachine'
import type { ProvisioningContext } from '@/lib/tenant/provisioning/types'
import type { BYODBCredentialInput } from '@/lib/tenant/credentials'
import type { Tenant, TenantState } from '@/lib/tenant/types'

/** Maps a run status to an HTTP status code. */
function statusToHttp(runStatus: string): number {
  switch (runStatus) {
    case 'Provisioned': return 200
    case 'AwaitingManualIntervention': return 202
    case 'RolledBack': return 409
    default: return 500
  }
}

async function requirePlatformAdmin(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'platform_admin') {
    return { error: NextResponse.json({ error: 'Forbidden — platform_admin role required' }, { status: 403 }) }
  }
  return { user }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params

  const guard = await requirePlatformAdmin(req)
  if ('error' in guard) return guard.error

  const admin = createServiceClient()

  // Resolve tenant from the control plane — never trust the body for identity.
  const { data: tenant } = await admin.from('tenants').select('*').eq('id', tenantId).single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  if (tenant.state !== 'Registered' && tenant.state !== 'Provisioning') {
    return NextResponse.json(
      { error: `Cannot provision a tenant in state ${tenant.state}` },
      { status: 400 },
    )
  }

  // Parse credentials from the body.
  let byodbInput: unknown
  try {
    byodbInput = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Move Registered → Provisioning before running the orchestrator.
  let workingTenant: Tenant = { ...(tenant as Tenant) }
  if (tenant.state === 'Registered') {
    transition(tenant.state as TenantState, 'Provisioning') // validates; throws on invalid
    const { error: tErr } = await admin.from('tenants').update({ state: 'Provisioning' }).eq('id', tenantId)
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })
    workingTenant = { ...workingTenant, state: 'Provisioning' }
  }

  const ctx: ProvisioningContext = {
    tenant: workingTenant,
    byodbInput: byodbInput as BYODBCredentialInput,
  }

  const orchestrator = buildOrchestrator(admin)
  const run = await orchestrator.provision(ctx)

  return NextResponse.json(
    { runId: run.runId, status: run.status, steps: run.steps },
    { status: statusToHttp(run.status) },
  )
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params

  const guard = await requirePlatformAdmin(req)
  if ('error' in guard) return guard.error

  const admin = createServiceClient()
  const orchestrator = buildOrchestrator(admin)
  // getLatestRunForTenant lives on the run store; reach it through a fresh store.
  const { SupabaseProvisioningRunStore } = await import('@/lib/tenant/provisioning/supabaseRunStore')
  const store = new SupabaseProvisioningRunStore(admin)
  const run = await store.getLatestRunForTenant(tenantId)
  void orchestrator // builder validated wiring; store is the read path

  if (!run) return NextResponse.json({ error: 'No provisioning run found' }, { status: 404 })
  return NextResponse.json(run)
}
```

> Note on the GET handler: it only needs the run store, not the full orchestrator. If you prefer, drop the `buildOrchestrator`/`void orchestrator` lines and construct `SupabaseProvisioningRunStore` directly — both are correct; the direct construction is cleaner. Keep whichever passes `npx tsc --noEmit` and lint.

- [ ] **Step 2: Verify it compiles and lints**

Run: `npx tsc --noEmit && npx eslint app/api/platform/tenants/[tenantId]/provision/route.ts`
Expected: exit 0, no errors. (If lint flags `void orchestrator`, apply the cleaner GET from the note above.)

- [ ] **Step 3: Commit**

```bash
git add "app/api/platform/tenants/[tenantId]/provision/route.ts"
git commit -m "feat(provisioning): platform_admin provision API route (EVE-45)"
```

---

## Task 20: E2E — auth guards, safe-failure, and tenant isolation

**Files:**
- Create: `e2e/tests/platform/tenant-provisioning.spec.ts`

**Prerequisites (document at top of run):** running app + staging Supabase with the new migrations applied; existing auth storage states (`e2e/.auth/platform-admin.json`, `e2e/.auth/driver.json`) produced by E2E global setup. These tests use a deliberately unreachable BYODB host so provisioning fails deterministically without a real external database — proving the "no routable partial tenant" invariant.

- [ ] **Step 1: Write the E2E spec**

```typescript
import { test, expect } from '../../fixtures/index'
import { adminClient } from '../../helpers/supabase.admin'

/**
 * EVE-45 — tenant provisioning API.
 * Uses an unreachable BYODB host so bind_byodb fails (retryable → exhausts →
 * rollback), proving a failed provision never leaves a routable (Active) tenant.
 */

const UNREACHABLE_BYODB = {
  kind: 'structured',
  params: {
    engine: 'postgres',
    host: '203.0.113.1', // TEST-NET-3, guaranteed unroutable
    port: 5432,
    database: 'nope',
    user: 'u',
    password: 'p',
  },
}

async function createRegisteredTenant(name: string): Promise<string> {
  const { data, error } = await adminClient
    .from('tenants')
    .insert({ name, state: 'Registered' })
    .select('id')
    .single()
  if (error) throw new Error(`createRegisteredTenant failed: ${error.message}`)
  return data.id
}

async function deleteTenant(id: string): Promise<void> {
  await adminClient.from('tenants').delete().eq('id', id)
}

test.describe('provision API — auth guards', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('POST requires auth (401)', async ({ page }) => {
    const res = await page.request.post('/api/platform/tenants/00000000-0000-0000-0000-000000000000/provision', {
      data: UNREACHABLE_BYODB,
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('provision API — non platform_admin forbidden', () => {
  test.use({ storageState: 'e2e/.auth/driver.json' })

  test('driver POST → 403', async ({ page }) => {
    const res = await page.request.post('/api/platform/tenants/00000000-0000-0000-0000-000000000000/provision', {
      data: UNREACHABLE_BYODB,
    })
    expect(res.status()).toBe(403)
  })
})

test.describe('provision API — safe failure & isolation', () => {
  test.use({ storageState: 'e2e/.auth/platform-admin.json' })

  test('failed BYODB provisioning rolls back and leaves tenant non-routable', async ({ page }) => {
    const tenantId = await createRegisteredTenant('E2E Provision Fail')
    try {
      const res = await page.request.post(`/api/platform/tenants/${tenantId}/provision`, {
        data: UNREACHABLE_BYODB,
      })
      // Rolled back → 409
      expect(res.status()).toBe(409)
      const body = await res.json()
      expect(body.status).toBe('RolledBack')

      // Invariant: tenant must NOT be Active.
      const { data: tenant } = await adminClient.from('tenants').select('state').eq('id', tenantId).single()
      expect(tenant?.state).not.toBe('Active')
    } finally {
      await deleteTenant(tenantId)
    }
  })

  test('provisioning one tenant does not change another tenant config/flags/metering', async ({ page }) => {
    const tenantA = await createRegisteredTenant('E2E Tenant A')
    const tenantB = await createRegisteredTenant('E2E Tenant B')
    try {
      // Provision A (will fail at BYODB and roll back).
      await page.request.post(`/api/platform/tenants/${tenantA}/provision`, { data: UNREACHABLE_BYODB })

      // B must have NO provisioning artifacts created.
      const { data: bConfig } = await adminClient.from('tenant_config').select('tenant_id').eq('tenant_id', tenantB).maybeSingle()
      const { data: bMeter } = await adminClient.from('tenant_storage_metering').select('tenant_id').eq('tenant_id', tenantB).maybeSingle()
      expect(bConfig).toBeNull()
      expect(bMeter).toBeNull()

      const { data: bTenant } = await adminClient.from('tenants').select('state').eq('id', tenantB).single()
      expect(bTenant?.state).toBe('Registered')
    } finally {
      await deleteTenant(tenantA)
      await deleteTenant(tenantB)
    }
  })
})
```

- [ ] **Step 2: Run the E2E suite**

Run: `make e2e` (or `npx playwright test e2e/tests/platform/tenant-provisioning.spec.ts`)
Expected: 4 tests pass. The two unauthenticated/role tests pass even without DB writes; the safe-failure and isolation tests require staging Supabase with migrations applied.

> If the staging Supabase env is unavailable (see project STATE.md known blocker), mark the two DB-dependent tests `test.fixme(...)` with a comment referencing the env blocker, keep the 401/403 guard tests active, and note the deferral in the PR description. Do not delete them.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/platform/tenant-provisioning.spec.ts
git commit -m "test(provisioning): E2E auth guards, safe rollback, tenant isolation (EVE-45)"
```

---

## Task 21: Full verification

- [ ] **Step 1: Run the whole unit suite**

Run: `npx vitest run test/unit/lib/tenant/provisioning`
Expected: all provisioning unit tests pass (errors, 6 steps, orchestrator).

- [ ] **Step 2: Typecheck + lint the whole project**

Run: `npx tsc --noEmit && npx eslint .`
Expected: exit 0.

- [ ] **Step 3: Run the complete local CI gate**

Run: `make check`
Expected: lint, test, tokens, build all pass.

- [ ] **Step 4: Commit any fixups, then push the branch**

```bash
git push -u origin feature/eve-45-design-tenant-provisioning-workflow
```

> The work should be done on branch `feature/eve-45-design-tenant-provisioning-workflow` (the suggested branch). Create it from up-to-date `main` at execution time per superpowers:using-git-worktrees before Task 1.

---

## Self-Review

**1. Spec coverage (EVE-45 acceptance criteria):**

| Spec requirement | Covered by |
|---|---|
| Provisioning sequence register→activation+readiness | Tasks 9–14 (steps), 15 (orchestrator), 19 (route) |
| BYODB connection registration + secret binding | Task 9 (bind_byodb) — reuses probe + vault |
| Configuration seeding | Task 3 (migration) + Task 10 (seed_config) |
| Feature flag bootstrap | Task 11 (bootstrap_feature_flags) |
| Storage metering bootstrap (minimal) | Task 4 (migration) + Task 12 (bootstrap_metering) |
| Operational checkpoints / retry / rollback / manual intervention | Task 15 (orchestrator) |
| Dependencies on control-plane/routing/deploy orchestration | Task 1 (design doc) |
| Tenant-scoped context + audited admin permissions | Task 19 (platform_admin guard + service client); audit seam Task 8 |
| No cross-tenant leak in bootstrap/config/secret | Per-tenant scoping in Task 16; verified Task 20 isolation test |
| BYODB creds validated, never logged/shared | Task 9 (probe before store, Vault-only); `ProvisioningAuditEvent` forbids secret values (Task 8) |
| Partial tenants not routable | activate is last step (Task 14); orchestrator never sets Active on failure (Task 15); verified Task 20 |
| Unit: orchestration, retries, rollback, invalid input | Task 15 (orchestrator), Task 9 (invalid input), Task 7 (classification) |
| Unit: tenant-scoped secret resolution + config generation | Tasks 9, 10 |
| Unit: flags/metering bootstrap only for intended tenant | Tasks 11, 12 (assert tenantId), Task 20 isolation |
| Unit: readiness gate before activation | Task 13 |
| E2E: success path through activation | Documented in Task 20 prereqs; full happy-path needs a real reachable BYODB (noted). Failure/rollback/isolation fully automated |
| E2E: failed steps → safe rollback, no routable partial | Task 20 safe-failure test |
| E2E: BYODB connectivity validated before activation | Task 9 ordering + Task 20 (unreachable host blocks activation) |
| E2E: isolation across tenants | Task 20 isolation test |
| Audit requirements documented | Task 1 + Task 8 seam (build deferred to EVE-55 per decision) |

**Known scope notes (intentional, per decisions taken before planning):**
- **Audit log table deferred to EVE-55** — this plan ships the `AuditSink` seam + `noopAuditSink`, not a durable table. The audit *requirements* are documented (Task 1).
- **Storage metering is a bootstrap-only row** (zeroed usage + quota); real accounting is a later ticket.
- **Manual-intervention resume endpoint** is not built in V1 — the run is recorded as `AwaitingManualIntervention`; resuming is a follow-up. Noted in the design doc.
- **Happy-path E2E through activation** requires a reachable test BYODB; the automated E2E proves the failure/rollback/isolation invariants deterministically and documents the happy-path prerequisite.

**2. Placeholder scan:** No `TODO`/`TBD`/"add error handling"/"similar to Task N" — every code step contains complete code. Two explicit operator notes (Task 19 GET cleanliness, Task 20 env-blocker fixme) describe concrete alternatives, not placeholders.

**3. Type consistency:** `ProvisioningStepName`, `ProvisioningRunStatus`, `StepRecordStatus`, `ProvisioningStep`, `ProvisioningContext`, `ProvisioningDb`, `ProvisioningRunStore`, `ProvisioningRun`, `AuditSink` are defined once (Tasks 6, 8) and used with identical signatures everywhere. Step factory names (`createBindByodbStep`, `createSeedConfigStep`, `createBootstrapFeatureFlagsStep`, `createBootstrapMeteringStep`, `createReadinessGateStep`, `createActivateStep`) match between definition, tests, and `buildOrchestrator` (Task 18). `ProvisioningDb` method set is identical across the interface (Task 6), all step fakes, and the Supabase impl (Task 16). `recordStep`'s `onConflict: 'run_id,step_name'` is backed by the unique constraint added in Task 17.
