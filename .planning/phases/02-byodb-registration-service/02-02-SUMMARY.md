---
phase: 02-byodb-registration-service
plan: "02"
subsystem: tenant-provisioning
tags: [byodb, registration, connectivity-probe, vault, state-machine, rollback]
dependency_graph:
  requires: ["02-01"]
  provides: ["02-03"]
  affects: [lib/tenant]
tech_stack:
  added: ["pg ^8.13.0", "mysql2 ^3.11.0", "@types/pg ^8.11.0"]
  patterns: ["dependency injection for ConnectivityProbe + VaultStore", "dynamic import for optional heavy drivers", "TDD (red-green)"]
key_files:
  created:
    - lib/tenant/probeDriver.ts
    - lib/tenant/vaultStore.ts
    - lib/tenant/registrationService.ts
    - test/unit/lib/tenant/registrationService.test.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "Dynamic import for pg/mysql2 — drivers excluded from test module graph; fakes injected at test time"
  - "SupabaseVaultStore accepts an optional injected SupabaseClient so unit tests never need env vars"
  - "Rollback wraps only the post-store steps (transition + return); probe failure cannot reach vault.delete"
  - "Ownership check differs per engine: has_database_privilege for Postgres, SHOW GRANTS regex for MySQL"
metrics:
  duration_seconds: 327
  completed_date: "2026-06-09"
  tasks_completed: 3
  files_changed: 5
---

# Phase 02 Plan 02: BYODB Registration Service Implementation Summary

**One-liner:** `BYODBRegistrationService` orchestrates probe-before-store with automatic secret rollback, backed by `RealConnectivityProbe` (pg/mysql2) and `SupabaseVaultStore` (service-role RPC).

## What Was Built

Three new files form the concrete implementation layer for BYODB registration:

**`lib/tenant/probeDriver.ts` — RealConnectivityProbe**
Implements `ConnectivityProbe` using `pg` (PostgreSQL) and `mysql2` (MySQL). Both drivers are loaded via dynamic `import()` so the test suite never requires them. Timeouts are 5 s per engine. Ownership verification uses `has_database_privilege(current_user, current_database(), 'CREATE')` for Postgres and `SHOW GRANTS FOR CURRENT_USER()` regex matching for MySQL. Passwords are never included in error output.

**`lib/tenant/vaultStore.ts` — SupabaseVaultStore**
Implements `VaultStore` against the `store_byodb_secret` / `delete_byodb_secret` RPCs (defined in `20260609130000_byodb_vault_rpc.sql`). Uses a service-role Supabase client built from `SUPABASE_SERVICE_ROLE_KEY`. Accepts an injected client for unit testing. The secret value travels only as the `p_secret` RPC argument and is never logged.

**`lib/tenant/registrationService.ts` — BYODBRegistrationService**
Orchestrates the full registration workflow in strict order:
1. State guard — tenant must be `Provisioning`
2. `normalizeCredential(input)` — validates before any network call
3. `probe.probe(params)` — connectivity + ownership check before any storage
4. `vault.store(...)` — writes normalised params JSON to Vault
5. `transition(Provisioning, Active)` — wrapped in try/catch; `vault.delete` on failure

**`test/unit/lib/tenant/registrationService.test.ts` — 10 unit tests**
Written TDD (RED first, then GREEN). Covers: happy path, connection-string input, state guard, invalid input (probe never called), connectivity failure (vault never called), schema-ownership failure, rollback on post-store transition failure (vault.delete called with secretId), and probe-before-store ordering invariant.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add pg/mysql2, implement RealConnectivityProbe | `9aa784a` | package.json, lib/tenant/probeDriver.ts |
| 2 | Implement SupabaseVaultStore | `91958d7` | lib/tenant/vaultStore.ts |
| 3 RED | Failing tests for BYODBRegistrationService | `8ea71a5` | test/unit/lib/tenant/registrationService.test.ts |
| 3 GREEN | Implement BYODBRegistrationService | `5925921` | lib/tenant/registrationService.ts |

## Verification Results

- `npx tsc --noEmit` — exit 0, all new files clean
- `npx vitest run test/unit/lib/tenant/registrationService.test.ts` — 10/10 passed
- `grep -c 'console.log' lib/tenant/{probeDriver,vaultStore,registrationService}.ts` — all 0
- `vault.store` called only after probe succeeds (line 48 < line 58 in registrationService.ts)
- `vault.delete` called in catch block (line 68) with `stored.secretId`
- `pg: ^8.13.0`, `mysql2: ^3.11.0`, `@types/pg: ^8.11.0` present in package.json

## Requirements Fulfilled

| Requirement | Status | Evidence |
|-------------|--------|----------|
| BYODB-01: Accept connection-string + structured credentials | Done | `normalizeCredential` called in `register`; connection-string test passes |
| BYODB-02: Real connectivity probe before storage | Done | `probe.probe(params)` at line 48, before `vault.store` at line 58 |
| BYODB-04: Credentials stored in Vault, never plaintext | Done | `SupabaseVaultStore.store` uses `store_byodb_secret` RPC with service-role key |
| BYODB-05: Provisioning → Active on success | Done | `transition(tenant.state, 'Active')` after successful store |
| BYODB-03: PostgreSQL + MySQL engine support (runtime) | Done | `RealConnectivityProbe` handles both engines with real drivers |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.fn generic type syntax incompatible with Vitest 4.x**
- **Found during:** Task 3 GREEN (typecheck after implementation)
- **Issue:** `vi.fn<[string, string], Promise<StoredSecret>>()` uses a Vitest 3.x type signature; Vitest 4.x uses single-argument generics
- **Fix:** Changed to `vi.fn().mockResolvedValue({ secretId } satisfies StoredSecret)` — inferred types, `satisfies` for shape checking
- **Files modified:** `test/unit/lib/tenant/registrationService.test.ts`
- **Commit:** `5925921`

## Self-Check: PASSED

All 4 created files found on disk. All 4 task commits verified in git log.
