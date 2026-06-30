# Control-Plane Tenant Lifecycle & Distribution (EVE-37) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the control-plane on top of the EVE-45 provisioning workflow — the rest of the tenant lifecycle (suspend / reactivate / decommission + audited privileged override), BYODB credential rotation, a tenant-scoped control-plane config-distribution API, and routing enforcement so only `Active` tenants are routable.

**Architecture:** A new `lib/tenant/controlplane/` module adds a `TenantLifecycleService` (validates transitions via the existing state machine, persists via an injected store, emits audit events through a no-op `ControlPlaneAuditSink` seam), a `CredentialRotationService` (validate-new → store → swap `vault_secret_id` → delete-old → rollback), and a `ControlPlaneConfigResolver` (returns a tenant-scoped snapshot of state/flags/config/metering). Platform-admin API routes expose these; the platform layout uses an `isRoutable` check to block non-`Active` tenants. All of this reuses EVE-45/EVE-145 primitives (state machine, credentials, probe, Vault store, Supabase service client) and adds **no new migrations**.

**Tech Stack:** TypeScript, Next.js 16 App Router (route handlers + server components), Supabase (Postgres + RLS, service-role client, Vault RPCs), Vitest (unit), Playwright (E2E).

---

## Context for the implementer

**Scope boundary (decided before planning):**
- EVE-45 (provisioning: register→activate, bootstrap, readiness, rollback) is **already implemented and merged** in `lib/tenant/provisioning/`. Do not rebuild it.
- EVE-46 (deployment orchestrator / BYO-cloud environments / CI-CD) and the vague tenant "upgrade" flow are **out of scope** — documented as dependencies only.
- Audit reuses the **no-op sink seam** pattern from EVE-45; the durable audit log is **EVE-55**.

**What already exists and is reused (do NOT rebuild):**
- `lib/tenant/types.ts` — `Tenant` (`{ id, owner_id, name, state, created_at, updated_at }`), `TenantState` (`Registered|Provisioning|Active|Suspended|Decommissioned`), `InvalidStateTransitionError`.
- `lib/tenant/stateMachine.ts` — `transition(from, to)` (pure; throws `InvalidStateTransitionError`); `TRANSITIONS` already allows `Active→[Suspended,Decommissioned]`, `Suspended→[Active,Decommissioned]`, `Decommissioned→[]`.
- `lib/tenant/credentials.ts` — `normalizeCredential(input)`, `BYODBCredentialInput`, `CredentialValidationError`.
- `lib/tenant/probe.ts` — `ConnectivityProbe`, `ProbeResult` (`{ reachable, ownsSchema, error? }`), `ConnectivityError`. `lib/tenant/probeDriver.ts` — `RealConnectivityProbe` (5 s timeout; passwords never in error strings).
- `lib/tenant/vault.ts` — `VaultStore` (`store(name, secret): Promise<{secretId}>`, `delete(secretId): Promise<void>`), `VaultStorageError`. `lib/tenant/vaultStore.ts` — `SupabaseVaultStore(client?)` (RPCs `store_byodb_secret`, `delete_byodb_secret`; service-role only).
- `lib/tenant/provisioning/` — orchestrator, 6 steps (incl. `steps/bindByodb.ts`), `supabaseProvisioningDb.ts`, `buildOrchestrator.ts`, `audit.ts` (the EVE-45 `AuditSink` seam).
- `lib/supabase/service.ts` — `createServiceClient()` (service-role, bypasses RLS). `lib/supabase/server.ts` — `createClient()` (request-scoped, RLS).
- `tenants` columns include `state`, `feature_flags JSONB`, **`vault_secret_id UUID` (exists, currently never written)**. `tenant_config(tenant_id, settings JSONB)`, `tenant_storage_metering(tenant_id, bytes_used BIGINT, quota_bytes BIGINT)` (EVE-45).
- `app/api/platform/tenants/[tenantId]/provision/route.ts` — the route auth/role pattern (`requirePlatformAdmin`: `createClient()` → `auth.getUser()` → `users.role === 'platform_admin'`; then `createServiceClient()` for writes; `await params`).
- `app/(dashboard)/platform/layout.tsx` — resolves `platform_active_tenant` cookie, renders `BlockedScreen` for sub-routes without a tenant. `components/platform/BlockedScreen.tsx` — `EmptyState` with a configurable message.
- Vitest: tests under `test/unit/...`, `@` → repo root, `server-only` shimmed. Run one file: `npx vitest run <path>`. E2E under `e2e/tests/<area>/`; **a `platform` Playwright project exists scoped via `testMatch` to `tenant-provisioning.spec.ts`** (EVE-45) — this plan adds a second `testMatch` entry, see Task 14.

**Naming contract (used consistently across all tasks):**
- `LifecycleAction = 'suspend' | 'reactivate' | 'decommission' | 'override'`
- `isRoutable(state: TenantState): boolean` (returns `state === 'Active'`)
- Interfaces: `ControlPlaneStore`, `CredentialRotationStore`, `ControlPlaneReadStore`, `ControlPlaneAuditSink`; classes `TenantLifecycleService`, `CredentialRotationService`, `ControlPlaneConfigResolver`, `SupabaseControlPlaneStore`.
- `ControlPlaneAuditEvent = { tenantId, actor, action, outcome: 'ok'|'error', reason?, error?, at }`.

**Every commit message ends with:**
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

**End-to-end env note (for the E2E task):** local E2E requires **Node ≥22** (`nvm use 22`; supabase-js realtime needs native WebSocket), `.env.local` in the working dir, local Supabase running, and `supabase db reset` applied. See the `running-e2e-locally` memory.

---

## File Structure

**Architecture doc**
- Create: `docs/superpowers/specs/2026-06-30-control-plane-architecture.md`

**Control-plane module (`lib/tenant/controlplane/`)**
- `types.ts` — `LifecycleAction`, `isRoutable`, interfaces `ControlPlaneStore`/`CredentialRotationStore`/`ControlPlaneReadStore`, `ControlPlaneSnapshot`.
- `errors.ts` — `TenantNotFoundError`, `OverrideError`.
- `audit.ts` — `ControlPlaneAuditEvent`, `ControlPlaneAuditSink`, `noopControlPlaneAuditSink`.
- `lifecycleService.ts` — `TenantLifecycleService`.
- `credentialRotation.ts` — `CredentialRotationService`.
- `configResolver.ts` — `ControlPlaneConfigResolver`.
- `supabaseStore.ts` — `SupabaseControlPlaneStore` (implements all three store interfaces).

**Shared route helper**
- `lib/platform/requirePlatformAdmin.ts` — extracted guard (`Promise<{ user } | { error: NextResponse }>`).

**API routes**
- `app/api/platform/tenants/[tenantId]/lifecycle/route.ts` — `POST` (suspend/reactivate/decommission/override).
- `app/api/platform/tenants/[tenantId]/credentials/rotate/route.ts` — `POST`.
- `app/api/platform/tenants/[tenantId]/config/route.ts` — `GET`.

**Provisioning extension (rotation prerequisite)**
- Modify: `lib/tenant/provisioning/steps/bindByodb.ts` (optional persist callback).
- Modify: `lib/tenant/provisioning/supabaseProvisioningDb.ts` (add concrete `setVaultSecretId`).
- Modify: `lib/tenant/provisioning/buildOrchestrator.ts` (wire the callback).

**Routing enforcement**
- Modify: `app/(dashboard)/platform/layout.tsx` (block non-routable active tenant).

**Tests**
- `test/unit/lib/tenant/controlplane/{isRoutable,lifecycleService,credentialRotation,configResolver}.test.ts`
- `test/unit/lib/tenant/provisioning/steps/bindByodb.test.ts` (append persistence cases)
- `e2e/tests/platform/tenant-lifecycle.spec.ts`

---

## Part A — Architecture doc & control-plane foundation

### Task 1: Control-plane architecture document

**Files:**
- Create: `docs/superpowers/specs/2026-06-30-control-plane-architecture.md`

- [ ] **Step 1: Write the doc**

