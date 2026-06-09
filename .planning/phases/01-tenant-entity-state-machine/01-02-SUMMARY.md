---
phase: 01-tenant-entity-state-machine
plan: "02"
subsystem: database
tags: [migration, rls, tenants, supabase]
dependency_graph:
  requires: []
  provides: [public.tenants table, RLS policies]
  affects: [Phase 2 BYODB registration, Phase 3 tenant isolation]
tech_stack:
  added: []
  patterns: [CHECK constraint enum, updated_at trigger, owner-scoped RLS]
key_files:
  created:
    - supabase/migrations/20260609120000_create_tenants.sql
  modified: []
key_decisions:
  - "State CHECK constraint mirrors TenantState in lib/tenant/types.ts exactly (case-sensitive 5 values)"
  - "owner_id FK references auth.users for RLS; service role bypasses RLS automatically"
  - "3 policies: select/update/insert all scoped to auth.uid() = owner_id"
metrics:
  duration: "< 5 minutes"
  completed: "2026-06-09"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 01 Plan 02: Tenants Table Migration Summary

**One-liner:** PostgreSQL migration adding public.tenants table with 5-state CHECK constraint, Registered default, updated_at trigger, RLS enabled, and 3 owner-scoped policies.

## What Was Built

Created `supabase/migrations/20260609120000_create_tenants.sql` — the persistence layer for the tenant entity. The migration:

- Defines `public.tenants` with UUID PK (uuid_generate_v4), owner_id FK to auth.users (ON DELETE CASCADE), state TEXT NOT NULL with CHECK constraint on exactly the 5 TenantState values, and TIMESTAMPTZ created_at/updated_at columns
- Sets state DEFAULT 'Registered' so new rows start in the correct initial state
- Adds a `set_tenants_updated_at()` trigger function that refreshes updated_at on every UPDATE
- Enables RLS (service role bypasses automatically per Supabase convention)
- Creates 3 owner-scoped policies: tenants_select_own, tenants_update_own, tenants_insert_own — all gated on auth.uid() = owner_id

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create tenants table migration with RLS | f371be4 | supabase/migrations/20260609120000_create_tenants.sql |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- File exists and contains `CREATE TABLE public.tenants` ✓
- CHECK constraint lists all 5 states matching lib/tenant/types.ts TENANT_STATES ✓
- DEFAULT 'Registered' present ✓
- ENABLE ROW LEVEL SECURITY present ✓
- 3 CREATE POLICY statements present ✓
- Baseline migration 20240101000000_initial_schema.sql unchanged ✓

## Self-Check: PASSED
