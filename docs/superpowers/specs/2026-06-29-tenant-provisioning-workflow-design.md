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
