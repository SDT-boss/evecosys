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
