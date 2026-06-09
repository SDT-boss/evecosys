---
phase: 02-byodb-registration-service
plan: 01
subsystem: database
tags: [supabase, vault, postgres, mysql, typescript, credentials, byodb]

# Dependency graph
requires:
  - phase: 01-tenant-lifecycle
    provides: Tenant interface, TenantState, InvalidStateTransitionError pattern used to model CredentialValidationError
provides:
  - BYODBEngine type (postgres | mysql)
  - BYODBCredentialInput union type (connectionString | structured)
  - DbConnectionParams interface
  - normalizeCredential parser with URL-based connection string support
  - CredentialValidationError class
  - ConnectivityProbe interface (injectable contract for Plan 02 drivers)
  - ProbeResult interface
  - ConnectivityError class
  - VaultStore interface (injectable contract for Plan 02 implementation)
  - StoredSecret interface
  - VaultStorageError class
  - Supabase Vault RPC wrappers: store_byodb_secret, delete_byodb_secret
  - tenants.vault_secret_id column for secret-to-tenant association
affects: [02-02-registration-service, 02-03-registration-service-tests, 03-provisioning-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Interface-first contracts: domain types and interfaces defined before any implementation, enabling dependency injection and fake-based unit testing"
    - "SECURITY DEFINER RPC wrappers over vault schema: PostgREST cannot call vault schema directly; public wrappers restrict access to service_role only"
    - "Error subclass pattern: custom Error classes with this.name set in constructor, mirroring Phase 01 InvalidStateTransitionError"
    - "Pure parsing modules: normalizeCredential has zero runtime DB dependencies; URL built-in used for connection string parsing"

key-files:
  created:
    - lib/tenant/credentials.ts
    - lib/tenant/probe.ts
    - lib/tenant/vault.ts
    - supabase/migrations/20260609130000_byodb_vault_rpc.sql
  modified: []

key-decisions:
  - "Passwords are never included in CredentialValidationError messages — error describes missing/invalid field without the secret value"
  - "URL built-in (no external parser) used for connection string parsing — zero extra dependencies in credentials.ts"
  - "Both postgres and postgresql URL protocols map to BYODBEngine 'postgres'; declared engine must match protocol or throws"
  - "vault_secret_id added to tenants table for rollback support — enables delete_byodb_secret on provisioning failure"
  - "ConnectivityProbe and VaultStore defined as interfaces only — concrete pg/mysql2 drivers introduced in Plan 02 behind these abstractions"

patterns-established:
  - "Interface-first foundation: Plan 01 defines contracts, Plan 02 implements them, Plan 03 tests against fakes"
  - "SECURITY DEFINER + REVOKE/GRANT pattern for vault access: anon/authenticated revoked, service_role granted"

requirements-completed: [BYODB-01, BYODB-03, BYODB-04]

# Metrics
duration: 3min
completed: 2026-06-09
---

# Phase 02 Plan 01: BYODB Credential Domain Contracts Summary

**TypeScript credential union type with URL-based parser, injectable ConnectivityProbe/VaultStore interfaces, and SECURITY DEFINER Supabase Vault RPC wrappers — all as pure contracts with zero runtime DB dependencies**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-09T09:23:18Z
- **Completed:** 2026-06-09T09:26:22Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Credential domain types established: BYODBCredentialInput union covers both connection-string and structured object forms for postgres and mysql engines, with normalizeCredential parser that rejects bad inputs before any DB call
- Injectable interfaces defined: ConnectivityProbe and VaultStore contracts enable Plan 02/03 to write against abstractions and unit-test with fakes — no live DB required at test time
- Vault RPC migration: SECURITY DEFINER wrappers restrict Vault access to service_role only, with vault_secret_id column on tenants enabling rollback on provisioning failure

## Task Commits

1. **Task 1: Define BYODB credential domain types and parser** - `fe59c3d` (feat)
2. **Task 2: Define ConnectivityProbe and VaultStore interfaces** - `c37d2bc` (feat)
3. **Task 3: Add Supabase Vault RPC migration for BYODB secrets** - `3f82924` (feat)

## Files Created/Modified

- `lib/tenant/credentials.ts` - BYODBEngine, DbConnectionParams, BYODBCredentialInput union, CredentialValidationError, normalizeCredential
- `lib/tenant/probe.ts` - ProbeResult, ConnectivityProbe interface, ConnectivityError
- `lib/tenant/vault.ts` - StoredSecret, VaultStore interface, VaultStorageError
- `supabase/migrations/20260609130000_byodb_vault_rpc.sql` - supabase_vault extension, vault_secret_id column, store_byodb_secret/delete_byodb_secret RPCs

## Decisions Made

- Passwords omitted from CredentialValidationError messages: prevents secrets appearing in logs
- URL built-in for connection string parsing: keeps credentials.ts dependency-free
- postgres and postgresql protocols both map to BYODBEngine 'postgres', with engine-protocol consistency enforced
- vault_secret_id on tenants: enables the rollback path (delete_byodb_secret on failure) that Plan 02 will use
- Interfaces only in probe.ts and vault.ts: concrete pg/mysql2 implementations deferred to Plan 02

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (registration service) can import DbConnectionParams from credentials.ts and implement ConnectivityProbe with pg/mysql2 drivers
- Plan 02 can implement VaultStore backed by Supabase service-role client calling store_byodb_secret/delete_byodb_secret RPCs
- Plan 03 (test suite) can inject fake ConnectivityProbe and VaultStore implementations — no live DB needed in unit tests
- Migration must be applied before Plan 02 integration tests: `make migrate`

---
*Phase: 02-byodb-registration-service*
*Completed: 2026-06-09*
