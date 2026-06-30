# Audit Logging & Compliance Traceability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every sensitive platform operation (provisioning, tenant lifecycle/override, credential rotation, and tenant config changes) emit a durable, tamper-evident, tenant-scoped audit record that enterprise reviewers can retrieve without leaking another tenant's data.

**Architecture:** A single append-only `public.audit_logs` table whose tamper-evidence is enforced in the database itself: a `BEFORE INSERT` trigger builds a SHA-256 hash chain (each row hashes `prev_hash || canonical(row)`), and a `BEFORE UPDATE/DELETE` trigger rejects every mutation except an authorized purge. A small application layer (`lib/audit/`) provides a strict recorder (validates fields, redacts sensitive values, inserts via the service-role client) plus two best-effort adapters that satisfy the **existing** no-op sink interfaces (`AuditSink`, `ControlPlaneAuditSink`) without changing any service signature. Read access is a tenant-scoped query API: platform admins read any tenant's log via a path-scoped admin query; tenant owners read only their own via RLS-enforced queries.

**Tech Stack:** Next.js 16 App Router route handlers · Supabase (PostgreSQL + RLS + pgcrypto) · TypeScript · Vitest (unit + integration) · Playwright (E2E).

---

## Background: what already exists (read before starting)

The codebase already declares two **no-op** audit sinks that explicitly defer to this issue (EVE-55):

- `lib/tenant/provisioning/audit.ts` — `ProvisioningAuditEvent` + `AuditSink` (+ `noopAuditSink`). Injected via `buildOrchestrator(admin, audit)` (`lib/tenant/provisioning/buildOrchestrator.ts:21`). The orchestrator already wraps every emit in `safeAudit` so a sink throw can never break provisioning (`lib/tenant/provisioning/orchestrator.ts:26-32`).
- `lib/tenant/controlplane/audit.ts` — `ControlPlaneAuditEvent` + `ControlPlaneAuditSink` (+ `noopControlPlaneAuditSink`). Injected via `TenantLifecycleService` ctor (`lib/tenant/controlplane/lifecycleService.ts:25`) and `CredentialRotationService` ctor (`lib/tenant/controlplane/credentialRotation.ts:31`).

Board config routes (`app/api/board/settings/branding/route.ts`, `.../toggles/route.ts`, `.../byodb/route.ts`) currently emit **no** audit at all.

**Design rules taken from the codebase:**
- Service-role client (`createServiceClient()`, `lib/supabase/service.ts`) bypasses RLS but **not** triggers — perfect for audit writes that must still be append-only.
- RLS user client (`createClient()`, `lib/supabase/server.ts`) enforces tenant isolation — use it for the tenant-owner read path.
- Roles live in `public.users.role` ∈ `{manager, board, driver, platform_admin}`; `get_my_role()` helper exists (`supabase/migrations/20240101000000_initial_schema.sql`).
- Migrations: `YYYYMMDDHHMM_description.sql`, latest is `20260629120003_*`. New file uses `20260630120000_`.
- "Audit is observability — it must never break the operation" (`orchestrator.ts:30`). Adapters and route call-sites are therefore best-effort; the strict core recorder still throws so it is unit-testable.
- **NEVER** put raw credentials/secrets in an audit record — only `vault_secret_id` references (`provisioning/audit.ts:4-5`, `controlplane/audit.ts:4-5`).

**Key design decisions (confirmed):** hash-chain **and** append-only trigger; instrument **all** sensitive ops (existing sinks + board config); retention = documented policy + a tested `purge_audit_logs()` function (no scheduler this issue); evidence retrieval = query API only (no UI).

**Forensic decoupling:** `audit_logs.tenant_id` and `actor_id` are plain `UUID` columns with **no foreign key**. Audit evidence must outlive the entities it references, and FK `ON DELETE CASCADE/SET NULL` would either destroy evidence or require the row mutations the append-only trigger forbids. Attribution survives entity deletion via the immutable `actor_label`/`actor_role` snapshots.

---

## File Structure

**New application files (`lib/audit/`):**
- `lib/audit/types.ts` — `AuditActor`, `AuditAction`, `AuditRecordInput`, `AuditRecorder` interface, `AuditValidationError`, `isUuid()`.
- `lib/audit/redact.ts` — `redactSensitive(details)` deep-masks sensitive keys.
- `lib/audit/supabaseAuditRecorder.ts` — `SupabaseAuditRecorder` (strict: validates, redacts, inserts; throws on bad input/DB error).
- `lib/audit/controlPlaneAuditSink.ts` — `DurableControlPlaneAuditSink` implements existing `ControlPlaneAuditSink` (best-effort adapter).
- `lib/audit/provisioningAuditSink.ts` — `DurableProvisioningAuditSink` implements existing `AuditSink` (best-effort adapter).
- `lib/audit/query.ts` — `queryAuditLogs(client, filters)` keyset pagination + filters.
- `lib/audit/safeRecord.ts` — `safeRecord(recorder, input)` best-effort wrapper for route call-sites.

**New API routes:**
- `app/api/platform/tenants/[tenantId]/audit/route.ts` — platform-admin read (any tenant, path-scoped).
- `app/api/board/audit-log/route.ts` — tenant-owner read (RLS-enforced).

**New migration:**
- `supabase/migrations/20260630120000_create_audit_logs.sql` — table, hash-chain insert trigger, append-only trigger, `verify_audit_chain()`, `purge_audit_logs()`, RLS.

**Modified files:**
- `app/api/platform/tenants/[tenantId]/provision/route.ts` — pass durable provisioning sink.
- `app/api/platform/tenants/[tenantId]/lifecycle/route.ts` — pass durable control-plane sink.
- `app/api/platform/tenants/[tenantId]/credentials/rotate/route.ts` — pass durable control-plane sink.
- `app/api/board/settings/branding/route.ts`, `.../toggles/route.ts`, `.../byodb/route.ts` — emit audit via `safeRecord`.
- `vitest.integration.config.mts` — widen `include` to a glob.
- `playwright.config.ts` — add audit spec to the `platform` project `testMatch`.

**New tests:**
- `test/unit/lib/audit/redact.test.ts`
- `test/unit/lib/audit/supabaseAuditRecorder.test.ts`
- `test/unit/lib/audit/controlPlaneAuditSink.test.ts`
- `test/unit/lib/audit/provisioningAuditSink.test.ts`
- `test/unit/lib/audit/query.test.ts`
- `test/integration/audit-log.test.ts`
- `e2e/tests/platform/audit-log.spec.ts`

**New doc:**
- `docs/audit-logging.md` — scope, event taxonomy, tamper-evidence, retention, retrieval, security model.

---

## Task 1: Core audit types

**Files:**
- Create: `lib/audit/types.ts`
- Test: (covered indirectly by later tasks; this task is pure type/util scaffolding with one testable helper `isUuid`)
- Test: `test/unit/lib/audit/redact.test.ts` is created in Task 2; `isUuid` is asserted in Task 3's recorder tests.

- [ ] **Step 1: Write `lib/audit/types.ts`**

```typescript
/**
 * Shared audit-logging contracts (EVE-55).
 *
 * An audit record attributes a single sensitive platform action to an actor,
 * within a tenant context, with an outcome. Raw secrets/credentials must NEVER
 * appear in `details` — the recorder redacts known-sensitive keys defensively,
 * but callers must not pass secret VALUES in the first place.
 */

/** The acting principal, captured at the route layer where identity is known. */
export interface AuditActor {
  /** auth.uid() of the actor, when known. Stored verbatim (no FK — forensic). */
  id: string
  /** Human-readable identifier snapshot (email or id). Immutable in the record. */
  label: string
  /** Role snapshot at action time, e.g. 'platform_admin' | 'board'. */
  role: string
}

/** Namespaced action taxonomy. Free-form string, these are the known values. */
export type AuditAction =
  | 'provisioning.run.start'
  | 'provisioning.run.complete'
  | 'provisioning.run.rollback'
  | 'provisioning.run.manual'
  | 'provisioning.step.complete'
  | 'provisioning.step.retry'
  | 'provisioning.step.fail'
  | 'provisioning.compensate.fail'
  | 'lifecycle.suspend'
  | 'lifecycle.reactivate'
  | 'lifecycle.decommission'
  | 'lifecycle.override'
  | 'credentials.rotate'
  | 'config.branding'
  | 'config.feature_flags'
  | 'config.byodb_register'

/** A normalized, ready-to-persist audit record (before hash-chain enrichment). */
export interface AuditRecordInput {
  tenantId: string
  actor: AuditActor
  action: AuditAction | string
  outcome: 'ok' | 'error'
  resourceType?: string
  resourceId?: string
  details?: Record<string, unknown>
  error?: string
}

/** Strict writer. Throws AuditValidationError on bad input, on DB/write failure. */
export interface AuditRecorder {
  record(input: AuditRecordInput): Promise<void>
}

/** Thrown when a record is missing required metadata or has an invalid outcome. */
export class AuditValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuditValidationError'
  }
}

/** Thrown when the underlying insert fails. */
export class AuditWriteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuditWriteError'
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True when `value` is a canonical UUID string. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors introduced).

- [ ] **Step 3: Commit**

```bash
git add lib/audit/types.ts
git commit -m "feat(audit): core audit-logging contracts and types (EVE-55)"
```

---

## Task 2: Sensitive-field redaction

**Files:**
- Create: `lib/audit/redact.ts`
- Test: `test/unit/lib/audit/redact.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { redactSensitive, REDACTED } from '@/lib/audit/redact'