```markdown
# Control-Plane & Tenant Provisioning Architecture (EVE-37)

## Responsibilities & boundaries
The control plane owns tenant lifecycle state and the metadata downstream systems
depend on. It does NOT run tenant workloads or provision infrastructure (EVE-46).

| Concern | Owner | Module |
|---|---|---|
| Tenant lifecycle state | Control plane | `lib/tenant/stateMachine.ts`, `lib/tenant/controlplane/lifecycleService.ts` |
| Provisioning (register→activate) | Control plane | `lib/tenant/provisioning/` (EVE-45) |
| BYODB credentials | Control plane (Vault) | `lib/tenant/vault*.ts`, `controlplane/credentialRotation.ts` |
| Config distribution to downstream | Control plane | `controlplane/configResolver.ts` |
| Deployment / environments | Deployment orchestrator | EVE-46 (out of scope) |
| Durable audit log | Audit subsystem | EVE-55 (out of scope; seam here) |

## Tenant lifecycle
States: `Registered → Provisioning → Active → Suspended → Decommissioned`.
- Provisioning (EVE-45): `Registered → Provisioning → Active` with rollback.
- Suspend: `Active → Suspended` (tenant becomes non-routable; data retained).
- Reactivate: `Suspended → Active`.
- Decommission: `Active|Suspended → Decommissioned` (terminal; BYODB secret deleted).
- Override (privileged): platform-admin forces a target state with a required
  `reason`, audited. Used to recover stuck tenants. Cannot resurrect a
  `Decommissioned` tenant (terminal).
Only `Active` is **routable** (`isRoutable`). Suspended/Decommissioned/Provisioning
are non-routable.

## BYODB credential management
Credentials are validated (parse + connectivity probe with schema-ownership check)
before storage, stored only in Supabase Vault (never a plaintext column or log), and
referenced by `tenants.vault_secret_id`. Rotation validates the new credential before
swapping the reference and deletes the old secret; failure rolls back to the old
secret. Decommission deletes the secret.

## Downstream dependencies on control-plane state
Routing, feature flagging, storage metering, and cross-platform clients read a
tenant-scoped `ControlPlaneSnapshot` (`{ status, routable, featureFlags, config,
metering }`) only with a **validated tenant context** (platform-admin, or the tenant
owner for their own tenant). No caller can read another tenant's control-plane state
(enforced by route guard + RLS).

## Security, audit, rollback
- Every lifecycle/rotation/override action validates tenant identity + role before
  mutating, runs through the service-role client, and emits a `ControlPlaneAuditEvent`
  (no credentials in events). Durable persistence is EVE-55.
- Rollback: provisioning (EVE-45) and rotation both restore prior state on failure;
  a failed action never leaves a tenant `Active` (routable) when it should not be.

## Out of scope (dependencies)
EVE-46 deployment orchestration; EVE-55 durable audit log; runtime BYODB query
execution (no consumer reads the stored secret yet).
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-06-30-control-plane-architecture.md
git commit -m "docs(control-plane): EVE-37 control-plane architecture"
```

---

### Task 2: Control-plane types, `isRoutable`, errors

**Files:**
- Create: `lib/tenant/controlplane/types.ts`
- Create: `lib/tenant/controlplane/errors.ts`
- Test: `test/unit/lib/tenant/controlplane/isRoutable.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { isRoutable } from '@/lib/tenant/controlplane/types'
import type { TenantState } from '@/lib/tenant/types'

describe('isRoutable', () => {
  it('is true only for Active', () => {
    expect(isRoutable('Active')).toBe(true)
  })

  it('is false for every non-Active state', () => {
    const nonActive: TenantState[] = ['Registered', 'Provisioning', 'Suspended', 'Decommissioned']
    for (const s of nonActive) expect(isRoutable(s)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/tenant/controlplane/isRoutable.test.ts`
Expected: FAIL — cannot resolve `@/lib/tenant/controlplane/types`.

- [ ] **Step 3: Write `types.ts`**

```typescript
import type { Tenant, TenantState } from '@/lib/tenant/types'

export type LifecycleAction = 'suspend' | 'reactivate' | 'decommission' | 'override'

/** A tenant is routable (its workspace may be entered) only when Active. */
export function isRoutable(state: TenantState): boolean {
  return state === 'Active'
}

/** Read/write of tenant lifecycle state. */
export interface ControlPlaneStore {
  getTenant(tenantId: string): Promise<Tenant | null>
  setTenantState(tenantId: string, state: TenantState): Promise<void>
}

/** Read/write of the Vault secret reference for a tenant (rotation + decommission). */
export interface CredentialRotationStore {
  getVaultSecretId(tenantId: string): Promise<string | null>
  setVaultSecretId(tenantId: string, secretId: string | null): Promise<void>
}

/** A tenant-scoped snapshot of control-plane state for downstream consumers. */
export interface ControlPlaneSnapshot {
  tenantId: string
  status: TenantState
  routable: boolean
  featureFlags: Record<string, boolean>
  config: Record<string, unknown>
  metering: { bytesUsed: number; quotaBytes: number } | null
}

/** Reads needed to assemble a ControlPlaneSnapshot. */
export interface ControlPlaneReadStore {
  getStateAndFlags(
    tenantId: string,
  ): Promise<{ state: TenantState; featureFlags: Record<string, boolean> } | null>
  getConfig(tenantId: string): Promise<Record<string, unknown> | null>
  getMetering(tenantId: string): Promise<{ bytesUsed: number; quotaBytes: number } | null>
}
```

- [ ] **Step 4: Write `errors.ts`**

```typescript
/** A control-plane action referenced a tenant that does not exist. */
export class TenantNotFoundError extends Error {
  constructor(public readonly tenantId: string) {
    super(`Tenant not found: ${tenantId}`)
    this.name = 'TenantNotFoundError'
  }
}

/** A privileged override was rejected (e.g. target is a terminal state, or no reason). */
export class OverrideError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OverrideError'
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/tenant/controlplane/isRoutable.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/tenant/controlplane/types.ts lib/tenant/controlplane/errors.ts test/unit/lib/tenant/controlplane/isRoutable.test.ts
git commit -m "feat(control-plane): types, isRoutable, errors (EVE-37)"
```

---

### Task 3: Control-plane audit seam

**Files:**
- Create: `lib/tenant/controlplane/audit.ts`

Mirrors the EVE-45 provisioning `AuditSink` seam (no-op default; EVE-55 provides a durable implementation). A separate event shape is used because lifecycle actions are not provisioning "runs".

- [ ] **Step 1: Write the seam**

```typescript
import type { LifecycleAction } from '@/lib/tenant/controlplane/types'

/**
 * A control-plane audit event. NEVER include credentials or secret VALUES —
 * a `vault_secret_id` reference is acceptable, raw secrets are not.
 */
export interface ControlPlaneAuditEvent {
  tenantId: string
  actor: string
  action: LifecycleAction | 'rotate_credentials' | 'read_config'
  outcome: 'ok' | 'error'
  reason?: string
  error?: string
  at: string
}

/** Sink for control-plane audit events. EVE-55 provides a durable implementation. */
export interface ControlPlaneAuditSink {
  record(event: ControlPlaneAuditEvent): Promise<void>
}

/** No-op default — control-plane actions work without a durable audit log (EVE-55). */
export const noopControlPlaneAuditSink: ControlPlaneAuditSink = {
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
git add lib/tenant/controlplane/audit.ts
git commit -m "feat(control-plane): audit sink seam with no-op default (EVE-37)"
```

---

## Part B — Tenant lifecycle service & API

### Task 4: `TenantLifecycleService`

**Files:**
- Create: `lib/tenant/controlplane/lifecycleService.ts`
- Test: `test/unit/lib/tenant/controlplane/lifecycleService.test.ts`

Behaviour: each method loads the tenant (throws `TenantNotFoundError` if null), validates the transition via `transition()` (throws `InvalidStateTransitionError` on invalid), persists the new state, audits, returns the updated tenant. `decommission` additionally deletes the Vault secret (best-effort via injected store/vault) and clears `vault_secret_id`. `override` sets a target state with a required non-empty `reason`, rejecting `Decommissioned → *` (terminal) via `OverrideError`; it is audited with the reason. Credentials never appear in audit events.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { TenantLifecycleService } from '@/lib/tenant/controlplane/lifecycleService'
import { TenantNotFoundError, OverrideError } from '@/lib/tenant/controlplane/errors'
import { InvalidStateTransitionError } from '@/lib/tenant/types'
import type { ControlPlaneStore, CredentialRotationStore } from '@/lib/tenant/controlplane/types'
import type { ControlPlaneAuditSink } from '@/lib/tenant/controlplane/audit'
import type { VaultStore } from '@/lib/tenant/vault'
import type { Tenant, TenantState } from '@/lib/tenant/types'

