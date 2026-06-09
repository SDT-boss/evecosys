# Requirements — Control-Plane & Tenant Provisioning Engine

**Version:** v1  
**Status:** Active  
**Last updated:** 2026-06-09

---

## v1 Requirements

### Tenant Lifecycle Management

- [x] **TENANT-01**: Tenant entity has explicit states: `Registered`, `Provisioning`, `Active`, `Suspended`, `Decommissioned`
- [x] **TENANT-02**: State machine enforces valid transitions only — invalid transitions (e.g., `Decommissioned → Active`) are rejected with a descriptive error
- [x] **TENANT-03**: All state transition validation runs before any database write is committed

### BYODB Registration

- [ ] **BYODB-01**: `BYODBRegistrationService` accepts tenant database credentials (connection string or structured credential object)
- [ ] **BYODB-02**: Service validates real connectivity and schema ownership before accepting credentials
- [ ] **BYODB-03**: Supports any PostgreSQL-compatible or MySQL-compatible database (Supabase, AWS RDS, Neon, Alibaba Cloud, etc.)
- [ ] **BYODB-04**: Credentials are stored in Supabase Vault — never logged, cached, or stored as plain text anywhere in the control-plane DB
- [ ] **BYODB-05**: Successful validation transitions tenant state from `Provisioning` → `Active`

### Security & Tenant Isolation

- [ ] **SEC-01**: All tenant-scoped read/write operations require a validated Supabase Auth session
- [ ] **SEC-02**: Supabase RLS policies enforce cross-tenant isolation at the database layer
- [ ] **SEC-03**: Admin/service-role operations use the Supabase service role key — never exposed to client-side code
- [ ] **SEC-04**: Zero cross-tenant config visibility: Tenant A cannot read Tenant B's control-plane configuration under any code path

### Rollback & Error Recovery

- [ ] **ROLLBACK-01**: If any provisioning step fails during the `Provisioning` state, an automatic rollback is triggered
- [ ] **ROLLBACK-02**: Rollback resets tenant state to `Registered` and wipes all partial provisioning state
- [ ] **ROLLBACK-03**: Failed or partial credentials are never persisted in Supabase Vault during a rolled-back provisioning attempt

### Testing

- [x] **TEST-01**: Unit tests cover all valid state transitions and all invalid transition rejection cases
- [ ] **TEST-02**: Unit tests cover BYODB registration: successful flow, connectivity failure, rollback on failure
- [ ] **TEST-03**: Unit tests assert cross-tenant isolation — Tenant A cannot access Tenant B's data
- [ ] **TEST-04**: 100% test compliance — test suite passes before PR merge

---

## v2 Requirements (Deferred)

- Multi-cloud credential replication across secrets providers (e.g., AWS Secrets Manager sync)
- Frontend management UI for tenant lifecycle operations
- Non-relational BYODB support (MongoDB, Redis)
- Automated tenant health checks / connectivity re-validation on schedule
- Tenant suspension / reactivation self-service API for tenants

---

## Out of Scope

- **Frontend UI for control-plane** — this feature is API/service layer only; UI is a separate phase
- **Non-relational databases** — MongoDB, Redis, etc. are not supported in v1
- **Third-party secrets managers** — only Supabase Vault for v1 (AWS Secrets Manager, HashiCorp Vault deferred)
- **Multi-cloud secrets replication** — single vault for v1 scope

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| TENANT-01 | Phase 1 | Complete |
| TENANT-02 | Phase 1 | Complete |
| TENANT-03 | Phase 1 | Complete |
| BYODB-01 | Phase 2 | Pending |
| BYODB-02 | Phase 2 | Pending |
| BYODB-03 | Phase 2 | Pending |
| BYODB-04 | Phase 2 | Pending |
| BYODB-05 | Phase 2 | Pending |
| SEC-01 | Phase 3 | Pending |
| SEC-02 | Phase 3 | Pending |
| SEC-03 | Phase 3 | Pending |
| SEC-04 | Phase 3 | Pending |
| ROLLBACK-01 | Phase 4 | Pending |
| ROLLBACK-02 | Phase 4 | Pending |
| ROLLBACK-03 | Phase 4 | Pending |
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 2 | Pending |
| TEST-03 | Phase 3 | Pending |
| TEST-04 | Phase 4 | Pending |