describe('redactSensitive', () => {
  it('masks top-level sensitive keys by name (case-insensitive, substring)', () => {
    const out = redactSensitive({
      password: 'hunter2',
      Secret: 'abc',
      apiToken: 'xyz',
      connectionString: 'postgres://u:p@h/db',
      host: 'db.example.com',
    })
    expect(out).toEqual({
      password: REDACTED,
      Secret: REDACTED,
      apiToken: REDACTED,
      connectionString: REDACTED,
      host: 'db.example.com',
    })
  })

  it('masks nested sensitive keys recursively, incl. arrays of objects', () => {
    const out = redactSensitive({
      params: { user: 'alice', password: 'p', engine: 'postgres' },
      creds: [{ key: 'k', label: 'ok' }],
    })
    expect(out).toEqual({
      params: { user: 'alice', password: REDACTED, engine: 'postgres' },
      creds: [{ key: REDACTED, label: 'ok' }],
    })
  })

  it('leaves non-sensitive primitive values untouched and does not mutate input', () => {
    const input = { count: 3, enabled: true, name: 'Acme' }
    const out = redactSensitive(input)
    expect(out).toEqual({ count: 3, enabled: true, name: 'Acme' })
    expect(input).toEqual({ count: 3, enabled: true, name: 'Acme' }) // unchanged
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/audit/redact.test.ts`
Expected: FAIL — cannot find module `@/lib/audit/redact`.

- [ ] **Step 3: Write `lib/audit/redact.ts`**

```typescript
/** Placeholder written in place of any value whose key looks sensitive. */
export const REDACTED = '[REDACTED]'

/**
 * Substrings (case-insensitive) that mark a key as sensitive. Defense-in-depth:
 * callers should never pass secret VALUES, but if they do, the value is masked.
 */
const SENSITIVE_KEY_PATTERNS = [
  'password',
  'secret',
  'token',
  'credential',
  'apikey',
  'api_key',
  'key', // matches 'key', 'privateKey', 'serviceRoleKey'
  'connectionstring',
  'connection_string',
  'auth',
  'pwd',
]

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[_-]/g, '')
  return SENSITIVE_KEY_PATTERNS.some((p) => k.includes(p.replace(/[_-]/g, '')))
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitiveKey(k) ? REDACTED : redactValue(v)
    }
    return out
  }
  return value
}

/**
 * Returns a deep copy of `details` with any sensitive-looking key's value
 * replaced by REDACTED. Never mutates the input.
 */
