# EVEcosys — Control-Plane & Tenant Provisioning Engine

## What This Is

EVEcosys is an EV fleet management SaaS platform with multi-tenant architecture. This project implements the **Control-Plane and Tenant Provisioning Engine** — the core service that manages the full lifecycle of BYODB (Bring Your Own Database) tenants within the existing Next.js + Supabase application. It handles tenant registration, database credential validation, secure secrets management, and enforces strict cross-tenant data isolation.

## Core Value

A tenant's database credentials are accepted, validated for real connectivity, stored securely in Supabase Vault, and isolated from every other tenant — with automatic rollback if provisioning fails at any step.

## Requirements

### Validated

- [x] Tenant entity with strict state machine: `Registered → Provisioning → Active → Suspended → Decommissioned` — Validated in Phase 01: Tenant Entity & State Machine
- [x] Invalid state transition rejections enforced (e.g., `Decommissioned → Active` blocked) — Validated in Phase 01: Tenant Entity & State Machine
- [x] Unit tests for state machine transitions and invalid transition rejections — Validated in Phase 01: Tenant Entity & State Machine

### Validated

- [x] `BYODBRegistrationService` that accepts, validates connectivity, and stores tenant DB credentials — Validated in Phase 02: BYODB Registration Service
- [x] BYODB support for any PostgreSQL-compatible or MySQL-compatible DB (Supabase, AWS RDS, Neon, Alibaba Cloud, etc.) — Validated in Phase 02: BYODB Registration Service
- [x] All BYODB credentials stored via Supabase Vault — never logged or stored as plain text — Validated in Phase 02: BYODB Registration Service
- [x] Automatic rollback to `Registered` if provisioning fails mid-flight — Validated in Phase 02: BYODB Registration Service
- [x] Partial provisioning state wiped on rollback — Validated in Phase 02: BYODB Registration Service
- [x] Unit tests for BYODB registration, connectivity validation, and rollback on failure — Validated in Phase 02: BYODB Registration Service

### Active

- [ ] Tenant-scoped read/write interceptor using Supabase Auth + RLS policies
- [ ] Cross-tenant data isolation enforced at the DB level via RLS
- [ ] Admin/service operations via Supabase service role key (never exposed to client)
- [ ] Unit tests for cross-tenant isolation (Tenant A cannot read Tenant B's control-plane config)
- [ ] 100% test compliance on generated code

### Out of Scope

- Frontend UI for tenant management — control-plane is API/service layer only
- Multi-cloud secrets replication — Supabase Vault is the single secrets store
- Non-relational (MongoDB, Redis) BYODB support — PostgreSQL/MySQL compatible only for v1

## Context

This feature is part of the core architectural epic for BYO cloud tenant support (ticket EVE-46). The codebase is an existing Next.js 16 + Supabase monorepo (App Router, React 19, TypeScript). No tenant provisioning code currently exists — this is a greenfield module within an established application.

**Key technical environment:**
- Next.js 16 App Router — control-plane lives as API routes / server actions
- Supabase as the platform database (PostgreSQL + Auth + RLS + Vault)
- Vitest for unit tests, Playwright for E2E
- Design tokens via `@evecosys/design-system` (not relevant to this feature)
- CI: lint, typecheck, Vitest, next build, npm audit on every PR

**BYODB validation approach:** Accept connection string or credential object, attempt a real connection probe, confirm schema access/ownership, then store credentials in Supabase Vault and mark tenant `Active`. Fail fast and rollback if any step fails.

## Constraints

- **Security**: Credentials must never be logged or stored in plain text — Supabase Vault is mandatory
- **Tech stack**: Implementation must stay within Next.js 16 App Router patterns (no new runtimes)
- **Auth**: Supabase Auth + RLS for tenant isolation; service role key for admin-only paths
- **Testing**: 100% unit test compliance required before PR merge
- **DB compatibility**: Only PostgreSQL-compatible and MySQL-compatible databases for BYODB v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Vault for BYODB credentials | Aligns with existing Supabase investment; built-in encryption at rest | Implemented via `store_byodb_secret`/`delete_byodb_secret` SECURITY DEFINER RPCs (Phase 02) |
| Supabase Auth + RLS for tenant isolation | Natural fit — RLS enforces isolation at DB layer, not application layer | — Pending |
| State machine implemented in application layer | Allows pre-transition business logic before DB write | Confirmed in Phase 01 |
| Rollback targets `Registered` (not `Decommissioned`) on provisioning failure | Allows retry without full re-registration; `Decommissioned` reserved for intentional teardown | Implemented — vault.delete + state rollback in `registrationService.ts` (Phase 02) |
| BYODB validation via real connectivity probe | Reject bad credentials before they're stored; prevents zombie tenants in `Provisioning` state | Implemented — `RealConnectivityProbe` with dynamic pg/mysql2 imports + ownership checks (Phase 02) |
| Dynamic driver imports in probe | Prevents test environments from loading pg/mysql2 at import time | Implemented via `await import('pg')` pattern in `probeDriver.ts` (Phase 02) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-09 — Phase 02 complete*
