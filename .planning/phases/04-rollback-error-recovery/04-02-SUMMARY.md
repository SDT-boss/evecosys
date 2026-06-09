---
phase: "04-rollback-error-recovery"
plan: "02"
subsystem: "integration-testing"
tags: ["vitest", "integration", "supabase-vault", "rls", "rollback", "byodb"]
dependency_graph:
  requires: ["04-01"]
  provides: ["integration test suite", "make test-integration target", "vitest.integration.config.mts"]
  affects: ["Makefile", "test/integration/"]
tech_stack:
  added: []
  patterns: ["Vitest separate integration config (node env + loadEnv)", "describe.skipIf for env-conditional test suites", "ephemeral test users via auth.admin.createUser"]
key_files:
  created:
    - "vitest.integration.config.mts"
    - "test/integration/tenant-provisioning.test.ts"
  modified:
    - "Makefile"
decisions:
  - "loadEnv imported from 'vite' not 'vitest/config' — not exported by vitest/config in v4.1.8"
  - "describe.skipIf(!suiteEnabled) guards suite so unit test run skips gracefully when Docker is absent"
  - "Clients initialised lazily in beforeAll after env guard, not at module eval time"
metrics:
  duration_seconds: 367
  completed_date: "2026-06-09"
  tasks_completed: 2
  tasks_total: 3
  files_created: 2
  files_modified: 1
---

# Phase 04 Plan 02: Integration Test Suite for Tenant Provisioning Summary

**One-liner:** Node-env Vitest integration suite exercises real Supabase Vault RPCs, RLS cross-tenant isolation, and rollback orphan-secret deletion against local Docker Supabase.

## Status

Tasks 1-2 complete and committed. Task 3 (checkpoint:human-verify) reached — awaiting manual `make test-integration` verification against running local Supabase.

## What Was Built

### Task 1: vitest.integration.config.mts + make test-integration

Created a separate Vitest config for integration tests that runs in `environment: 'node'` and loads `.env.local` via `loadEnv` from `vite`. Added a `test-integration` Make target that invokes it. The unit config (`vitest.config.mts`) was left completely untouched.

Key file: `/Users/shannendorothee/Projects/evecosys/vitest.integration.config.mts`

### Task 2: test/integration/tenant-provisioning.test.ts

Created a 4-test integration suite covering:
- **TEST-04 happy path:** `svc.register()` returns `Active` state and a non-empty `secretId`; Vault secret presence confirmed via vault.secrets or UUID format
- **ROLLBACK-03:** `vi.spyOn(stateMachineMod, 'transition')` forces post-store failure; suite asserts the error propagates (not `ProvisioningRollbackError`) proving `vault.delete` succeeded and no orphaned credential remains
- **SEC-02/TEST-03 RLS isolation:** userA signs in via `signInWithPassword`, authenticated client queries tenantB's row — expects `toHaveLength(0)` (RLS blocked); same client queries tenantA — expects `toHaveLength(1)`
- **Vault lifecycle:** Explicit `vault.store()` then `vault.delete()` confirms the secret is gone

Setup/teardown: ephemeral users created via `admin.auth.admin.createUser` in `beforeAll`, tenant rows inserted per user, state reset in `afterEach`, full cleanup in `afterAll`.

Key file: `/Users/shannendorothee/Projects/evecosys/test/integration/tenant-provisioning.test.ts`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] loadEnv not exported from vitest/config in v4.1.8**
- **Found during:** Task 1 TypeScript check
- **Issue:** The plan template specified `import { defineConfig, loadEnv } from 'vitest/config'` but `loadEnv` is not exported from `vitest/config` — it is exported from `vite`
- **Fix:** Changed import to `import { loadEnv } from 'vite'`; `vite` is already a dependency of the project
- **Files modified:** `vitest.integration.config.mts`
- **Commit:** 8098a41

**2. [Rule 3 - Blocking] Integration test env guard threw at module eval, failing unit suite**
- **Found during:** Task 2 unit test run
- **Issue:** The top-of-file `throw new Error(...)` guard executed during unit test collection (jsdom env, no Docker), causing `test/integration/tenant-provisioning.test.ts` to fail the 36-test unit suite
- **Fix:** Moved env check to `describe.skipIf(!suiteEnabled)` pattern; clients initialised lazily in `beforeAll`. Unit suite now shows 1 skipped file, 298 tests pass
- **Files modified:** `test/integration/tenant-provisioning.test.ts`
- **Commit:** 8098a41

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS |
| `npm test -- --run` (unit suite) | PASS: 298 tests, 1 file skipped (integration) |
| `grep -q "environment: 'node'" vitest.integration.config.mts` | PASS |
| `git diff --quiet vitest.config.mts` | PASS (untouched) |
| `make test-integration` | PENDING — requires Docker + local Supabase (checkpoint) |

## Self-Check

Files created/committed — verified:
- `vitest.integration.config.mts` — commit 487136d (updated at 8098a41)
- `test/integration/tenant-provisioning.test.ts` — commit 8098a41
- `Makefile` — commit 487136d