export function redactSensitive(
  details: Record<string, unknown>,
): Record<string, unknown> {
  return redactValue(details) as Record<string, unknown>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/audit/redact.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 5: Commit**

```bash
git add lib/audit/redact.ts test/unit/lib/audit/redact.test.ts
git commit -m "feat(audit): deep sensitive-field redaction with tests (EVE-55)"
```

---

## Task 3: Strict Supabase audit recorder

**Files:**
- Create: `lib/audit/supabaseAuditRecorder.ts`
- Test: `test/unit/lib/audit/supabaseAuditRecorder.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import { AuditValidationError, AuditWriteError, REDACTED_OK } from '@/lib/audit/types'
import type { AuditRecordInput } from '@/lib/audit/types'

// Minimal Supabase client stub: client.from('audit_logs').insert(row) -> { error }
function makeClient(insertError: { message: string } | null = null) {
  const insert = vi.fn().mockResolvedValue({ error: insertError })
  const from = vi.fn().mockReturnValue({ insert })
  return { client: { from } as never, from, insert }
}

const VALID: AuditRecordInput = {
  tenantId: '11111111-1111-1111-1111-111111111111',
  actor: { id: '22222222-2222-2222-2222-222222222222', label: 'admin@x.com', role: 'platform_admin' },
  action: 'lifecycle.suspend',
  outcome: 'ok',
  resourceType: 'tenant',
  resourceId: '11111111-1111-1111-1111-111111111111',
}

describe('SupabaseAuditRecorder', () => {
  it('inserts a complete row into audit_logs (field completeness + attribution)', async () => {
    const { client, from, insert } = makeClient()
    await new SupabaseAuditRecorder(client).record(VALID)
    expect(from).toHaveBeenCalledWith('audit_logs')
    expect(insert).toHaveBeenCalledTimes(1)
    const row = insert.mock.calls[0][0]
    expect(row).toMatchObject({
      tenant_id: VALID.tenantId,
      actor_id: VALID.actor.id,
      actor_label: 'admin@x.com',
      actor_role: 'platform_admin',
      action: 'lifecycle.suspend',
      outcome: 'ok',
      resource_type: 'tenant',
      resource_id: VALID.tenantId,
    })
    // hash-chain columns are filled by the DB trigger, never by the app
    expect(row).not.toHaveProperty('row_hash')
    expect(row).not.toHaveProperty('prev_hash')
    expect(row).not.toHaveProperty('seq')
  })

  it('stores actor_id as null when actor.id is not a UUID (system/unknown actor)', async () => {
    const { client, insert } = makeClient()
    await new SupabaseAuditRecorder(client).record({ ...VALID, actor: { ...VALID.actor, id: 'system' } })
    expect(insert.mock.calls[0][0].actor_id).toBeNull()
  })

  it('redacts sensitive keys inside details before insert', async () => {
    const { client, insert } = makeClient()
    await new SupabaseAuditRecorder(client).record({
      ...VALID,
      details: { engine: 'postgres', password: 'hunter2', vault_secret_id: 'byodb/x' },
    })
    expect(insert.mock.calls[0][0].details).toEqual({
      engine: 'postgres',
      password: '[REDACTED]',
      vault_secret_id: '[REDACTED]', // 'secret' substring -> masked; reference is non-essential
    })
  })

  it('throws AuditValidationError when required metadata is missing', async () => {
    const { client } = makeClient()
    const rec = new SupabaseAuditRecorder(client)
    await expect(rec.record({ ...VALID, tenantId: '' })).rejects.toThrow(AuditValidationError)
    await expect(rec.record({ ...VALID, action: '' })).rejects.toThrow(AuditValidationError)
    await expect(rec.record({ ...VALID, actor: { ...VALID.actor, label: '' } })).rejects.toThrow(AuditValidationError)
    // invalid outcome
    await expect(
      rec.record({ ...VALID, outcome: 'maybe' as never }),
    ).rejects.toThrow(AuditValidationError)
  })

  it('throws AuditWriteError when the insert fails', async () => {
    const { client } = makeClient({ message: 'permission denied' })
    await expect(new SupabaseAuditRecorder(client).record(VALID)).rejects.toThrow(AuditWriteError)
  })
})
```

> Note: the test imports `REDACTED_OK` only to keep the import line valid if you later export constants; remove the unused import — it is NOT defined in `types.ts`. (Delete `REDACTED_OK` from the import before running.)

- [ ] **Step 2: Fix the test import**

Edit the test: change the second import line to exactly:

```typescript
import { AuditValidationError, AuditWriteError } from '@/lib/audit/types'
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/audit/supabaseAuditRecorder.test.ts`
Expected: FAIL — cannot find module `@/lib/audit/supabaseAuditRecorder`.

- [ ] **Step 4: Write `lib/audit/supabaseAuditRecorder.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type AuditRecorder,
  type AuditRecordInput,
  AuditValidationError,
  AuditWriteError,
  isUuid,
} from '@/lib/audit/types'
import { redactSensitive } from '@/lib/audit/redact'

/**
 * Strict, durable audit recorder. Validates required metadata, redacts sensitive
 * fields, and inserts one row into public.audit_logs. The DB trigger fills
 * seq/prev_hash/row_hash/created_at — the application never computes the chain.
 *
 * Pass a SERVICE-ROLE client: writes must succeed regardless of the actor's RLS
 * scope, and the append-only trigger still guarantees tamper-evidence even for
 * the service role (RLS is bypassed; triggers are not).
 *
 * This recorder THROWS on bad input or write failure so it is fully testable.
 * Integration call-sites wrap it in a best-effort adapter (Tasks 5, 6, 8).
 */
export class SupabaseAuditRecorder implements AuditRecorder {
  constructor(private readonly client: SupabaseClient) {}

  async record(input: AuditRecordInput): Promise<void> {
    if (!input.tenantId) throw new AuditValidationError('audit: tenantId is required')
    if (!input.action) throw new AuditValidationError('audit: action is required')
    if (!input.actor || !input.actor.label) {
      throw new AuditValidationError('audit: actor.label is required')
    }
    if (!input.actor.role) throw new AuditValidationError('audit: actor.role is required')
    if (input.outcome !== 'ok' && input.outcome !== 'error') {
      throw new AuditValidationError(`audit: invalid outcome ${String(input.outcome)}`)
    }

    const { error } = await this.client.from('audit_logs').insert({
      tenant_id: input.tenantId,
      actor_id: isUuid(input.actor.id) ? input.actor.id : null,
      actor_label: input.actor.label,
      actor_role: input.actor.role,
      action: input.action,
      outcome: input.outcome,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      details: input.details ? redactSensitive(input.details) : null,
      error: input.error ?? null,
    })

    if (error) throw new AuditWriteError(`audit: insert failed — ${error.message}`)
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/audit/supabaseAuditRecorder.test.ts`
Expected: PASS (5 passing).

- [ ] **Step 6: Commit**

```bash
git add lib/audit/supabaseAuditRecorder.ts test/unit/lib/audit/supabaseAuditRecorder.test.ts
git commit -m "feat(audit): strict service-role audit recorder with validation + redaction (EVE-55)"
```

---

## Task 4: Database migration — table, hash chain, append-only, verify, purge, RLS

**Files:**
- Create: `supabase/migrations/20260630120000_create_audit_logs.sql`

This task has no Vitest unit test (it is SQL). It is verified by the integration suite in Task 5. Apply it to local Supabase at the end of this task so later integration tests can run.

- [ ] **Step 1: Write `supabase/migrations/20260630120000_create_audit_logs.sql`**

```sql
-- EVE-55: tamper-evident, tenant-scoped audit log for sensitive platform ops
-- (provisioning, lifecycle/override, credential rotation, tenant config changes).
--
-- Tamper-evidence is enforced in the DB, not the app:
--   * BEFORE INSERT trigger builds a global SHA-256 hash chain
--     (row_hash = sha256(prev_hash || canonical(row))), serialized by an
--     advisory xact lock so concurrent inserts produce a consistent chain.
--   * BEFORE UPDATE/DELETE trigger rejects ALL mutations except an authorized
--     purge (purge sets a transaction-local flag). This holds even for the
--     service role: RLS is bypassed by service role, triggers are not.
--
-- tenant_id / actor_id are plain UUIDs (NO foreign key): audit evidence must
-- outlive the entities it references, and FK delete actions would either destroy
-- evidence or require the row mutations the append-only trigger forbids.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides digest()

CREATE TABLE public.audit_logs (
  seq           BIGSERIAL PRIMARY KEY,
  id            UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL,
  actor_id      UUID,
  actor_label   TEXT NOT NULL,
  actor_role    TEXT NOT NULL,
  action        TEXT NOT NULL,
  outcome       TEXT NOT NULL CHECK (outcome IN ('ok', 'error')),
  resource_type TEXT,
  resource_id   TEXT,
  details       JSONB,
  error         TEXT,
  prev_hash     TEXT NOT NULL,
  row_hash      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_seq ON public.audit_logs(tenant_id, seq DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);

-- ── Canonical content + hash chain (BEFORE INSERT) ──────────────────────────
-- The canonical string is the immutable content of the row in a fixed order.
-- Defaults (seq, created_at) are applied BEFORE this BEFORE-INSERT trigger fires,
-- so NEW.seq and NEW.created_at are already populated here.
CREATE OR REPLACE FUNCTION public.audit_logs_chain()
RETURNS TRIGGER AS $$
DECLARE
  prev TEXT;
  canonical TEXT;
BEGIN
  -- Serialize audit inserts so the chain head read below is race-free.
  PERFORM pg_advisory_xact_lock(4827392001);

  SELECT row_hash INTO prev FROM public.audit_logs ORDER BY seq DESC LIMIT 1;
  IF prev IS NULL THEN
    prev := ''; -- genesis anchor
  END IF;

  canonical :=
        NEW.seq::text
    || '|' || NEW.tenant_id::text
    || '|' || COALESCE(NEW.actor_id::text, '')
    || '|' || NEW.actor_label
    || '|' || NEW.actor_role
    || '|' || NEW.action
    || '|' || NEW.outcome
    || '|' || COALESCE(NEW.resource_type, '')
    || '|' || COALESCE(NEW.resource_id, '')
    || '|' || COALESCE(NEW.details::text, '')
    || '|' || COALESCE(NEW.error, '')
    || '|' || NEW.created_at::text;

  NEW.prev_hash := prev;
  NEW.row_hash := encode(digest(prev || canonical, 'sha256'), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_chain
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_chain();

-- ── Append-only enforcement (BEFORE UPDATE/DELETE) ──────────────────────────
-- DELETE is allowed ONLY inside purge_audit_logs(), which sets app.audit_purge.
CREATE OR REPLACE FUNCTION public.audit_logs_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('app.audit_purge', true) = 'on' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'audit_logs is append-only: DELETE is not permitted';
  END IF;
  RAISE EXCEPTION 'audit_logs is append-only: UPDATE is not permitted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_block_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_block_mutation();

CREATE TRIGGER trg_audit_logs_block_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_block_mutation();

-- ── Chain verification ──────────────────────────────────────────────────────
-- Recomputes each row's hash and checks linkage. The lowest remaining seq is the
-- anchor (its prev_hash is accepted as-is — this is what makes a purge of the
-- oldest prefix non-destructive to verification). Any edit, or any gap created by
-- deleting a NON-prefix row, breaks linkage and is reported.
-- Returns ok=true/broken_seq=NULL when intact; ok=false/broken_seq=<seq> on first break.
CREATE OR REPLACE FUNCTION public.verify_audit_chain()
RETURNS TABLE(ok BOOLEAN, broken_seq BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  expected_prev TEXT := NULL; -- NULL => first row, accept its stored prev_hash
  recomputed TEXT;
  canonical TEXT;
BEGIN
  FOR r IN SELECT * FROM public.audit_logs ORDER BY seq ASC LOOP
    IF expected_prev IS NOT NULL AND r.prev_hash <> expected_prev THEN
      ok := false; broken_seq := r.seq; RETURN NEXT; RETURN;
    END IF;

    canonical :=
          r.seq::text
      || '|' || r.tenant_id::text
      || '|' || COALESCE(r.actor_id::text, '')
      || '|' || r.actor_label
      || '|' || r.actor_role
      || '|' || r.action
      || '|' || r.outcome
      || '|' || COALESCE(r.resource_type, '')
      || '|' || COALESCE(r.resource_id, '')
      || '|' || COALESCE(r.details::text, '')
      || '|' || COALESCE(r.error, '')
      || '|' || r.created_at::text;

    recomputed := encode(digest(r.prev_hash || canonical, 'sha256'), 'hex');
    IF recomputed <> r.row_hash THEN
      ok := false; broken_seq := r.seq; RETURN NEXT; RETURN;
    END IF;

    expected_prev := r.row_hash;
  END LOOP;

  ok := true; broken_seq := NULL; RETURN NEXT;
END;
$$;

-- ── Retention purge ─────────────────────────────────────────────────────────
-- Deletes rows older than `older_than`. This is the ONLY authorized deletion
-- path; it sets a transaction-local flag the append-only trigger honors.
-- Documented retention window: 365 days (enforced by the caller, e.g. a future
-- scheduler in EVE-41). Returns the number of rows purged.
CREATE OR REPLACE FUNCTION public.purge_audit_logs(older_than INTERVAL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted INTEGER;
BEGIN
  PERFORM set_config('app.audit_purge', 'on', true); -- transaction-local
  DELETE FROM public.audit_logs WHERE created_at < NOW() - older_than;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- ── RLS: read-only, tenant-scoped ───────────────────────────────────────────
-- No INSERT/UPDATE/DELETE policies for authenticated users: writes are
-- service-role only, mutations are blocked by triggers for everyone.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select_own ON public.audit_logs
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY audit_logs_select_platform_admin ON public.audit_logs
  FOR SELECT USING (public.get_my_role() = 'platform_admin');

-- Lock down the maintenance functions to the service role.
REVOKE ALL ON FUNCTION public.verify_audit_chain() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_audit_logs(INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_audit_chain() TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_audit_logs(INTERVAL) TO service_role;
```

- [ ] **Step 2: Apply the migration to local Supabase**

Run: `make db-start` (if not already running), then `make migrate`
Expected: migration `20260630120000_create_audit_logs.sql` applies with no error. If `make migrate` reports "already applied" for older files and applies only the new one, that is correct.

- [ ] **Step 3: Smoke-check the table exists and rejects mutation**

Run:
```bash
make db-status   # note the local DB URL/port if you want to psql manually
```
(Manual optional check, not required — Task 5 asserts this programmatically.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260630120000_create_audit_logs.sql
git commit -m "feat(audit): audit_logs table with hash chain, append-only triggers, verify/purge, RLS (EVE-55)"
```

---

## Task 5: Integration tests for the audit table (chain, append-only, RLS, verify, purge)

**Files:**
- Create: `test/integration/audit-log.test.ts`
- Modify: `vitest.integration.config.mts` (widen `include` to a glob)

- [ ] **Step 1: Widen the integration test glob**

In `vitest.integration.config.mts`, change the `include` line from:

```typescript
      include: ['test/integration/tenant-provisioning.test.ts'],
```

to:

```typescript
      include: ['test/integration/**/*.test.ts'],
```

- [ ] **Step 2: Write the integration test**

```typescript
/**
 * Integration suite: tamper-evident audit_logs (EVE-55)
 *
 * Runs against a REAL local Supabase instance.
 * Prerequisites: `make db-start` && `make migrate`; .env.local with
 * NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
 * Run: `make test-integration`
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ws = require('ws') as typeof WebSocket
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import type { AuditRecordInput } from '@/lib/audit/types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasEnv = Boolean(url && anonKey && serviceKey)

describe.skipIf(!hasEnv)('audit_logs integration', () => {
  let admin: SupabaseClient
  let userAEmail: string
  let userBEmail: string
  let userAId: string
  let userBId: string
  let tenantA: string
  let tenantB: string
  const password = 'Audit-Test-P@ss1!'

  async function insertTenant(ownerId: string): Promise<string> {
    const { data, error } = await admin
      .from('tenants').insert({ owner_id: ownerId, state: 'Active' }).select('id').single()
    if (error || !data) throw new Error(`insert tenant failed: ${error?.message}`)
    return data.id as string
  }

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, { realtime: { transport: ws } })
    userAEmail = `audit-a-${Date.now()}@integration-test.evecosys.local`
    userBEmail = `audit-b-${Date.now()}@integration-test.evecosys.local`
    const a = await admin.auth.admin.createUser({ email: userAEmail, password, email_confirm: true })
    const b = await admin.auth.admin.createUser({ email: userBEmail, password, email_confirm: true })
    userAId = a.data.user!.id
    userBId = b.data.user!.id
    tenantA = await insertTenant(userAId)
    tenantB = await insertTenant(userBId)
  }, 30_000)

  afterAll(async () => {
    // Purge audit rows (only authorized deletion path), then remove fixtures.
    await admin.rpc('purge_audit_logs', { older_than: '0 seconds' })
    if (tenantA) await admin.from('tenants').delete().eq('id', tenantA)
    if (tenantB) await admin.from('tenants').delete().eq('id', tenantB)
    if (userAId) await admin.auth.admin.deleteUser(userAId)
    if (userBId) await admin.auth.admin.deleteUser(userBId)
  })

  function rec(tenantId: string, actorId: string, label: string, action: string): AuditRecordInput {
    return { tenantId, actor: { id: actorId, label, role: 'platform_admin' }, action, outcome: 'ok' }
  }

  it('writes rows and builds a verifiable hash chain', async () => {
    const recorder = new SupabaseAuditRecorder(admin)
    await recorder.record(rec(tenantA, userAId, userAEmail, 'lifecycle.suspend'))
    await recorder.record(rec(tenantA, userAId, userAEmail, 'lifecycle.reactivate'))

    const { data: rows } = await admin
      .from('audit_logs').select('seq, prev_hash, row_hash').order('seq', { ascending: true })
    expect(rows!.length).toBeGreaterThanOrEqual(2)
    // each non-genesis row links to the previous row's hash
    for (let i = 1; i < rows!.length; i++) {
      expect(rows![i].prev_hash).toBe(rows![i - 1].row_hash)
    }

    const { data: verify } = await admin.rpc('verify_audit_chain')
    expect(verify![0].ok).toBe(true)
    expect(verify![0].broken_seq).toBeNull()
  })

  it('rejects UPDATE and DELETE even via the service role (append-only)', async () => {
    const recorder = new SupabaseAuditRecorder(admin)
    await recorder.record(rec(tenantA, userAId, userAEmail, 'config.feature_flags'))
    const { data: one } = await admin
      .from('audit_logs').select('seq').order('seq', { ascending: false }).limit(1).single()

    const upd = await admin.from('audit_logs').update({ action: 'tampered' }).eq('seq', one!.seq)
    expect(upd.error).not.toBeNull()
    expect(upd.error!.message).toMatch(/append-only/i)

    const del = await admin.from('audit_logs').delete().eq('seq', one!.seq)
    expect(del.error).not.toBeNull()
    expect(del.error!.message).toMatch(/append-only/i)
  })

  it('isolates reads by tenant via RLS (userA cannot see tenantB rows)', async () => {
    const recorder = new SupabaseAuditRecorder(admin)
    await recorder.record(rec(tenantB, userBId, userBEmail, 'lifecycle.suspend'))

    const signIn = await createClient(url!, anonKey!, { realtime: { transport: ws } })
      .auth.signInWithPassword({ email: userAEmail, password })
    const userAClient = createClient(url!, anonKey!, {
      realtime: { transport: ws },
      global: { headers: { Authorization: `Bearer ${signIn.data.session!.access_token}` } },
    })

    const blocked = await userAClient.from('audit_logs').select('*').eq('tenant_id', tenantB)
    expect(blocked.error).toBeNull()
    expect(blocked.data).toHaveLength(0)

    const own = await userAClient.from('audit_logs').select('*').eq('tenant_id', tenantA)
    expect(own.error).toBeNull()
    expect(own.data!.length).toBeGreaterThan(0)
  })

  it('purge_audit_logs deletes aged rows and leaves a verifiable chain', async () => {
    // Everything written so far is "now"; purge with a future-proof 0s window
    // removes all, then a fresh write re-anchors the chain.
    const purged = await admin.rpc('purge_audit_logs', { older_than: '0 seconds' })
    expect(purged.error).toBeNull()

    const recorder = new SupabaseAuditRecorder(admin)
    await recorder.record(rec(tenantA, userAId, userAEmail, 'credentials.rotate'))

    const { data: verify } = await admin.rpc('verify_audit_chain')
    expect(verify![0].ok).toBe(true)
  })
})
```

- [ ] **Step 3: Run the integration suite**

Run: `make db-start` (if needed) then `make test-integration`
Expected: the new `audit_logs integration` suite passes (4 tests), and the existing `tenant-provisioning` suite still passes.

- [ ] **Step 4: Commit**

```bash
git add vitest.integration.config.mts test/integration/audit-log.test.ts
git commit -m "test(audit): integration coverage for chain, append-only, RLS, verify, purge (EVE-55)"
```

---

## Task 6: Control-plane durable audit sink adapter

**Files:**
- Create: `lib/audit/controlPlaneAuditSink.ts`
- Test: `test/unit/lib/audit/controlPlaneAuditSink.test.ts`

This adapter implements the **existing** `ControlPlaneAuditSink` interface (`lib/tenant/controlplane/audit.ts`) so it can be passed to `TenantLifecycleService` and `CredentialRotationService` with no signature change. It is best-effort: a recorder failure is swallowed so a control-plane action never fails because audit failed.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { DurableControlPlaneAuditSink } from '@/lib/audit/controlPlaneAuditSink'
import type { AuditRecorder, AuditRecordInput } from '@/lib/audit/types'
import type { ControlPlaneAuditEvent } from '@/lib/tenant/controlplane/audit'

function makeRecorder(impl?: (i: AuditRecordInput) => Promise<void>): { recorder: AuditRecorder; record: ReturnType<typeof vi.fn> } {
  const record = vi.fn(impl ?? (async () => undefined))
  return { recorder: { record }, record }
}

const ACTOR = { id: '22222222-2222-2222-2222-222222222222', label: 'admin@x.com', role: 'platform_admin' }

describe('DurableControlPlaneAuditSink', () => {
  it('maps a suspend event to a namespaced action with actor + resource', async () => {
    const { recorder, record } = makeRecorder()
    const sink = new DurableControlPlaneAuditSink(recorder, ACTOR)
    const ev: ControlPlaneAuditEvent = {
      tenantId: 't1', actor: 'admin@x.com', action: 'suspend', outcome: 'ok', at: '2026-06-30T00:00:00Z',
    }
    await sink.record(ev)
    expect(record).toHaveBeenCalledWith({
      tenantId: 't1',
      actor: ACTOR,
      action: 'lifecycle.suspend',
      outcome: 'ok',
      resourceType: 'tenant',
      resourceId: 't1',
      details: undefined,
      error: undefined,
    })
  })

  it('maps rotate_credentials and override (carrying reason in details)', async () => {
    const { recorder, record } = makeRecorder()
    const sink = new DurableControlPlaneAuditSink(recorder, ACTOR)
    await sink.record({ tenantId: 't1', actor: 'a', action: 'rotate_credentials', outcome: 'ok', at: 'now' })
    expect(record.mock.calls[0][0].action).toBe('credentials.rotate')

    await sink.record({ tenantId: 't1', actor: 'a', action: 'override', outcome: 'ok', reason: 'incident #5', at: 'now' })
    expect(record.mock.calls[1][0]).toMatchObject({
      action: 'lifecycle.override',
      details: { reason: 'incident #5' },
    })
  })

  it('forwards the error message for error outcomes', async () => {
    const { recorder, record } = makeRecorder()
    const sink = new DurableControlPlaneAuditSink(recorder, ACTOR)
    await sink.record({ tenantId: 't1', actor: 'a', action: 'decommission', outcome: 'error', error: 'boom', at: 'now' })
    expect(record.mock.calls[0][0]).toMatchObject({ action: 'lifecycle.decommission', outcome: 'error', error: 'boom' })
  })

  it('swallows recorder failures (audit must never break the operation)', async () => {
    const { recorder } = makeRecorder(async () => { throw new Error('db down') })
    const sink = new DurableControlPlaneAuditSink(recorder, ACTOR)
    await expect(
      sink.record({ tenantId: 't1', actor: 'a', action: 'suspend', outcome: 'ok', at: 'now' }),
    ).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/audit/controlPlaneAuditSink.test.ts`
Expected: FAIL — cannot find module `@/lib/audit/controlPlaneAuditSink`.

- [ ] **Step 3: Write `lib/audit/controlPlaneAuditSink.ts`**

```typescript
import type {
  ControlPlaneAuditEvent,
  ControlPlaneAuditSink,
} from '@/lib/tenant/controlplane/audit'
import type { AuditActor, AuditRecorder } from '@/lib/audit/types'

const ACTION_MAP: Record<ControlPlaneAuditEvent['action'], string> = {
  suspend: 'lifecycle.suspend',
  reactivate: 'lifecycle.reactivate',
  decommission: 'lifecycle.decommission',
  override: 'lifecycle.override',
  rotate_credentials: 'credentials.rotate',
  read_config: 'config.read',
}

/**
 * Adapts the durable AuditRecorder to the existing ControlPlaneAuditSink
 * interface. Best-effort: a recorder failure is swallowed so suspend/reactivate/
 * decommission/override/rotate never fail because the audit write failed
 * (consistent with "audit is observability" — orchestrator.ts:30).
 *
 * Actor identity comes from the route layer (where id + role are known), not
 * from the event's free-form `actor` string.
 */
export class DurableControlPlaneAuditSink implements ControlPlaneAuditSink {
  constructor(
    private readonly recorder: AuditRecorder,
    private readonly actor: AuditActor,
  ) {}

  async record(event: ControlPlaneAuditEvent): Promise<void> {
    try {
      await this.recorder.record({
        tenantId: event.tenantId,
        actor: this.actor,
        action: ACTION_MAP[event.action] ?? `lifecycle.${event.action}`,
        outcome: event.outcome,
        resourceType: 'tenant',
        resourceId: event.tenantId,
        details: event.reason ? { reason: event.reason } : undefined,
        error: event.error,
      })
    } catch {
      /* best-effort: audit must never break a control-plane action */
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/audit/controlPlaneAuditSink.test.ts`
Expected: PASS (4 passing).

- [ ] **Step 5: Commit**

```bash
git add lib/audit/controlPlaneAuditSink.ts test/unit/lib/audit/controlPlaneAuditSink.test.ts
git commit -m "feat(audit): best-effort control-plane audit sink adapter (EVE-55)"
```

---

## Task 7: Provisioning durable audit sink adapter

**Files:**
- Create: `lib/audit/provisioningAuditSink.ts`
- Test: `test/unit/lib/audit/provisioningAuditSink.test.ts`

Implements the existing `AuditSink` interface (`lib/tenant/provisioning/audit.ts`). The provisioning events carry `runId` and an optional `step` but no actor — actor comes from the adapter's constructor.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { DurableProvisioningAuditSink } from '@/lib/audit/provisioningAuditSink'
import type { AuditRecorder, AuditRecordInput } from '@/lib/audit/types'
import type { ProvisioningAuditEvent } from '@/lib/tenant/provisioning/audit'

function makeRecorder(impl?: (i: AuditRecordInput) => Promise<void>) {
  const record = vi.fn(impl ?? (async () => undefined))
  return { recorder: { record } as AuditRecorder, record }
}
const ACTOR = { id: '22222222-2222-2222-2222-222222222222', label: 'admin@x.com', role: 'platform_admin' }

describe('DurableProvisioningAuditSink', () => {
  it('namespaces the action and carries runId + step in details', async () => {
    const { recorder, record } = makeRecorder()
    const sink = new DurableProvisioningAuditSink(recorder, ACTOR)
    const ev: ProvisioningAuditEvent = {
      tenantId: 't1', runId: 'r1', step: 'bind_byodb', action: 'step.complete', outcome: 'ok', at: 'now',
    }
    await sink.record(ev)
    expect(record).toHaveBeenCalledWith({
      tenantId: 't1',
      actor: ACTOR,
      action: 'provisioning.step.complete',
      outcome: 'ok',
      resourceType: 'provisioning_run',
      resourceId: 'r1',
      details: { runId: 'r1', step: 'bind_byodb' },
      error: undefined,
    })
  })

  it('handles run-level events with no step and forwards errors', async () => {
    const { recorder, record } = makeRecorder()
    const sink = new DurableProvisioningAuditSink(recorder, ACTOR)
    await sink.record({ tenantId: 't1', runId: 'r1', action: 'run.rollback', outcome: 'error', error: 'x', at: 'now' })
    expect(record.mock.calls[0][0]).toMatchObject({
      action: 'provisioning.run.rollback',
      outcome: 'error',
      error: 'x',
      details: { runId: 'r1' },
    })
  })

  it('swallows recorder failures', async () => {
    const { recorder } = makeRecorder(async () => { throw new Error('db down') })
    const sink = new DurableProvisioningAuditSink(recorder, ACTOR)
    await expect(
      sink.record({ tenantId: 't1', runId: 'r1', action: 'run.start', outcome: 'ok', at: 'now' }),
    ).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/audit/provisioningAuditSink.test.ts`
Expected: FAIL — cannot find module `@/lib/audit/provisioningAuditSink`.

- [ ] **Step 3: Write `lib/audit/provisioningAuditSink.ts`**

```typescript
import type { AuditSink, ProvisioningAuditEvent } from '@/lib/tenant/provisioning/audit'
import type { AuditActor, AuditRecorder } from '@/lib/audit/types'

/**
 * Adapts the durable AuditRecorder to the existing provisioning AuditSink.
 * Best-effort (the orchestrator also wraps emits in safeAudit, but we keep the
 * adapter self-contained so it is safe wherever it is used). Actor comes from
 * the route layer; the run id + step are preserved in `details`.
 */
export class DurableProvisioningAuditSink implements AuditSink {
  constructor(
    private readonly recorder: AuditRecorder,
    private readonly actor: AuditActor,
  ) {}

  async record(event: ProvisioningAuditEvent): Promise<void> {
    try {
      await this.recorder.record({
        tenantId: event.tenantId,
        actor: this.actor,
        action: `provisioning.${event.action}`,
        outcome: event.outcome,
        resourceType: 'provisioning_run',
        resourceId: event.runId,
        details: event.step ? { runId: event.runId, step: event.step } : { runId: event.runId },
        error: event.error,
      })
    } catch {
      /* best-effort: audit must never break provisioning */
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/audit/provisioningAuditSink.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 5: Commit**

```bash
git add lib/audit/provisioningAuditSink.ts test/unit/lib/audit/provisioningAuditSink.test.ts
git commit -m "feat(audit): best-effort provisioning audit sink adapter (EVE-55)"
```

---

## Task 8: Wire durable sinks into the platform routes

**Files:**
- Modify: `app/api/platform/tenants/[tenantId]/lifecycle/route.ts`
- Modify: `app/api/platform/tenants/[tenantId]/credentials/rotate/route.ts`
- Modify: `app/api/platform/tenants/[tenantId]/provision/route.ts`

These routes already authenticate `platform_admin` and have `guard.user` (`{ id, email }`). We construct the actor context and inject the durable sink. No service signatures change. Verification is via E2E (Task 12); these are small, mechanical wiring edits.

- [ ] **Step 1: Lifecycle route — inject the sink**

In `app/api/platform/tenants/[tenantId]/lifecycle/route.ts`, add imports after the existing imports:

```typescript
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import { DurableControlPlaneAuditSink } from '@/lib/audit/controlPlaneAuditSink'
```

Then replace this block:

```typescript
  const admin = createServiceClient()
  const store = new SupabaseControlPlaneStore(admin)
  const service = new TenantLifecycleService(store, new SupabaseVaultStore(admin))
  const actor = guard.user.email
```

with:

```typescript
  const admin = createServiceClient()
  const store = new SupabaseControlPlaneStore(admin)
  const auditSink = new DurableControlPlaneAuditSink(new SupabaseAuditRecorder(admin), {
    id: guard.user.id,
    label: guard.user.email,
    role: 'platform_admin',
  })
  const service = new TenantLifecycleService(store, new SupabaseVaultStore(admin), auditSink)
  const actor = guard.user.email
```

- [ ] **Step 2: Rotate route — inject the sink**

In `app/api/platform/tenants/[tenantId]/credentials/rotate/route.ts`, add imports:

```typescript
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import { DurableControlPlaneAuditSink } from '@/lib/audit/controlPlaneAuditSink'
```

Replace:

```typescript
  const admin = createServiceClient()
  const service = new CredentialRotationService(
    new SupabaseControlPlaneStore(admin),
    new RealConnectivityProbe(),
    new SupabaseVaultStore(admin),
  )
```

with:

```typescript
  const admin = createServiceClient()
  const auditSink = new DurableControlPlaneAuditSink(new SupabaseAuditRecorder(admin), {
    id: guard.user.id,
    label: guard.user.email,
    role: 'platform_admin',
  })
  const service = new CredentialRotationService(
    new SupabaseControlPlaneStore(admin),
    new RealConnectivityProbe(),
    new SupabaseVaultStore(admin),
    auditSink,
  )
```

- [ ] **Step 3: Provision route — inject the sink**

In `app/api/platform/tenants/[tenantId]/provision/route.ts`:

Note this route uses a **local** `requirePlatformAdmin()` that returns `{ user }` (the full Supabase user, which has `.id` and `.email`). Add imports:

```typescript
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import { DurableProvisioningAuditSink } from '@/lib/audit/provisioningAuditSink'
```

Replace:

```typescript
  const orchestrator = buildOrchestrator(admin)
```

with:

```typescript
  const auditSink = new DurableProvisioningAuditSink(new SupabaseAuditRecorder(admin), {
    id: guard.user.id,
    label: guard.user.email ?? guard.user.id,
    role: 'platform_admin',
  })
  const orchestrator = buildOrchestrator(admin, auditSink)
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint` (or `make lint`)
Expected: PASS. (If lint flags an unused import, double-check each route imports both `SupabaseAuditRecorder` and the correct sink.)

- [ ] **Step 5: Run the full unit suite to confirm no regressions**

Run: `npx vitest run`
Expected: PASS — existing lifecycle/rotation/provisioning unit tests still pass (they use the default no-op sink and are unaffected).

- [ ] **Step 6: Commit**

```bash
git add app/api/platform/tenants/\[tenantId\]/lifecycle/route.ts \
        app/api/platform/tenants/\[tenantId\]/credentials/rotate/route.ts \
        app/api/platform/tenants/\[tenantId\]/provision/route.ts
git commit -m "feat(audit): emit durable audit from provisioning, lifecycle, rotation routes (EVE-55)"
```

---

## Task 9: Best-effort record helper + audit board config changes

**Files:**
- Create: `lib/audit/safeRecord.ts`
- Test: `test/unit/lib/audit/safeRecord.test.ts`
- Modify: `app/api/board/settings/branding/route.ts`
- Modify: `app/api/board/settings/toggles/route.ts`
- Modify: `app/api/board/settings/byodb/route.ts`

- [ ] **Step 1: Write the failing test for `safeRecord`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { safeRecord } from '@/lib/audit/safeRecord'
import type { AuditRecorder } from '@/lib/audit/types'

const INPUT = {
  tenantId: 't1',
  actor: { id: 'i', label: 'board@x.com', role: 'board' },
  action: 'config.feature_flags' as const,
  outcome: 'ok' as const,
}

describe('safeRecord', () => {
  it('forwards the input to the recorder', async () => {
    const record = vi.fn().mockResolvedValue(undefined)
    await safeRecord({ record } as AuditRecorder, INPUT)
    expect(record).toHaveBeenCalledWith(INPUT)
  })

  it('never throws when the recorder fails', async () => {
    const record = vi.fn().mockRejectedValue(new Error('db down'))
    await expect(safeRecord({ record } as AuditRecorder, INPUT)).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/audit/safeRecord.test.ts`
Expected: FAIL — cannot find module `@/lib/audit/safeRecord`.

- [ ] **Step 3: Write `lib/audit/safeRecord.ts`**

```typescript
import type { AuditRecorder, AuditRecordInput } from '@/lib/audit/types'

/**
 * Best-effort audit write for route call-sites that don't go through a sink
 * adapter (e.g. board config changes). Swallows all errors so the user-facing
 * operation is never broken by an audit failure.
 */
export async function safeRecord(recorder: AuditRecorder, input: AuditRecordInput): Promise<void> {
  try {
    await recorder.record(input)
  } catch {
    /* best-effort: audit is observability, not a blocking dependency */
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/audit/safeRecord.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 5: Audit the toggles route**

In `app/api/board/settings/toggles/route.ts`, add imports at the top:

```typescript
import { createServiceClient } from '@/lib/supabase/service'
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import { safeRecord } from '@/lib/audit/safeRecord'
```

Replace the final write + return block:

```typescript
  const { error } = await supabase
    .from('tenants')
    .update({ feature_flags: flags })
    .eq('id', tenant.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
```

with:

```typescript
  const { error } = await supabase
    .from('tenants')
    .update({ feature_flags: flags })
    .eq('id', tenant.id)

  const recorder = new SupabaseAuditRecorder(createServiceClient())
  const actor = { id: user.id, label: user.email ?? user.id, role: 'board' }

  if (error) {
    await safeRecord(recorder, {
      tenantId: tenant.id, actor, action: 'config.feature_flags', outcome: 'error',
      resourceType: 'tenant', resourceId: tenant.id, error: error.message,
    })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await safeRecord(recorder, {
    tenantId: tenant.id, actor, action: 'config.feature_flags', outcome: 'ok',
    resourceType: 'tenant', resourceId: tenant.id,
    details: { flags }, // booleans only; no sensitive values
  })
  return NextResponse.json({ ok: true })
```

- [ ] **Step 6: Audit the branding route**

In `app/api/board/settings/branding/route.ts`, add imports:

```typescript
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import { safeRecord } from '@/lib/audit/safeRecord'
```

Replace the final return:

```typescript
  return NextResponse.json({ ok: true })
```

with:

```typescript
  await safeRecord(new SupabaseAuditRecorder(admin), {
    tenantId: tenant.id,
    actor: { id: user.id, label: user.email ?? user.id, role: 'board' },
    action: 'config.branding',
    outcome: 'ok',
    resourceType: 'tenant',
    resourceId: tenant.id,
    details: {
      changedName: Boolean(name),
      changedColor: Boolean(primary_color),
      changedLogo: Boolean(file && file.size > 0),
    },
  })
  return NextResponse.json({ ok: true })
```

(`admin` is the service-role client already created in this handler.)

- [ ] **Step 7: Audit the byodb registration route**

In `app/api/board/settings/byodb/route.ts`, add imports:

```typescript
import { SupabaseAuditRecorder } from '@/lib/audit/supabaseAuditRecorder'
import { safeRecord } from '@/lib/audit/safeRecord'
```

In the success branch, replace:

```typescript
    return NextResponse.json({ ok: true, state: result.tenant.state })
```

with:

```typescript
    await safeRecord(new SupabaseAuditRecorder(admin), {
      tenantId: tenant.id,
      actor: { id: user.id, label: user.email ?? user.id, role: 'board' },
      action: 'config.byodb_register',
      outcome: 'ok',
      resourceType: 'tenant',
      resourceId: tenant.id,
      details: { state: result.tenant.state }, // NEVER include credential params
    })
    return NextResponse.json({ ok: true, state: result.tenant.state })
```

And in BOTH validation/connectivity catch branches, immediately before each existing `return NextResponse.json({ error: (err as Error).message }, { status: 400 })`, add:

```typescript
      await safeRecord(new SupabaseAuditRecorder(admin), {
        tenantId: tenant.id,
        actor: { id: user.id, label: user.email ?? user.id, role: 'board' },
        action: 'config.byodb_register',
        outcome: 'error',
        resourceType: 'tenant',
        resourceId: tenant.id,
        error: (err as Error).message, // message only; never the credential
      })
```

(There are two such `return` lines — one in the `CredentialValidationError` branch, one in the `ConnectivityError` branch. Add the `safeRecord` call before each.)

- [ ] **Step 8: Typecheck, lint, unit tests**

Run: `npx tsc --noEmit && make lint && npx vitest run`
Expected: PASS. The byodb credential audit must show **no** credential params anywhere in `details`/`error` — only `state` and the error message.

- [ ] **Step 9: Commit**

```bash
git add lib/audit/safeRecord.ts test/unit/lib/audit/safeRecord.test.ts \
        app/api/board/settings/branding/route.ts \
        app/api/board/settings/toggles/route.ts \
        app/api/board/settings/byodb/route.ts
git commit -m "feat(audit): audit board branding, feature-flag, and BYODB config changes (EVE-55)"
```

---

## Task 10: Audit query module (keyset pagination + filters)

**Files:**
- Create: `lib/audit/query.ts`
- Test: `test/unit/lib/audit/query.test.ts`

Both read routes share this. It builds a tenant-scoped, filtered, keyset-paginated query against `audit_logs`. The caller supplies the client (service-role for platform path; RLS user client for board path) and the `tenantId` filter.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { queryAuditLogs } from '@/lib/audit/query'

// Chainable Supabase query-builder stub recording each call.
function makeClient(rows: unknown[]) {
  const calls: Array<[string, unknown[]]> = []
  const builder: Record<string, unknown> = {}
  const chain = (name: string) => (...args: unknown[]) => { calls.push([name, args]); return builder }
  builder.select = chain('select')
  builder.eq = chain('eq')
  builder.gte = chain('gte')
  builder.lte = chain('lte')
  builder.lt = chain('lt')
  builder.order = chain('order')
  builder.limit = chain('limit')
  // resolve when awaited (thenable): return { data, error }
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null })
  const from = vi.fn().mockReturnValue(builder)
  return { client: { from } as never, from, calls }
}

describe('queryAuditLogs', () => {
  it('scopes to tenant, applies filters, orders by seq desc, and caps the limit', async () => {
    const { client, from, calls } = makeClient([])
    await queryAuditLogs(client, {
      tenantId: 't1', action: 'lifecycle.suspend',
      from: '2026-01-01', to: '2026-12-31', actorId: 'a1', limit: 25,
    })
    expect(from).toHaveBeenCalledWith('audit_logs')
    const names = calls.map((c) => c[0])
    expect(names).toContain('eq')   // tenant_id + action + actor_id
    expect(names).toContain('gte')  // from
    expect(names).toContain('lte')  // to
    expect(names).toContain('order')
    expect(names).toContain('limit')
    const eqArgs = calls.filter((c) => c[0] === 'eq').map((c) => c[1][0])
    expect(eqArgs).toEqual(expect.arrayContaining(['tenant_id', 'action', 'actor_id']))
  })

  it('clamps limit to the [1,100] range and defaults to 50', async () => {
    const { client, calls } = makeClient([])
    await queryAuditLogs(client, { tenantId: 't1', limit: 9999 })
    const limitCall = calls.find((c) => c[0] === 'limit')!
    expect(limitCall[1][0]).toBe(100)

    const { client: c2, calls: calls2 } = makeClient([])
    await queryAuditLogs(c2, { tenantId: 't1' })
    expect(calls2.find((c) => c[0] === 'limit')![1][0]).toBe(50)
  })

  it('applies the keyset cursor via lt(seq, cursor) and returns nextCursor', async () => {
    const { client, calls } = makeClient([{ seq: 5 }, { seq: 4 }])
    const res = await queryAuditLogs(client, { tenantId: 't1', limit: 2, cursor: 10 })
    const ltCall = calls.find((c) => c[0] === 'lt')!
    expect(ltCall[1]).toEqual(['seq', 10])
    expect(res.rows).toHaveLength(2)
    expect(res.nextCursor).toBe(4) // smallest seq in the page
  })

  it('returns nextCursor=null when the page is not full', async () => {
    const { client } = makeClient([{ seq: 4 }])
    const res = await queryAuditLogs(client, { tenantId: 't1', limit: 2 })
    expect(res.nextCursor).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/audit/query.test.ts`
Expected: FAIL — cannot find module `@/lib/audit/query`.

- [ ] **Step 3: Write `lib/audit/query.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuditQueryFilters {
  tenantId: string
  action?: string
  actorId?: string
  /** ISO date/time lower bound (inclusive) on created_at. */
  from?: string
  /** ISO date/time upper bound (inclusive) on created_at. */
  to?: string
  /** Keyset cursor: return rows with seq < cursor. */
  cursor?: number
  /** Page size, clamped to [1, 100]. Defaults to 50. */
  limit?: number
}

export interface AuditQueryResult {
  rows: Array<Record<string, unknown>>
  /** Pass as `cursor` to fetch the next page; null when there are no more rows. */
  nextCursor: number | null
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)))
}

/**
 * Tenant-scoped, filtered, keyset-paginated read of audit_logs.
 *
 * The caller chooses the client and is responsible for the trust boundary:
 *  - platform admin: service-role client + a path-validated tenantId.
 *  - tenant owner: RLS user client (RLS enforces the tenant scope regardless of
 *    the tenantId passed here — defense-in-depth).
 */
export async function queryAuditLogs(
  client: SupabaseClient,
  filters: AuditQueryFilters,
): Promise<AuditQueryResult> {
  const limit = clampLimit(filters.limit)

  let q = client.from('audit_logs').select('*').eq('tenant_id', filters.tenantId)
  if (filters.action) q = q.eq('action', filters.action)
  if (filters.actorId) q = q.eq('actor_id', filters.actorId)
  if (filters.from) q = q.gte('created_at', filters.from)
  if (filters.to) q = q.lte('created_at', filters.to)
  if (filters.cursor !== undefined) q = q.lt('seq', filters.cursor)

  q = q.order('seq', { ascending: false }).limit(limit)

  const { data, error } = await q
  if (error) throw new Error(`audit query failed — ${error.message}`)

  const rows = (data ?? []) as Array<Record<string, unknown>>
  const nextCursor =
    rows.length === limit ? (rows[rows.length - 1].seq as number) : null
  return { rows, nextCursor }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/audit/query.test.ts`
Expected: PASS (4 passing).

- [ ] **Step 5: Commit**

```bash
git add lib/audit/query.ts test/unit/lib/audit/query.test.ts
git commit -m "feat(audit): tenant-scoped keyset-paginated audit query module (EVE-55)"
```

---

## Task 11: Platform audit query API (read any tenant)

**Files:**
- Create: `app/api/platform/tenants/[tenantId]/audit/route.ts`

Mirrors the existing platform route conventions: `requirePlatformAdmin()` guard, service-role client, path-scoped `tenantId`.

- [ ] **Step 1: Write `app/api/platform/tenants/[tenantId]/audit/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePlatformAdmin } from '@/lib/platform/requirePlatformAdmin'
import { queryAuditLogs } from '@/lib/audit/query'

/**
 * Platform-admin audit retrieval for enterprise review. Path-scoped to one
 * tenant; platform_admin may read any tenant. Records were redacted at write
 * time, so responses carry no raw secrets.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const guard = await requirePlatformAdmin()
  if ('error' in guard) return guard.error

  const url = new URL(req.url)
  const cursorParam = url.searchParams.get('cursor')
  const limitParam = url.searchParams.get('limit')

  const admin = createServiceClient()
  const result = await queryAuditLogs(admin, {
    tenantId,
    action: url.searchParams.get('action') ?? undefined,
    actorId: url.searchParams.get('actor') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    cursor: cursorParam ? Number(cursorParam) : undefined,
    limit: limitParam ? Number(limitParam) : undefined,
  })

  return NextResponse.json(result)
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && make lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/platform/tenants/\[tenantId\]/audit/route.ts
git commit -m "feat(audit): platform-admin audit query API (EVE-55)"
```

---

## Task 12: Board audit query API (read own tenant, RLS-enforced)

**Files:**
- Create: `app/api/board/audit-log/route.ts`

Mirrors the board route conventions: `createClient()` (RLS user client), board role + tenant-ownership check. Reads go through the **RLS** client so tenant isolation is enforced by the database, not just by application logic.

- [ ] **Step 1: Write `app/api/board/audit-log/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queryAuditLogs } from '@/lib/audit/query'

/**
 * Tenant-owner audit retrieval. Uses the RLS user client: audit_logs_select_own
 * guarantees the caller can only ever read their own tenant's rows, even if the
 * tenantId resolution below were wrong (defense-in-depth).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'board') {
    return NextResponse.json({ error: 'Forbidden — board role required' }, { status: 403 })
  }

  const { data: tenant } = await supabase
    .from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const url = new URL(req.url)
  const cursorParam = url.searchParams.get('cursor')
  const limitParam = url.searchParams.get('limit')

  const result = await queryAuditLogs(supabase, {
    tenantId: tenant.id,
    action: url.searchParams.get('action') ?? undefined,
    actorId: url.searchParams.get('actor') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    cursor: cursorParam ? Number(cursorParam) : undefined,
    limit: limitParam ? Number(limitParam) : undefined,
  })

  return NextResponse.json(result)
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && make lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/board/audit-log/route.ts
git commit -m "feat(audit): RLS-enforced board audit query API (EVE-55)"
```

---

## Task 13: E2E — traceability + tenant isolation of the audit surface

**Files:**
- Create: `e2e/tests/platform/audit-log.spec.ts`
- Modify: `playwright.config.ts` (add the spec to the `platform` project `testMatch`)

This proves end-to-end that (a) a sensitive action generates a retrievable audit record, (b) a failure path still records an error-outcome record, and (c) one tenant cannot read another tenant's audit via the board surface.

- [ ] **Step 1: Register the spec in the platform project**

In `playwright.config.ts`, find the `platform` project's `testMatch` array (currently includes `'**/tenant-provisioning.spec.ts'` and `'**/tenant-lifecycle.spec.ts'`) and add `'**/audit-log.spec.ts'`:

```typescript
    testMatch: ['**/tenant-provisioning.spec.ts', '**/tenant-lifecycle.spec.ts', '**/audit-log.spec.ts'],
```

- [ ] **Step 2: Write `e2e/tests/platform/audit-log.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

/**
 * EVE-55 audit-log E2E. Relies on the shared global-setup test users:
 *   - platform_admin (e2e/.auth/platform_admin.json)
 *   - board (e2e/.auth/board.json) — owns a tenant (ensureTestTenant)
 *
 * The platform_admin performs a sensitive lifecycle action against the board's
 * tenant, then retrieves the audit trail. We discover the board's tenantId via
 * the platform tenants surface used by the existing lifecycle spec.
 */

// Helper: resolve the board user's tenantId as platform_admin.
async function getBoardTenantId(request: import('@playwright/test').APIRequestContext): Promise<string> {
  // The platform admin can read all tenants; the board fixture owns exactly one.
  // Reuse the same listing the platform dashboard uses.
  const res = await request.get('/api/platform/tenants')
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const tenants: Array<{ id: string; state: string }> = body.tenants ?? body
  // Prefer an Active tenant (the board fixture is provisioned Active in setup).
  const active = tenants.find((t) => t.state === 'Active') ?? tenants[0]
  expect(active, 'expected at least one tenant for audit E2E').toBeTruthy()
  return active.id
}

test.describe('audit log — auth guards', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('platform audit GET requires auth (401)', async ({ page }) => {
    const res = await page.request.get(
      '/api/platform/tenants/00000000-0000-0000-0000-000000000000/audit',
    )
    expect(res.status()).toBe(401)
  })

  test('board audit GET requires auth (401)', async ({ page }) => {
    const res = await page.request.get('/api/board/audit-log')
    expect(res.status()).toBe(401)
  })
})

test.describe('audit log — non platform_admin forbidden', () => {
  test.use({ storageState: 'e2e/.auth/driver.json' })

  test('driver platform audit GET → 403', async ({ page }) => {
    const res = await page.request.get(
      '/api/platform/tenants/00000000-0000-0000-0000-000000000000/audit',
    )
    expect(res.status()).toBe(403)
  })
})

test.describe('audit log — traceability as platform_admin', () => {
  test.use({ storageState: 'e2e/.auth/platform_admin.json' })

  test('a lifecycle action and its failure path are both traceable', async ({ page }) => {
    const tenantId = await getBoardTenantId(page.request)

    // 1) Successful sensitive action: suspend (Active -> Suspended).
    const suspend = await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, {
      data: { action: 'suspend' },
    })
    expect([200, 409]).toContain(suspend.status()) // 409 if already Suspended from a prior run

    // 2) Failure path: an invalid override (empty reason) → 400, must still audit.
    const badOverride = await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, {
      data: { action: 'override', toState: 'Active', reason: '' },
    })
    expect(badOverride.status()).toBe(400)

    // 3) Retrieve the audit trail and assert both records exist.
    const audit = await page.request.get(
      `/api/platform/tenants/${tenantId}/audit?limit=100`,
    )
    expect(audit.ok()).toBeTruthy()
    const { rows } = await audit.json()
    const actions = rows.map((r: { action: string; outcome: string }) => `${r.action}:${r.outcome}`)
    expect(actions).toContain('lifecycle.suspend:ok')
    expect(actions).toContain('lifecycle.override:error')

    // 4) No raw secrets leaked: no row's serialized form contains a password value.
    expect(JSON.stringify(rows)).not.toMatch(/hunter2|password":"[^"]+"/i)

    // Restore state for idempotency across runs.
    await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, {
      data: { action: 'reactivate' },
    })
  })
})

test.describe('audit log — tenant isolation on the board surface', () => {
  test.use({ storageState: 'e2e/.auth/board.json' })

  test('board sees only its own tenant rows', async ({ page }) => {
    const res = await page.request.get('/api/board/audit-log?limit=100')
    expect(res.ok()).toBeTruthy()
    const { rows } = await res.json()
    // All returned rows belong to a single tenant (RLS-scoped to the owner).
    const tenantIds = new Set(rows.map((r: { tenant_id: string }) => r.tenant_id))
    expect(tenantIds.size).toBeLessThanOrEqual(1)
  })
})
```

> If `/api/platform/tenants` does not exist or returns a different shape, adapt `getBoardTenantId` to the listing the existing `tenant-lifecycle.spec.ts` uses (open that spec to copy its tenant-discovery approach). The rest of the spec is independent of how the tenantId is obtained.

- [ ] **Step 3: Verify the tenant-discovery helper against the existing lifecycle spec**

Run: `sed -n '1,60p' e2e/tests/platform/tenant-lifecycle.spec.ts`
Action: confirm how that spec discovers/creates the tenant it operates on, and align `getBoardTenantId` (or replace it with the same approach) so this spec is robust.

- [ ] **Step 4: Run the E2E platform project**

Run: `make e2e` (requires the app running + Supabase per `TESTING.md` / `reference_running_e2e_locally`)
Expected: the `audit-log.spec.ts` tests pass. Note: per project memory, manager-role E2E can be flaky and pass on retry — this spec does not use the manager role.

- [ ] **Step 5: Commit**

```bash
git add e2e/tests/platform/audit-log.spec.ts playwright.config.ts
git commit -m "test(audit): E2E traceability + tenant isolation of audit retrieval (EVE-55)"
```

---

## Task 14: Design + scope documentation

**Files:**
- Create: `docs/audit-logging.md`

The issue is framed as a design task whose acceptance criteria require the scope, evidence requirements, and security expectations to be clearly defined. This doc captures them and points at the implementation.

- [ ] **Step 1: Write `docs/audit-logging.md`**

```markdown
# Audit Logging & Compliance Traceability (EVE-55)

## Purpose

Every sensitive platform operation emits a durable, tamper-evident, tenant-scoped
audit record so enterprise customers can satisfy operational-review and compliance
requirements.

## Scope — what is audited

| Domain | Actions | Emitted from |
|---|---|---|
| Provisioning | `provisioning.run.start/complete/rollback/manual`, `provisioning.step.complete/retry/fail`, `provisioning.compensate.fail` | `ProvisioningOrchestrator` via `DurableProvisioningAuditSink` |
| Tenant lifecycle | `lifecycle.suspend/reactivate/decommission/override` | `TenantLifecycleService` via `DurableControlPlaneAuditSink` |
| Credentials | `credentials.rotate` | `CredentialRotationService` via `DurableControlPlaneAuditSink` |
| Tenant config | `config.branding`, `config.feature_flags`, `config.byodb_register` | board settings routes via `safeRecord` |

Each record captures: tenant context (`tenant_id`), actor attribution
(`actor_id`, `actor_label`, `actor_role`), action, outcome (`ok`/`error`),
resource (`resource_type`/`resource_id`), structured `details`, optional `error`,
and immutable timestamp.

## Tamper-evidence

`public.audit_logs` is append-only and hash-chained, enforced in the database:

- **Hash chain** — a `BEFORE INSERT` trigger sets `row_hash = sha256(prev_hash || canonical(row))`,
  where `prev_hash` is the previous row's `row_hash`. Inserts are serialized with a
  transaction advisory lock so the chain is consistent under concurrency.
- **Append-only** — a `BEFORE UPDATE/DELETE` trigger rejects all mutations. This
  holds even for the service role (RLS is bypassed by the service role; triggers
  are not). The sole exception is `purge_audit_logs()`, which sets a
  transaction-local flag the trigger honors.
- **Verification** — `verify_audit_chain()` recomputes every hash and checks
  linkage, returning the first broken `seq` (or none). Run it on demand or from a
  scheduled integrity check.

## Access control & tenant isolation

- Writes: service-role only (the recorder uses `createServiceClient()`); no
  write/update/delete RLS policies exist for authenticated users.
- Reads: RLS policies `audit_logs_select_own` (tenant owner) and
  `audit_logs_select_platform_admin` (platform_admin). The board read API uses the
  RLS user client so isolation is enforced by the database; the platform read API
  is path-scoped and platform-admin-guarded.
- Sensitive fields: `redactSensitive()` masks credential-like keys at write time;
  callers must never pass raw secrets. Credential VALUES are never recorded — only
  `vault_secret_id` references (themselves redacted).

## Retention

Documented window: **365 days**. `purge_audit_logs(interval)` is the only
authorized deletion path; it leaves a verifiable chain (purging the oldest prefix
re-anchors the chain at the new lowest `seq`). Scheduling the purge is deferred to
the observability/backup foundation (EVE-41); for now it is invoked manually.

## Evidence retrieval

- `GET /api/platform/tenants/:tenantId/audit` — platform_admin, any tenant.
- `GET /api/board/audit-log` — tenant owner, own tenant only (RLS).
- Filters: `action`, `actor`, `from`, `to`; keyset pagination via `cursor` + `limit`
  (≤100). Responses carry already-redacted records.

## Reliability stance

Audit is observability: it must never break the primary operation. The strict
recorder throws (so it is testable), but every integration call-site wraps it in a
best-effort adapter/helper that swallows failures. Failure paths of audited
operations still emit an `outcome: 'error'` record.

## Implementation map

- Migration: `supabase/migrations/20260630120000_create_audit_logs.sql`
- Core: `lib/audit/{types,redact,supabaseAuditRecorder,query,safeRecord}.ts`
- Adapters: `lib/audit/{controlPlaneAuditSink,provisioningAuditSink}.ts`
- APIs: `app/api/platform/tenants/[tenantId]/audit/route.ts`, `app/api/board/audit-log/route.ts`
- Tests: `test/unit/lib/audit/*`, `test/integration/audit-log.test.ts`, `e2e/tests/platform/audit-log.spec.ts`
```

- [ ] **Step 2: Commit**

```bash
git add docs/audit-logging.md
git commit -m "docs(audit): audit-logging scope, security, retention, retrieval (EVE-55)"
```

---

## Task 15: Full verification sweep

**Files:** none (verification only).

- [ ] **Step 1: Run the complete local check suite**

Run: `make check`
Expected: lint, typecheck, unit tests, token build, and build all PASS.

- [ ] **Step 2: Run the integration suite against local Supabase**

Run: `make db-start` (if needed) → `make migrate` → `make test-integration`
Expected: both `tenant-provisioning` and `audit-log` integration suites PASS.

- [ ] **Step 3: Run the E2E platform project**

Run: `make e2e` (per `TESTING.md` prerequisites)
Expected: provisioning, lifecycle, and audit-log specs PASS (retry once if a known-flaky non-audit test trips).

- [ ] **Step 4: Confirm no secret leakage in audit output (manual evidence)**

After the integration suite, write one record with a credential-shaped `details`
and confirm the stored row is redacted (this is already asserted in
`supabaseAuditRecorder.test.ts` and exercised in integration — re-read those
assertions to confirm coverage rather than adding ad-hoc checks).

- [ ] **Step 5: Final state**

Confirm `git status` is clean and all task commits are present:

Run: `git log --oneline -15`
Expected: the EVE-55 commits from Tasks 1–14 are listed.

---

## Self-Review (completed by plan author)

**Spec coverage:**
- "Define audit logging requirements for provisioning, access changes, configuration changes" → Tasks 6, 7, 8 + doc (Task 14). ✓
- "event structure, actor attribution, tenant context, retention, evidence retrieval" → schema (Task 4), actor via adapters/routes (Tasks 6–9), retention purge (Task 4) + doc, retrieval APIs (Tasks 11–12). ✓
- "tamper-evident, access-controlled, tenant-safe" → hash chain + append-only triggers + RLS (Task 4), verified (Task 5). ✓
- "Prevent cross-tenant leaks in storage, query surfaces, reporting" → RLS (Task 4), RLS-enforced board read (Task 12), isolation tests (Tasks 5, 13). ✓
- "Protect sensitive fields while preserving forensic usefulness" → `redactSensitive` (Task 2), credential-free byodb audit (Task 9). ✓
- "privileged operations and override paths fully traceable" → override audited incl. reason (Task 6), E2E asserts override error record (Task 13). ✓
- Unit tests for generation/completeness/attribution/masking/invalid metadata → Tasks 2, 3, 6, 7, 9, 10. ✓
- Tenant-scoped storage/query tests → Tasks 5 (integration RLS), 10 (query unit), 13 (E2E). ✓
- E2E for sensitive actions, retrieval without cross-tenant exposure, failure-path evidence → Task 13. ✓

**Type consistency:** `AuditActor`/`AuditRecordInput`/`AuditRecorder` defined in Task 1 are used identically across Tasks 3, 6, 7, 9, 10. `redactSensitive` (Task 2) used in Task 3. `queryAuditLogs` signature (Task 10) used unchanged in Tasks 11–12. Action namespacing (`lifecycle.*`, `provisioning.*`, `config.*`, `credentials.rotate`) consistent between adapters (Tasks 6–7), routes (Task 9), doc (Task 14), and E2E assertions (Task 13).

**Placeholder scan:** no TBD/TODO/"add error handling"-style placeholders; every code step contains complete code. The two notes that say "adapt if shape differs" (E2E tenant discovery, recorder test import fix) include the exact corrective action.