function tenant(state: TenantState): Tenant {
  return { id: 't1', owner_id: 'o', name: 'T', state, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
}

function makeStore(initial: Tenant | null): ControlPlaneStore & CredentialRotationStore & { state: TenantState | null; secretId: string | null } {
  let current = initial
  return {
    state: initial?.state ?? null,
    secretId: 'sec-1',
    async getTenant() { return current },
    async setTenantState(_id, s) { if (current) current = { ...current, state: s }; this.state = s },
    async getVaultSecretId() { return this.secretId },
    async setVaultSecretId(_id, s) { this.secretId = s },
  }
}

function makeAudit(): ControlPlaneAuditSink & { events: { action: string; outcome: string; reason?: string; error?: string }[] } {
  const events: { action: string; outcome: string; reason?: string; error?: string }[] = []
  return { events, async record(e) { events.push({ action: e.action, outcome: e.outcome, reason: e.reason, error: e.error }) } }
}

function makeVault(): VaultStore & { delete: ReturnType<typeof vi.fn> } {
  return { store: vi.fn(), delete: vi.fn().mockResolvedValue(undefined) }
}

describe('TenantLifecycleService', () => {
  it('suspend transitions Active → Suspended, persists, and audits ok', async () => {
    const store = makeStore(tenant('Active'))
    const audit = makeAudit()
    const svc = new TenantLifecycleService(store, makeVault(), audit)

    const result = await svc.suspend('t1', 'admin@x')

    expect(result.state).toBe('Suspended')
    expect(store.state).toBe('Suspended')
    expect(audit.events).toContainEqual({ action: 'suspend', outcome: 'ok', reason: undefined, error: undefined })
  })

  it('reactivate transitions Suspended → Active', async () => {
    const store = makeStore(tenant('Suspended'))
    const svc = new TenantLifecycleService(store, makeVault(), makeAudit())
    expect((await svc.reactivate('t1', 'admin@x')).state).toBe('Active')
  })

  it('suspend on a non-Active tenant throws InvalidStateTransitionError and audits error', async () => {
    const store = makeStore(tenant('Registered'))
    const audit = makeAudit()
    const svc = new TenantLifecycleService(store, makeVault(), audit)
    await expect(svc.suspend('t1', 'admin@x')).rejects.toThrow(InvalidStateTransitionError)
    expect(audit.events.at(-1)?.outcome).toBe('error')
    expect(store.state).toBe('Registered') // unchanged
  })

  it('throws TenantNotFoundError when the tenant does not exist', async () => {
    const svc = new TenantLifecycleService(makeStore(null), makeVault(), makeAudit())
    await expect(svc.suspend('missing', 'admin@x')).rejects.toThrow(TenantNotFoundError)
  })

  it('decommission transitions, deletes the vault secret, and clears the reference', async () => {
    const store = makeStore(tenant('Suspended'))
    const vault = makeVault()
    const svc = new TenantLifecycleService(store, vault, makeAudit())
    const result = await svc.decommission('t1', 'admin@x')
    expect(result.state).toBe('Decommissioned')
    expect(vault.delete).toHaveBeenCalledWith('sec-1')
    expect(store.secretId).toBeNull()
  })

  it('override sets a target state with a reason and audits the reason', async () => {
    const store = makeStore(tenant('Provisioning'))
    const audit = makeAudit()
    const svc = new TenantLifecycleService(store, makeVault(), audit)
    const result = await svc.override('t1', 'Decommissioned', 'admin@x', 'stuck provisioning run')
    expect(result.state).toBe('Decommissioned')
    expect(audit.events.at(-1)).toMatchObject({ action: 'override', outcome: 'ok', reason: 'stuck provisioning run' })
  })

  it('override rejects an empty reason', async () => {
    const svc = new TenantLifecycleService(makeStore(tenant('Active')), makeVault(), makeAudit())
    await expect(svc.override('t1', 'Suspended', 'admin@x', '   ')).rejects.toThrow(OverrideError)
  })

  it('override cannot resurrect a Decommissioned tenant', async () => {
    const svc = new TenantLifecycleService(makeStore(tenant('Decommissioned')), makeVault(), makeAudit())
    await expect(svc.override('t1', 'Active', 'admin@x', 'oops')).rejects.toThrow(OverrideError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/tenant/controlplane/lifecycleService.test.ts`
Expected: FAIL — cannot resolve `lifecycleService`.

- [ ] **Step 3: Write the implementation**

```typescript
import type { Tenant, TenantState } from '@/lib/tenant/types'
import { transition } from '@/lib/tenant/stateMachine'
import type { ControlPlaneStore, CredentialRotationStore } from '@/lib/tenant/controlplane/types'
import { TenantNotFoundError, OverrideError } from '@/lib/tenant/controlplane/errors'
import {
  type ControlPlaneAuditSink,
  noopControlPlaneAuditSink,
} from '@/lib/tenant/controlplane/audit'
import type { VaultStore } from '@/lib/tenant/vault'

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Orchestrates the non-provisioning tenant lifecycle: suspend, reactivate,
 * decommission, and a privileged override. Each command validates the transition,
 * persists the new state, and audits the outcome. Only Active is routable, so a
 * suspended/decommissioned tenant is non-routable by construction.
 */
export class TenantLifecycleService {
  constructor(
    private readonly store: ControlPlaneStore & CredentialRotationStore,
    private readonly vault: VaultStore,
    private readonly audit: ControlPlaneAuditSink = noopControlPlaneAuditSink,
  ) {}

  private async loadOrThrow(tenantId: string): Promise<Tenant> {
    const tenant = await this.store.getTenant(tenantId)
    if (!tenant) throw new TenantNotFoundError(tenantId)
    return tenant
  }

  private async run(
    tenantId: string,
    actor: string,
    action: 'suspend' | 'reactivate' | 'decommission',
    to: TenantState,
    after?: (tenant: Tenant) => Promise<void>,
  ): Promise<Tenant> {
    try {
      const tenant = await this.loadOrThrow(tenantId)
      const next = transition(tenant.state, to) // throws InvalidStateTransitionError
      await this.store.setTenantState(tenantId, next)
      if (after) await after(tenant)
      await this.audit.record({ tenantId, actor, action, outcome: 'ok', at: nowIso() })
      return { ...tenant, state: next, updated_at: nowIso() }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await this.audit.record({ tenantId, actor, action, outcome: 'error', error: message, at: nowIso() })
      throw err
    }
  }

  suspend(tenantId: string, actor: string): Promise<Tenant> {
    return this.run(tenantId, actor, 'suspend', 'Suspended')
  }

  reactivate(tenantId: string, actor: string): Promise<Tenant> {
    return this.run(tenantId, actor, 'reactivate', 'Active')
  }

  decommission(tenantId: string, actor: string): Promise<Tenant> {
    return this.run(tenantId, actor, 'decommission', 'Decommissioned', async () => {
      const secretId = await this.store.getVaultSecretId(tenantId)
      if (secretId) {
        await this.vault.delete(secretId)
        await this.store.setVaultSecretId(tenantId, null)
      }
    })
  }

  async override(
    tenantId: string,
    to: TenantState,
    actor: string,
    reason: string,
  ): Promise<Tenant> {
    try {
      if (!reason || reason.trim() === '') {
        throw new OverrideError('A non-empty reason is required for a privileged override')
      }
      const tenant = await this.loadOrThrow(tenantId)
      if (tenant.state === 'Decommissioned') {
        throw new OverrideError('Cannot override a Decommissioned tenant (terminal state)')
      }
      await this.store.setTenantState(tenantId, to)
      await this.audit.record({ tenantId, actor, action: 'override', outcome: 'ok', reason, at: nowIso() })
      return { ...tenant, state: to, updated_at: nowIso() }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await this.audit.record({ tenantId, actor, action: 'override', outcome: 'error', reason, error: message, at: nowIso() })
      throw err
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/tenant/controlplane/lifecycleService.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tenant/controlplane/lifecycleService.ts test/unit/lib/tenant/controlplane/lifecycleService.test.ts
git commit -m "feat(control-plane): tenant lifecycle service (suspend/reactivate/decommission/override) (EVE-37)"
```

---

### Task 5: `SupabaseControlPlaneStore` adapter

**Files:**
- Create: `lib/tenant/controlplane/supabaseStore.ts`

Thin Supabase adapter implementing `ControlPlaneStore`, `CredentialRotationStore`, and `ControlPlaneReadStore` (no dedicated unit test — exercised by the E2E in Task 14; the interface contracts are covered by the service unit tests with fakes). Constructed with a service-role client. Every method is scoped by `tenantId`.

- [ ] **Step 1: Write the implementation**

```typescript
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tenant, TenantState } from '@/lib/tenant/types'
import type {
  ControlPlaneStore,
  CredentialRotationStore,
  ControlPlaneReadStore,
} from '@/lib/tenant/controlplane/types'

/**
 * Supabase-backed control-plane store (service-role client, RLS-bypassing).
 * Implements lifecycle state read/write, the Vault secret reference, and the
 * read surface for config distribution. Every query is scoped by tenantId.
 */
export class SupabaseControlPlaneStore
  implements ControlPlaneStore, CredentialRotationStore, ControlPlaneReadStore
{
  constructor(private readonly client: SupabaseClient) {}

  async getTenant(tenantId: string): Promise<Tenant | null> {
    const { data, error } = await this.client
      .from('tenants')
      .select('id, owner_id, name, state, created_at, updated_at')
      .eq('id', tenantId)
      .maybeSingle()
    if (error) throw new Error(`getTenant failed: ${error.message}`)
    return (data as Tenant | null) ?? null
  }

  async setTenantState(tenantId: string, state: TenantState): Promise<void> {
    const { error } = await this.client.from('tenants').update({ state }).eq('id', tenantId)
    if (error) throw new Error(`setTenantState failed: ${error.message}`)
  }

  async getVaultSecretId(tenantId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('tenants').select('vault_secret_id').eq('id', tenantId).maybeSingle()
    if (error) throw new Error(`getVaultSecretId failed: ${error.message}`)
    return (data?.vault_secret_id as string | null) ?? null
  }

  async setVaultSecretId(tenantId: string, secretId: string | null): Promise<void> {
    const { error } = await this.client
      .from('tenants').update({ vault_secret_id: secretId }).eq('id', tenantId)
    if (error) throw new Error(`setVaultSecretId failed: ${error.message}`)
  }

  async getStateAndFlags(
    tenantId: string,
  ): Promise<{ state: TenantState; featureFlags: Record<string, boolean> } | null> {
    const { data, error } = await this.client
      .from('tenants').select('state, feature_flags').eq('id', tenantId).maybeSingle()
    if (error) throw new Error(`getStateAndFlags failed: ${error.message}`)
    if (!data) return null
    return {
      state: data.state as TenantState,
      featureFlags: (data.feature_flags as Record<string, boolean> | null) ?? {},
    }
  }

  async getConfig(tenantId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.client
      .from('tenant_config').select('settings').eq('tenant_id', tenantId).maybeSingle()
    if (error) throw new Error(`getConfig failed: ${error.message}`)
    return (data?.settings as Record<string, unknown> | null) ?? null
  }

  async getMetering(
    tenantId: string,
  ): Promise<{ bytesUsed: number; quotaBytes: number } | null> {
    const { data, error } = await this.client
      .from('tenant_storage_metering').select('bytes_used, quota_bytes').eq('tenant_id', tenantId).maybeSingle()
    if (error) throw new Error(`getMetering failed: ${error.message}`)
    if (!data) return null
    return { bytesUsed: data.bytes_used as number, quotaBytes: data.quota_bytes as number }
  }
}
```

- [ ] **Step 2: Verify it compiles & lints**

Run: `npx tsc --noEmit && npx eslint lib/tenant/controlplane/supabaseStore.ts`
Expected: exit 0, clean.

- [ ] **Step 3: Commit**

```bash
git add lib/tenant/controlplane/supabaseStore.ts
git commit -m "feat(control-plane): Supabase control-plane store adapter (EVE-37)"
```

---

### Task 6: Shared `requirePlatformAdmin` helper + lifecycle API route

**Files:**
- Create: `lib/platform/requirePlatformAdmin.ts`
- Create: `app/api/platform/tenants/[tenantId]/lifecycle/route.ts`

- [ ] **Step 1: Write the shared guard helper**

```typescript
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type AdminGuardResult =
  | { user: { id: string; email: string } }
  | { error: NextResponse }

/**
 * Validates the caller is an authenticated platform_admin. Uses only the
 * request-scoped (RLS) client — never the service-role client — so an
 * unauthorized caller cannot trigger privileged reads/writes.
 */
export async function requirePlatformAdmin(): Promise<AdminGuardResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'platform_admin') {
    return { error: NextResponse.json({ error: 'Forbidden — platform_admin role required' }, { status: 403 }) }
  }
  return { user: { id: user.id, email: user.email ?? user.id } }
}
```

- [ ] **Step 2: Write the lifecycle route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePlatformAdmin } from '@/lib/platform/requirePlatformAdmin'
import { SupabaseControlPlaneStore } from '@/lib/tenant/controlplane/supabaseStore'
import { TenantLifecycleService } from '@/lib/tenant/controlplane/lifecycleService'
import { SupabaseVaultStore } from '@/lib/tenant/vaultStore'
import { TenantNotFoundError, OverrideError } from '@/lib/tenant/controlplane/errors'
import { InvalidStateTransitionError, type TenantState } from '@/lib/tenant/types'
import type { LifecycleAction } from '@/lib/tenant/controlplane/types'

interface LifecycleBody {
  action: LifecycleAction
  // override only:
  toState?: TenantState
  reason?: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const guard = await requirePlatformAdmin()
  if ('error' in guard) return guard.error

  let body: LifecycleBody
  try {
    body = (await req.json()) as LifecycleBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const admin = createServiceClient()
  const store = new SupabaseControlPlaneStore(admin)
  const service = new TenantLifecycleService(store, new SupabaseVaultStore(admin))
  const actor = guard.user.email

  try {
    let tenant
    switch (body.action) {
      case 'suspend': tenant = await service.suspend(tenantId, actor); break
      case 'reactivate': tenant = await service.reactivate(tenantId, actor); break
      case 'decommission': tenant = await service.decommission(tenantId, actor); break
      case 'override':
        if (!body.toState) return NextResponse.json({ error: 'override requires toState' }, { status: 400 })
        tenant = await service.override(tenantId, body.toState, actor, body.reason ?? ''); break
      default:
        return NextResponse.json({ error: `Unknown action: ${String(body.action)}` }, { status: 400 })
    }
    return NextResponse.json({ ok: true, state: tenant.state })
  } catch (err) {
    if (err instanceof TenantNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 })
    if (err instanceof InvalidStateTransitionError) return NextResponse.json({ error: err.message }, { status: 409 })
    if (err instanceof OverrideError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}
```

- [ ] **Step 3: Verify it compiles & lints**

Run: `npx tsc --noEmit && npx eslint "app/api/platform/tenants/[tenantId]/lifecycle/route.ts" lib/platform/requirePlatformAdmin.ts`
Expected: exit 0, clean.

- [ ] **Step 4: Commit**

```bash
git add lib/platform/requirePlatformAdmin.ts "app/api/platform/tenants/[tenantId]/lifecycle/route.ts"
git commit -m "feat(control-plane): platform_admin lifecycle API route + shared guard (EVE-37)"
```

---

## Part C — BYODB credential rotation

### Task 7: Persist `vault_secret_id` during provisioning (rotation prerequisite)

**Files:**
- Modify: `lib/tenant/provisioning/steps/bindByodb.ts`
- Modify: `lib/tenant/provisioning/supabaseProvisioningDb.ts`
- Modify: `lib/tenant/provisioning/buildOrchestrator.ts`
- Test: `test/unit/lib/tenant/provisioning/steps/bindByodb.test.ts` (append cases)

The bind step gains an **optional** persist callback so existing EVE-45 tests (which call `createBindByodbStep(probe, vault)`) keep passing unchanged. Provisioning now records the Vault secret id on the tenant so rotation/decommission can find it.

- [ ] **Step 1: Append failing tests to `bindByodb.test.ts`**

Add these tests inside the existing `describe('bind_byodb step', ...)` block (the existing `probeOf`/`vaultOf`/`ctx` helpers are already defined in the file):

```typescript
  it('calls the optional persist callback with the stored secret id on success', async () => {
    const persist = vi.fn().mockResolvedValue(undefined)
    const step = createBindByodbStep(probeOf({ reachable: true, ownsSchema: true }), vaultOf('stored-id'), persist)
    const c = ctx()
    await step.run(c)
    expect(persist).toHaveBeenCalledWith('tenant-1', 'stored-id')
  })

  it('compensate clears the persisted secret id (null) before deleting the vault secret', async () => {
    const persist = vi.fn().mockResolvedValue(undefined)
    const vault = vaultOf()
    const step = createBindByodbStep(probeOf({ reachable: true, ownsSchema: true }), vault, persist)
    const c = ctx()
    c.secretId = 'sec-9'
    await step.compensate(c)
    expect(persist).toHaveBeenCalledWith('tenant-1', null)
    expect(vault.delete).toHaveBeenCalledWith('sec-9')
  })
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run test/unit/lib/tenant/provisioning/steps/bindByodb.test.ts`
Expected: FAIL — `createBindByodbStep` ignores the 3rd argument (persist not called).

- [ ] **Step 3: Update `bindByodb.ts`**

Replace the existing `createBindByodbStep` signature/body with:

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
 * bind_byodb — validate + connectivity-probe BYODB credentials, store them in Vault,
 * and (optionally) persist the resulting secret id on the tenant so rotation and
 * decommission can later reference / delete it. Does NOT change tenant state.
 *
 * `persistSecretId` is optional: when omitted (the EVE-45 default) the step behaves
 * exactly as before. buildOrchestrator wires it to SupabaseProvisioningDb.setVaultSecretId.
 */
export function createBindByodbStep(
  probe: ConnectivityProbe,
  vault: VaultStore,
  persistSecretId?: (tenantId: string, secretId: string | null) => Promise<void>,
): ProvisioningStep {
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
      if (persistSecretId) await persistSecretId(ctx.tenant.id, stored.secretId)
    },

    async compensate(ctx: ProvisioningContext): Promise<void> {
      if (ctx.secretId) {
        if (persistSecretId) await persistSecretId(ctx.tenant.id, null)
        await vault.delete(ctx.secretId)
      }
    },
  }
}
```

- [ ] **Step 4: Add `setVaultSecretId` to `SupabaseProvisioningDb`**

In `lib/tenant/provisioning/supabaseProvisioningDb.ts`, add this method to the class (it is a concrete extension, not part of the `ProvisioningDb` interface, so no fakes change):

```typescript
  /** Persist (or clear) the Vault secret reference on the tenant row. */
  async setVaultSecretId(tenantId: string, secretId: string | null): Promise<void> {
    const { error } = await this.client
      .from('tenants').update({ vault_secret_id: secretId }).eq('id', tenantId)
    if (error) throw new Error(`setVaultSecretId failed: ${error.message}`)
  }
```

- [ ] **Step 5: Wire the callback in `buildOrchestrator.ts`**

In `lib/tenant/provisioning/buildOrchestrator.ts`, change the `createBindByodbStep(...)` line so it passes the persist callback bound to the concrete db:

```typescript
    createBindByodbStep(
      new RealConnectivityProbe(),
      new SupabaseVaultStore(admin),
      (tenantId, secretId) => db.setVaultSecretId(tenantId, secretId),
    ),
```

(`db` is the existing `new SupabaseProvisioningDb(admin)` already constructed in this function.)

- [ ] **Step 6: Run the full provisioning suite to verify nothing broke + new tests pass**

Run: `npx vitest run test/unit/lib/tenant/provisioning && npx tsc --noEmit`
Expected: all provisioning tests pass (the original 7 bind tests + 2 new = 9), tsc exit 0.

- [ ] **Step 7: Commit**

```bash
git add lib/tenant/provisioning/steps/bindByodb.ts lib/tenant/provisioning/supabaseProvisioningDb.ts lib/tenant/provisioning/buildOrchestrator.ts test/unit/lib/tenant/provisioning/steps/bindByodb.test.ts
git commit -m "feat(provisioning): persist vault_secret_id on bind for rotation/decommission (EVE-37)"
```

---

### Task 8: `CredentialRotationService`

**Files:**
- Create: `lib/tenant/controlplane/credentialRotation.ts`
- Test: `test/unit/lib/tenant/controlplane/credentialRotation.test.ts`

Behaviour of `rotate(tenantId, newInput, actor)`: load tenant (404 if missing); guard the tenant is `Active` or `Suspended` (cannot rotate a `Registered`/`Provisioning`/`Decommissioned` tenant); `normalizeCredential(newInput)` (propagates `CredentialValidationError`); `probe(params)` — must be `reachable && ownsSchema` else `ConnectivityError`; read the **old** `vault_secret_id`; store the new secret under a unique name `byodb/<tenantId>/<uuid>`; persist the new id; delete the old secret (if any). On a failure **after** the new secret is stored, roll back by deleting the new secret and restoring the old id, then re-throw. Credentials never appear in audit events. A `makeId` function (defaulting to `crypto.randomUUID`) is injected for deterministic tests.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { CredentialRotationService } from '@/lib/tenant/controlplane/credentialRotation'
import { TenantNotFoundError } from '@/lib/tenant/controlplane/errors'
import { CredentialValidationError } from '@/lib/tenant/credentials'
import { ConnectivityError } from '@/lib/tenant/probe'
import type { ConnectivityProbe, ProbeResult } from '@/lib/tenant/probe'
import type { VaultStore } from '@/lib/tenant/vault'
import type { ControlPlaneStore, CredentialRotationStore } from '@/lib/tenant/controlplane/types'
import type { ControlPlaneAuditSink } from '@/lib/tenant/controlplane/audit'
import type { BYODBCredentialInput } from '@/lib/tenant/credentials'
import type { Tenant, TenantState } from '@/lib/tenant/types'

const NEW_INPUT: BYODBCredentialInput = {
  kind: 'structured',
  params: { engine: 'postgres', host: 'db', port: 5432, database: 'd', user: 'u', password: 'p' },
}

function tenant(state: TenantState): Tenant {
  return { id: 't1', owner_id: 'o', name: 'T', state, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
}
function makeStore(t: Tenant | null, oldSecret: string | null) {
  return {
    secretId: oldSecret as string | null,
    async getTenant() { return t },
    async setTenantState() {},
    async getVaultSecretId() { return this.secretId },
    async setVaultSecretId(_id: string, s: string | null) { this.secretId = s },
  } satisfies ControlPlaneStore & CredentialRotationStore & { secretId: string | null }
}
function probeOf(r: ProbeResult): ConnectivityProbe { return { probe: vi.fn().mockResolvedValue(r) } }
function vaultOf(): VaultStore & { store: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } {
  return { store: vi.fn().mockResolvedValue({ secretId: 'new-sec' }), delete: vi.fn().mockResolvedValue(undefined) }
}
function audit(): ControlPlaneAuditSink & { events: { outcome: string }[] } {
  const events: { outcome: string }[] = []
  return { events, async record(e) { events.push({ outcome: e.outcome }) } }
}
const fixedId = () => 'uuid-1'

describe('CredentialRotationService.rotate', () => {
  it('validates, stores the new secret under a unique name, swaps the reference, deletes the old', async () => {
    const store = makeStore(tenant('Active'), 'old-sec')
    const vault = vaultOf()
    const svc = new CredentialRotationService(store, probeOf({ reachable: true, ownsSchema: true }), vault, audit(), fixedId)

    const result = await svc.rotate('t1', NEW_INPUT, 'admin@x')

    expect(vault.store).toHaveBeenCalledWith('byodb/t1/uuid-1', expect.any(String))
    expect(store.secretId).toBe('new-sec')
    expect(vault.delete).toHaveBeenCalledWith('old-sec')
    expect(result.secretId).toBe('new-sec')
  })

  it('throws TenantNotFoundError for a missing tenant', async () => {
    const svc = new CredentialRotationService(makeStore(null, null), probeOf({ reachable: true, ownsSchema: true }), vaultOf(), audit(), fixedId)
    await expect(svc.rotate('missing', NEW_INPUT, 'admin@x')).rejects.toThrow(TenantNotFoundError)
  })

  it('refuses to rotate a non-active/suspended tenant', async () => {
    const svc = new CredentialRotationService(makeStore(tenant('Registered'), null), probeOf({ reachable: true, ownsSchema: true }), vaultOf(), audit(), fixedId)
    await expect(svc.rotate('t1', NEW_INPUT, 'admin@x')).rejects.toThrow(/Active or Suspended/)
  })

  it('rejects invalid credentials before probing or storing', async () => {
    const probe = probeOf({ reachable: true, ownsSchema: true })
    const vault = vaultOf()
    const svc = new CredentialRotationService(makeStore(tenant('Active'), 'old-sec'), probe, vault, audit(), fixedId)
    const bad: BYODBCredentialInput = { kind: 'structured', params: { engine: 'postgres', host: '', port: 5432, database: 'd', user: 'u', password: 'p' } }
    await expect(svc.rotate('t1', bad, 'admin@x')).rejects.toThrow(CredentialValidationError)
    expect(probe.probe).not.toHaveBeenCalled()
    expect(vault.store).not.toHaveBeenCalled()
  })

  it('throws ConnectivityError and stores nothing when the new credential is unreachable', async () => {
    const vault = vaultOf()
    const svc = new CredentialRotationService(makeStore(tenant('Active'), 'old-sec'), probeOf({ reachable: false, ownsSchema: false }), vault, audit(), fixedId)
    await expect(svc.rotate('t1', NEW_INPUT, 'admin@x')).rejects.toThrow(ConnectivityError)
    expect(vault.store).not.toHaveBeenCalled()
  })

  it('rolls back the new secret and keeps the old reference when persisting the new id fails', async () => {
    const store = makeStore(tenant('Active'), 'old-sec')
    const vault = vaultOf()
    // make setVaultSecretId throw on the swap
    store.setVaultSecretId = vi.fn().mockRejectedValueOnce(new Error('db down'))
    const svc = new CredentialRotationService(store, probeOf({ reachable: true, ownsSchema: true }), vault, audit(), fixedId)

    await expect(svc.rotate('t1', NEW_INPUT, 'admin@x')).rejects.toThrow('db down')
    expect(vault.delete).toHaveBeenCalledWith('new-sec') // new secret removed
    expect(vault.delete).not.toHaveBeenCalledWith('old-sec') // old secret retained
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/tenant/controlplane/credentialRotation.test.ts`
Expected: FAIL — cannot resolve `credentialRotation`.

- [ ] **Step 3: Write the implementation**

```typescript
import { normalizeCredential, type BYODBCredentialInput } from '@/lib/tenant/credentials'
import { type ConnectivityProbe, ConnectivityError } from '@/lib/tenant/probe'
import type { VaultStore } from '@/lib/tenant/vault'
import type { ControlPlaneStore, CredentialRotationStore } from '@/lib/tenant/controlplane/types'
import { TenantNotFoundError } from '@/lib/tenant/controlplane/errors'
import {
  type ControlPlaneAuditSink,
  noopControlPlaneAuditSink,
} from '@/lib/tenant/controlplane/audit'

function nowIso(): string {
  return new Date().toISOString()
}

export interface RotationResult {
  secretId: string
}

/**
 * Rotates a tenant's BYODB credential safely: validate + probe the new credential,
 * store it under a fresh unique Vault name, swap the tenant's vault_secret_id, then
 * delete the old secret. If the swap fails after the new secret is stored, the new
 * secret is deleted and the old reference is left intact. Credentials are never
 * logged or placed in audit events.
 */
export class CredentialRotationService {
  constructor(
    private readonly store: ControlPlaneStore & CredentialRotationStore,
    private readonly probe: ConnectivityProbe,
    private readonly vault: VaultStore,
    private readonly audit: ControlPlaneAuditSink = noopControlPlaneAuditSink,
    private readonly makeId: () => string = () => crypto.randomUUID(),
  ) {}

  async rotate(tenantId: string, input: BYODBCredentialInput, actor: string): Promise<RotationResult> {
    try {
      const tenant = await this.store.getTenant(tenantId)
      if (!tenant) throw new TenantNotFoundError(tenantId)
      if (tenant.state !== 'Active' && tenant.state !== 'Suspended') {
        throw new ConnectivityError(
          `Tenant ${tenantId} must be Active or Suspended to rotate credentials, got ${tenant.state}`,
        )
      }

      const params = normalizeCredential(input) // throws CredentialValidationError

      const result = await this.probe.probe(params)
      if (!result.reachable || !result.ownsSchema) {
        throw new ConnectivityError(
          `New BYODB credential failed validation for tenant ${tenantId}: ${
            result.error ?? (!result.reachable ? 'unreachable' : 'no schema ownership')
          }`,
        )
      }

      const oldSecretId = await this.store.getVaultSecretId(tenantId)
      const stored = await this.vault.store(`byodb/${tenantId}/${this.makeId()}`, JSON.stringify(params))

      // Swap the reference; if this fails, remove the new secret and keep the old.
      try {
        await this.store.setVaultSecretId(tenantId, stored.secretId)
      } catch (swapErr) {
        await this.vault.delete(stored.secretId).catch(() => undefined)
        throw swapErr
      }

      if (oldSecretId) {
        await this.vault.delete(oldSecretId).catch(() => undefined)
      }

      await this.audit.record({ tenantId, actor, action: 'rotate_credentials', outcome: 'ok', at: nowIso() })
      return { secretId: stored.secretId }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await this.audit.record({ tenantId, actor, action: 'rotate_credentials', outcome: 'error', error: message, at: nowIso() })
      throw err
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/tenant/controlplane/credentialRotation.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tenant/controlplane/credentialRotation.ts test/unit/lib/tenant/controlplane/credentialRotation.test.ts
git commit -m "feat(control-plane): BYODB credential rotation service (EVE-37)"
```

---

### Task 9: Credential rotation API route

**Files:**
- Create: `app/api/platform/tenants/[tenantId]/credentials/rotate/route.ts`

- [ ] **Step 1: Write the route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePlatformAdmin } from '@/lib/platform/requirePlatformAdmin'
import { SupabaseControlPlaneStore } from '@/lib/tenant/controlplane/supabaseStore'
import { CredentialRotationService } from '@/lib/tenant/controlplane/credentialRotation'
import { SupabaseVaultStore } from '@/lib/tenant/vaultStore'
import { RealConnectivityProbe } from '@/lib/tenant/probeDriver'
import { TenantNotFoundError } from '@/lib/tenant/controlplane/errors'
import { CredentialValidationError, type BYODBCredentialInput } from '@/lib/tenant/credentials'
import { ConnectivityError } from '@/lib/tenant/probe'

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const guard = await requirePlatformAdmin()
  if ('error' in guard) return guard.error

  let input: unknown
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const admin = createServiceClient()
  const service = new CredentialRotationService(
    new SupabaseControlPlaneStore(admin),
    new RealConnectivityProbe(),
    new SupabaseVaultStore(admin),
  )

  try {
    const result = await service.rotate(tenantId, input as BYODBCredentialInput, guard.user.email)
    return NextResponse.json({ ok: true, secretId: result.secretId })
  } catch (err) {
    if (err instanceof TenantNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 })
    if (err instanceof CredentialValidationError) return NextResponse.json({ error: err.message }, { status: 400 })
    if (err instanceof ConnectivityError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}
```

- [ ] **Step 2: Verify it compiles & lints**

Run: `npx tsc --noEmit && npx eslint "app/api/platform/tenants/[tenantId]/credentials/rotate/route.ts"`
Expected: exit 0, clean.

- [ ] **Step 3: Commit**

```bash
git add "app/api/platform/tenants/[tenantId]/credentials/rotate/route.ts"
git commit -m "feat(control-plane): credential rotation API route (EVE-37)"
```

---

## Part D — Control-plane config distribution

### Task 10: `ControlPlaneConfigResolver`

**Files:**
- Create: `lib/tenant/controlplane/configResolver.ts`
- Test: `test/unit/lib/tenant/controlplane/configResolver.test.ts`

`resolve(tenantId)` returns a `ControlPlaneSnapshot` or `null` if the tenant is unknown. `routable` is derived from `isRoutable(status)`. Missing config/metering degrade to `{}`/`null` without throwing.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { ControlPlaneConfigResolver } from '@/lib/tenant/controlplane/configResolver'
import type { ControlPlaneReadStore } from '@/lib/tenant/controlplane/types'

function store(over: Partial<ControlPlaneReadStore> = {}): ControlPlaneReadStore {
  return {
    async getStateAndFlags() { return { state: 'Active', featureFlags: { fleet: true } } },
    async getConfig() { return { locale: 'en-MY' } },
    async getMetering() { return { bytesUsed: 0, quotaBytes: 100 } },
    ...over,
  }
}

describe('ControlPlaneConfigResolver.resolve', () => {
  it('assembles a snapshot with routable derived from status', async () => {
    const snap = await new ControlPlaneConfigResolver(store()).resolve('t1')
    expect(snap).toEqual({
      tenantId: 't1',
      status: 'Active',
      routable: true,
      featureFlags: { fleet: true },
      config: { locale: 'en-MY' },
      metering: { bytesUsed: 0, quotaBytes: 100 },
    })
  })

  it('marks a Suspended tenant non-routable', async () => {
    const s = store({ async getStateAndFlags() { return { state: 'Suspended', featureFlags: {} } } })
    const snap = await new ControlPlaneConfigResolver(s).resolve('t1')
    expect(snap?.routable).toBe(false)
  })

  it('returns null when the tenant is unknown', async () => {
    const s = store({ async getStateAndFlags() { return null } })
    expect(await new ControlPlaneConfigResolver(s).resolve('missing')).toBeNull()
  })

  it('degrades missing config and metering without throwing', async () => {
    const s = store({ async getConfig() { return null }, async getMetering() { return null } })
    const snap = await new ControlPlaneConfigResolver(s).resolve('t1')
    expect(snap?.config).toEqual({})
    expect(snap?.metering).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/lib/tenant/controlplane/configResolver.test.ts`
Expected: FAIL — cannot resolve `configResolver`.

- [ ] **Step 3: Write the implementation**

```typescript
import { isRoutable } from '@/lib/tenant/controlplane/types'
import type { ControlPlaneReadStore, ControlPlaneSnapshot } from '@/lib/tenant/controlplane/types'

/**
 * Assembles a tenant-scoped control-plane snapshot for downstream consumers
 * (routing, feature flags, metering, cross-platform clients). The caller is
 * responsible for validating tenant context (see the API route guard); this
 * resolver only reads the given tenant's state.
 */
export class ControlPlaneConfigResolver {
  constructor(private readonly store: ControlPlaneReadStore) {}

  async resolve(tenantId: string): Promise<ControlPlaneSnapshot | null> {
    const base = await this.store.getStateAndFlags(tenantId)
    if (!base) return null

    const [config, metering] = await Promise.all([
      this.store.getConfig(tenantId),
      this.store.getMetering(tenantId),
    ])

    return {
      tenantId,
      status: base.state,
      routable: isRoutable(base.state),
      featureFlags: base.featureFlags,
      config: config ?? {},
      metering,
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/lib/tenant/controlplane/configResolver.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tenant/controlplane/configResolver.ts test/unit/lib/tenant/controlplane/configResolver.test.ts
git commit -m "feat(control-plane): config-distribution resolver (EVE-37)"
```

---

### Task 11: Config-distribution API route (validated tenant context)

**Files:**
- Create: `app/api/platform/tenants/[tenantId]/config/route.ts`

Access requires a **validated tenant context**: the caller is either a `platform_admin` (any tenant) or the authenticated **owner** of that specific tenant. Any other authenticated user, or a user requesting a tenant they do not own, is denied — so no tenant can read another tenant's control-plane config.

- [ ] **Step 1: Write the route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SupabaseControlPlaneStore } from '@/lib/tenant/controlplane/supabaseStore'
import { ControlPlaneConfigResolver } from '@/lib/tenant/controlplane/configResolver'

/**
 * Returns the control-plane snapshot for a tenant, but ONLY with validated tenant
 * context: platform_admin (any tenant) OR the authenticated owner of this tenant.
 * Everyone else gets 403 — no tenant can read another tenant's control-plane state.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'platform_admin'

  if (!isAdmin) {
    // Validated tenant context: the caller must OWN this tenant. RLS on tenants
    // (tenants_select_own) only returns the row when auth.uid() = owner_id.
    const { data: owned } = await supabase
      .from('tenants').select('id').eq('id', tenantId).maybeSingle()
    if (!owned) {
      return NextResponse.json({ error: 'Forbidden — not your tenant' }, { status: 403 })
    }
  }

  const admin = createServiceClient()
  const resolver = new ControlPlaneConfigResolver(new SupabaseControlPlaneStore(admin))
  const snapshot = await resolver.resolve(tenantId)
  if (!snapshot) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  return NextResponse.json(snapshot)
}
```

- [ ] **Step 2: Verify it compiles & lints**

Run: `npx tsc --noEmit && npx eslint "app/api/platform/tenants/[tenantId]/config/route.ts"`
Expected: exit 0, clean.

- [ ] **Step 3: Commit**

```bash
git add "app/api/platform/tenants/[tenantId]/config/route.ts"
git commit -m "feat(control-plane): tenant-scoped config-distribution API (EVE-37)"
```

---

## Part E — Routing enforcement

### Task 12: Block non-routable active tenant in the platform layout

**Files:**
- Modify: `app/(dashboard)/platform/layout.tsx`

When a `platform_active_tenant` cookie points at a tenant that is **not routable** (anything other than `Active` — e.g. it was suspended after selection), the layout must render `BlockedScreen` instead of the workspace. The existing layout already fetches the active tenant for its name; extend that fetch to include `state` and gate on `isRoutable`.

- [ ] **Step 1: Update the layout's active-tenant fetch + guard**

In `app/(dashboard)/platform/layout.tsx`, add the import near the other `@/lib` imports:

```typescript
import { isRoutable } from '@/lib/tenant/controlplane/types'
```

Then replace the existing active-tenant name-fetch block:

```typescript
  let activeTenantName: string | null = null
  if (tenantId) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()
    activeTenantName = tenant?.name ?? null
  }
```

with one that also reads `state` and blocks non-routable tenants on sub-routes:

```typescript
  let activeTenantName: string | null = null
  if (tenantId) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, state')
      .eq('id', tenantId)
      .single()
    activeTenantName = tenant?.name ?? null

    // Routing enforcement: a selected tenant that is no longer routable
    // (suspended/decommissioned) must not expose its workspace sub-routes.
    if (isSubRoute && (!tenant || !isRoutable(tenant.state))) {
      return (
        <PlatformShell user={appUser} activeTenantId={tenantId} activeTenantName={activeTenantName}>
          <BlockedScreen />
        </PlatformShell>
      )
    }
  }
```

- [ ] **Step 2: Verify it compiles & lints**

Run: `npx tsc --noEmit && npx eslint "app/(dashboard)/platform/layout.tsx"`
Expected: exit 0, clean.

- [ ] **Step 3: Verify the existing platform unit tests still pass**

Run: `npx vitest run test/unit/components/platform test/unit/lib/platform`
Expected: PASS (no regressions; the layout is a server component covered by E2E in Task 14).

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/platform/layout.tsx"
git commit -m "feat(control-plane): block non-routable active tenant in platform layout (EVE-37)"
```

---

## Part F — E2E validation

### Task 13: Wire the lifecycle E2E into the platform Playwright project

**Files:**
- Modify: `playwright.config.ts`

The `platform` project is scoped via `testMatch` to a single file (EVE-45). Broaden it to also match the new lifecycle spec, without sweeping in unrelated platform specs.

- [ ] **Step 1: Update the `platform` project `testMatch`**

In `playwright.config.ts`, change the `platform` project's `testMatch` from the single-string form to an array that includes both provisioning and lifecycle specs:

```typescript
    {
      name: 'platform',
      testDir: './e2e/tests/platform',
      testMatch: ['**/tenant-provisioning.spec.ts', '**/tenant-lifecycle.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
```

- [ ] **Step 2: Verify config parses**

Run: `npx playwright test --project=platform --list 2>&1 | tail -3`
Expected: lists tests; no config error (the lifecycle spec file is added in Task 14, so before that it simply matches only provisioning).

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts
git commit -m "test(control-plane): include tenant-lifecycle spec in platform E2E project (EVE-37)"
```

---

### Task 14: Lifecycle, rotation, config & routing E2E

**Files:**
- Create: `e2e/tests/platform/tenant-lifecycle.spec.ts`

API-level E2E using `page.request` with the `platform-admin` storage state, plus `adminClient` for setup/teardown (pattern from `e2e/tests/platform/tenant-provisioning.spec.ts`). Tests cover: suspend → non-routable, reactivate, decommission, invalid transition → 409, isolation (config read scoped to validated context), and the config endpoint shape. The rotation **happy path** needs a reachable BYODB (local Postgres on `127.0.0.1:54322`) and is skipped in CI (same pattern as the provisioning happy-path).

- [ ] **Step 1: Write the E2E spec**

```typescript
import { test, expect } from '../../fixtures/index'
import { adminClient } from '../../helpers/supabase.admin'

async function createTenant(name: string, state: string): Promise<string> {
  const { data, error } = await adminClient
    .from('tenants').insert({ name, state }).select('id').single()
  if (error) throw new Error(`createTenant failed: ${error.message}`)
  return data.id
}
async function deleteTenant(id: string): Promise<void> {
  await adminClient.from('tenants').delete().eq('id', id)
}
async function getState(id: string): Promise<string | undefined> {
  const { data } = await adminClient.from('tenants').select('state').eq('id', id).single()
  return data?.state
}

test.describe('control-plane lifecycle — auth guards', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('POST lifecycle requires auth (401)', async ({ page }) => {
    const res = await page.request.post('/api/platform/tenants/00000000-0000-0000-0000-000000000000/lifecycle', {
      data: { action: 'suspend' },
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('control-plane lifecycle — non platform_admin forbidden', () => {
  test.use({ storageState: 'e2e/.auth/driver.json' })

  test('driver POST lifecycle → 403', async ({ page }) => {
    const res = await page.request.post('/api/platform/tenants/00000000-0000-0000-0000-000000000000/lifecycle', {
      data: { action: 'suspend' },
    })
    expect(res.status()).toBe(403)
  })

  test('driver GET config for a tenant they do not own → 403', async ({ page }) => {
    const tenantId = await createTenant('E2E Other Tenant', 'Active')
    try {
      const res = await page.request.get(`/api/platform/tenants/${tenantId}/config`)
      expect(res.status()).toBe(403)
    } finally {
      await deleteTenant(tenantId)
    }
  })
})

test.describe('control-plane lifecycle — platform_admin', () => {
  test.use({ storageState: 'e2e/.auth/platform-admin.json' })

  test('suspend makes a tenant non-routable, reactivate restores it', async ({ page }) => {
    const tenantId = await createTenant('E2E Lifecycle', 'Active')
    try {
      const suspend = await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, { data: { action: 'suspend' } })
      expect(suspend.status()).toBe(200)
      expect(await getState(tenantId)).toBe('Suspended')

      const cfg = await page.request.get(`/api/platform/tenants/${tenantId}/config`)
      expect(cfg.status()).toBe(200)
      const snap = await cfg.json()
      expect(snap.status).toBe('Suspended')
      expect(snap.routable).toBe(false)

      const reactivate = await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, { data: { action: 'reactivate' } })
      expect(reactivate.status()).toBe(200)
      expect(await getState(tenantId)).toBe('Active')
    } finally {
      await deleteTenant(tenantId)
    }
  })

  test('invalid transition (suspend a Registered tenant) → 409', async ({ page }) => {
    const tenantId = await createTenant('E2E Bad Transition', 'Registered')
    try {
      const res = await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, { data: { action: 'suspend' } })
      expect(res.status()).toBe(409)
      expect(await getState(tenantId)).toBe('Registered') // unchanged
    } finally {
      await deleteTenant(tenantId)
    }
  })

  test('decommission moves Active → Decommissioned', async ({ page }) => {
    const tenantId = await createTenant('E2E Decommission', 'Active')
    try {
      const res = await page.request.post(`/api/platform/tenants/${tenantId}/lifecycle`, { data: { action: 'decommission' } })
      expect(res.status()).toBe(200)
      expect(await getState(tenantId)).toBe('Decommissioned')
    } finally {
      await deleteTenant(tenantId)
    }
  })

  test('config endpoint returns a tenant-scoped snapshot for an Active tenant', async ({ page }) => {
    const tenantId = await createTenant('E2E Config', 'Active')
    try {
      const res = await page.request.get(`/api/platform/tenants/${tenantId}/config`)
      expect(res.status()).toBe(200)
      const snap = await res.json()
      expect(snap.tenantId).toBe(tenantId)
      expect(snap.routable).toBe(true)
      expect(typeof snap.featureFlags).toBe('object')
    } finally {
      await deleteTenant(tenantId)
    }
  })

  test('credential rotation through to a new secret (local BYODB)', async ({ page }) => {
    // Needs a reachable BYODB whose user can CREATE; local Postgres serves that.
    // CI has no such target, so skip there (covered by unit tests).
    test.skip(!!process.env.CI, 'requires a reachable BYODB target (runs locally)')

    const tenantId = await createTenant('E2E Rotate', 'Active')
    try {
      const res = await page.request.post(`/api/platform/tenants/${tenantId}/credentials/rotate`, {
        data: {
          kind: 'structured',
          params: { engine: 'postgres', host: '127.0.0.1', port: 54322, database: 'postgres', user: 'postgres', password: 'postgres' },
        },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(typeof body.secretId).toBe('string')

      const { data: row } = await adminClient.from('tenants').select('vault_secret_id').eq('id', tenantId).single()
      expect(row?.vault_secret_id).toBe(body.secretId)
    } finally {
      await deleteTenant(tenantId)
    }
  })
})
```

- [ ] **Step 2: Run the lifecycle E2E locally (Node ≥22)**

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v22.23.0/bin:$PATH"
npx playwright test e2e/tests/platform/tenant-lifecycle.spec.ts --project=platform --reporter=line
```
Expected: all tests pass (rotation happy-path runs locally; everything else needs no reachable BYODB). If the local Supabase env is unavailable, the auth-guard tests (401/403) still pass; capture and report any env-blocked DB tests rather than weakening assertions.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/platform/tenant-lifecycle.spec.ts
git commit -m "test(control-plane): E2E lifecycle, decommission, config isolation, rotation (EVE-37)"
```

---

### Task 15: Full verification

- [ ] **Step 1: Run the full control-plane + provisioning unit suites**

Run: `npx vitest run test/unit/lib/tenant`
Expected: all control-plane and provisioning unit tests pass.

- [ ] **Step 2: Typecheck + lint the whole project**

Run: `npx tsc --noEmit && npx eslint .`
Expected: exit 0.

- [ ] **Step 3: Run the complete local CI gate**

Run: `make check`
Expected: lint, test, tokens, build all pass.

- [ ] **Step 4: Push the branch**

```bash
git push -u origin feature/eve-37-define-control-plane-and-tenant-provisioning-architecture
```

> Execute on a fresh worktree/branch `feature/eve-37-define-control-plane-and-tenant-provisioning-architecture` created from up-to-date `main` (which already contains EVE-45) via superpowers:using-git-worktrees before Task 1.

---

## Self-Review

**1. Spec coverage (EVE-37 acceptance criteria):**

| EVE-37 requirement | Covered by |
|---|---|
| Control-plane responsibilities & boundaries clearly defined | Task 1 (architecture doc) |
| Tenant lifecycle flows + state transitions, implementation-ready | Tasks 4, 6 (suspend/reactivate/decommission/override); reuses existing state machine |
| Creation/activation flows | EVE-45 (done) — referenced in doc (Task 1) |
| Suspension / decommissioning flows | Tasks 4, 6, 14 |
| Upgrade flow | Deferred to EVE-46 (documented Task 1) — per decision |
| BYODB registration/credentials/secrets/metadata managed | EVE-45 (bind) + Tasks 7–9 (rotation, vault_secret_id persistence) |
| Credential rotation, failed-provisioning rollback, override paths | Task 8 (rotation+rollback), Task 4 (override) |
| Downstream routing/flags/metering/clients depend on control-plane state | Tasks 10, 11 (config resolver + API), Task 12 (routing) |
| Tenant identity/ownership validated before changes | Tasks 6, 9, 11 (requirePlatformAdmin / owner check) |
| Secrets protected, access-controlled, auditable | Vault-only (Tasks 7–9), audit seam (Task 3) wired through Tasks 4, 8 |
| Cross-tenant leak prevention (tenant-scoped) | tenant_id scoping (Task 5), owner-validated config route (Task 11), E2E isolation (Task 14) |
| Unit: lifecycle transitions, provisioning commands, invalid state | Tasks 2, 4 |
| Unit: tenant-scoped reads/writes, no cross-tenant state | Tasks 4, 5, 10 (scoping); Task 14 (isolation) |
| Unit: BYODB validation, secret reference resolution, rollback | Tasks 7, 8 |
| Unit: downstream cannot read without validated context | Task 11 + Task 14 (driver→403) |
| E2E: provision end-to-end register→activate | EVE-45 (done) |
| E2E: failed provisioning rolls back, no orphaned state | EVE-45 (done); lifecycle invalid-transition 409 (Task 14) |
| E2E: BYODB metadata consumed by runtime routing | Task 12 (routable gate) + Task 14 (suspend → non-routable) |
| E2E: no tenant reads/mutates another's control-plane config | Task 14 (driver GET config → 403) |

**Known scope notes (intentional, per decisions):** EVE-46 deployment orchestrator and tenant "upgrade" deferred; durable audit log is EVE-55 (this plan ships the wired no-op `ControlPlaneAuditSink` seam); rotation happy-path E2E runs locally only (needs a reachable BYODB); the config route currently serves platform-admin + tenant-owner (cross-platform-client tokens are a future extension noted in the doc).

**2. Placeholder scan:** No `TODO`/`TBD`/"add validation"/"similar to Task N". Every code step shows complete code; every test step shows the assertions.

**3. Type consistency:** `isRoutable`, `LifecycleAction`, `ControlPlaneStore`/`CredentialRotationStore`/`ControlPlaneReadStore`, `ControlPlaneSnapshot`, `ControlPlaneAuditEvent`/`ControlPlaneAuditSink`, and the service classes (`TenantLifecycleService`, `CredentialRotationService`, `ControlPlaneConfigResolver`, `SupabaseControlPlaneStore`) are defined once (Tasks 2, 3) and used with identical signatures in services (Tasks 4, 8, 10), the Supabase adapter (Task 5), and routes (Tasks 6, 9, 11). The bind step's optional `persistSecretId(tenantId, secretId: string | null)` callback (Task 7) matches the `db.setVaultSecretId(tenantId, secretId)` signature it is wired to. `requirePlatformAdmin` returns the same `{ user } | { error }` shape consumed by all three new routes.
