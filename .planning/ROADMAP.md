# Roadmap: Control-Plane & Tenant Provisioning Engine

## Overview

This milestone implements the core tenant provisioning engine for EVEcosys BYODB support — starting with the domain model and state machine, then layering on credential registration, isolation enforcement, and finally rollback/error recovery. Each phase delivers a thin end-to-end working slice that can be verified independently. By the end, a tenant's database credentials are accepted, validated, stored securely in Supabase Vault, and isolated from every other tenant — with automatic rollback if provisioning fails at any step.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Tenant Entity & State Machine** - Core domain model with enforced state transitions and full unit test coverage (completed 2026-06-09)
- [x] **Phase 2: BYODB Registration Service** - Credential acceptance, real connectivity validation, Vault storage, and registration unit tests (completed 2026-06-09)
- [x] **Phase 3: Tenant Isolation Layer** - Supabase RLS policies, auth interceptor, service-role gating, and cross-tenant isolation tests (completed 2026-06-09)
- [ ] **Phase 4: Rollback & Error Recovery** - Automatic rollback on provisioning failure, partial state cleanup, integration hardening, and 100% test compliance

## Phase Details

### Phase 1: Tenant Entity & State Machine
**Goal**: The tenant domain model exists with a strict, tested state machine that enforces all valid transitions and rejects all invalid ones before any DB write occurs.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: TENANT-01, TENANT-02, TENANT-03, TEST-01
**Success Criteria** (what must be TRUE):
  1. A `Tenant` entity can be created with an initial state of `Registered` and all five states (`Registered`, `Provisioning`, `Active`, `Suspended`, `Decommissioned`) are representable
  2. Calling a valid transition (e.g., `Registered → Provisioning`) succeeds and updates state before any DB write
  3. Calling an invalid transition (e.g., `Decommissioned → Active`) throws a descriptive error and leaves state unchanged
  4. Unit test suite covers every valid transition path and every invalid transition rejection case with all tests passing
**Plans**: 3 plans
- [ ] 01-01-PLAN.md — Tenant domain types & pure state machine (TENANT-01/02/03)
- [ ] 01-02-PLAN.md — Supabase migration: tenants table with state CHECK + RLS (TENANT-01)
- [ ] 01-03-PLAN.md — Exhaustive Vitest state-machine suite (TEST-01)

### Phase 2: BYODB Registration Service
**Goal**: A tenant can submit database credentials, have them validated via a real connectivity probe, and have them stored securely in Supabase Vault — with the tenant transitioned to `Active` on success.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: BYODB-01, BYODB-02, BYODB-03, BYODB-04, BYODB-05, TEST-02
**Success Criteria** (what must be TRUE):
  1. `BYODBRegistrationService` accepts both a connection string and a structured credential object for PostgreSQL-compatible and MySQL-compatible databases
  2. A real connectivity probe is made against the submitted credentials — unreachable or invalid credentials are rejected before any storage occurs
  3. Valid credentials are stored in Supabase Vault and never appear in logs, environment variables, or the control-plane DB as plain text
  4. After successful credential storage, tenant state transitions from `Provisioning` to `Active`
  5. Unit tests cover the happy-path registration flow, connectivity failure rejection, and rollback-on-failure — all passing
**Plans**: 3 plans
- [ ] 02-01-PLAN.md — Credential contracts, probe/vault interfaces & Vault RPC migration (BYODB-01/03/04)
- [ ] 02-02-PLAN.md — BYODBRegistrationService: probe, Vault store, Provisioning→Active, rollback (BYODB-01/02/04/05)
- [ ] 02-03-PLAN.md — Vitest suite: happy-path, connectivity failure, rollback (TEST-02)

### Phase 3: Tenant Isolation Layer
**Goal**: Every tenant-scoped data operation is gated by a validated Supabase Auth session and enforced by RLS policies at the database layer, with service-role operations never reachable from client code.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, TEST-03
**Success Criteria** (what must be TRUE):
  1. Any tenant-scoped read or write without a valid Supabase Auth session is rejected at the DB layer by RLS policy
  2. Tenant A cannot read or write Tenant B's control-plane configuration under any code path — confirmed by querying with Tenant A's session token and receiving zero rows from Tenant B's data
  3. Admin/service-role operations are only callable via server-side code using the service role key — no client-side code path can invoke them
  4. Unit tests assert cross-tenant isolation by attempting Tenant A reads against Tenant B's data with all isolation assertions passing
**Plans**: 3 plans
- [ ] 03-01-PLAN.md — Contracts: server-only, AuthSessionError/TenantAccessError, DatabaseClient, Tenant.owner_id (SEC-01/SEC-04)
- [ ] 03-02-PLAN.md — TenantAuthGuard + cross-tenant isolation tests (SEC-01/SEC-04/TEST-03)
- [ ] 03-03-PLAN.md — createServiceClient() factory + RLS audit migration (SEC-02/SEC-03)

### Phase 4: Rollback & Error Recovery
**Goal**: A provisioning failure at any step triggers automatic rollback to `Registered`, wipes all partial state and credentials from Vault, and the full test suite passes with 100% compliance.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: ROLLBACK-01, ROLLBACK-02, ROLLBACK-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. Simulating a failure at any point during the `Provisioning` state automatically triggers rollback — tenant state resets to `Registered`
  2. After rollback, no partial credentials exist in Supabase Vault for the failed provisioning attempt
  3. After rollback, all partial provisioning state (in-progress artifacts, staged records) is wiped — the tenant is in a clean `Registered` state ready to retry
  4. The full Vitest unit test suite (all phases) passes with zero failures before any PR merge
**Plans**: 3 plans
- [ ] 04-01-PLAN.md — Harden rollback: ProvisioningRollbackError + transitionTenant, dedicated rollback.test.ts (ROLLBACK-01/02/03)
- [ ] 04-02-PLAN.md — Vitest integration suite + config: full provisioning lifecycle, ROLLBACK-03, RLS against local Supabase (ROLLBACK-03/TEST-04)
- [ ] 04-03-PLAN.md — Phase 3 gap-audit close-out (SEC-02/SEC-03/TEST-03) + full unit suite green (TEST-04)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Tenant Entity & State Machine | 3/3 | Complete   | 2026-06-09 |
| 2. BYODB Registration Service | 3/3 | Complete   | 2026-06-09 |
| 3. Tenant Isolation Layer | 1/3 | Complete    | 2026-06-09 |
| 4. Rollback & Error Recovery | 0/3 | Not started | - |
