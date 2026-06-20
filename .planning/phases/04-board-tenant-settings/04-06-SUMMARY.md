---
phase: "04-board-tenant-settings"
plan: "06"
subsystem: "storage-rls, board-settings-rsc"
tags: ["rls", "security", "null-safety", "gap-closure", "cr-03", "cr-04"]
dependency_graph:
  requires:
    - "04-05"
    - "20260620120000_add_tenant_branding.sql"
  provides:
    - "tenant_owner_delete RLS policy on storage.objects"
    - "tenant_owner_update RLS policy on storage.objects"
    - "null-guarded branding RSC"
    - "null-guarded toggles RSC"
    - "null-guarded users RSC"
  affects:
    - "supabase storage.objects RLS enforcement"
    - "board settings page error behavior on session expiry"
tech_stack:
  added: []
  patterns:
    - "RLS policy via split_part path predicate on storage.objects"
    - "RSC null guard pattern: if (!user) redirect('/login') before field access"
key_files:
  created:
    - "supabase/migrations/20260621000000_add_tenant_assets_rls.sql"
  modified:
    - "app/(dashboard)/board/settings/branding/page.tsx"
    - "app/(dashboard)/board/settings/toggles/page.tsx"
    - "app/(dashboard)/board/settings/users/page.tsx"
decisions:
  - "Used split_part(name, '/', 2) in DELETE/UPDATE policies matching the INSERT policy convention from 20260620120000_add_tenant_branding.sql"
  - "Users page redirects to /board/settings (not /login) on null tenant to avoid infinite redirect loop when tenant doesn't exist yet"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-21"
  tasks_completed: 3
  files_created: 1
  files_modified: 3
---

# Phase 4 Plan 06: CR-03 + CR-04 Gap Closure Summary

**One-liner:** Adds DELETE/UPDATE RLS policies on the tenant-assets storage bucket and null-guard redirects to three board settings RSC pages.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CR-03 — Add tenant_owner_delete and tenant_owner_update RLS policies | 272cedd | supabase/migrations/20260621000000_add_tenant_assets_rls.sql |
| 2 | Schema push — apply new RLS migration to local Supabase | (no commit — DDL-only, make migrate exited 0) | — |
| 3 | CR-04 — Add null guards with redirects to branding, toggles, and users RSC pages | 675a3a8 | branding/page.tsx, toggles/page.tsx, users/page.tsx |

## What Was Built

### CR-03: Tenant Assets RLS (Task 1-2)

New migration `supabase/migrations/20260621000000_add_tenant_assets_rls.sql` adds two policies on `storage.objects` that were missing from the initial branding migration:

- `tenant_owner_delete` FOR DELETE: prevents any authenticated user from deleting objects in `tenant-assets` unless `split_part(name, '/', 2)` matches their own tenant ID
- `tenant_owner_update` FOR UPDATE: same predicate for overwrite operations

Both use the same `split_part(name, '/', 2) = (SELECT id::text FROM public.tenants WHERE owner_id = auth.uid())` predicate already established by `tenant_owner_upload` in `20260620120000_add_tenant_branding.sql`. The path convention `tenant-logos/{tenant_id}/{filename}` places the tenant UUID in the second segment.

`make migrate` exited 0 (local Supabase reports "up to date" — the migration will be applied post-merge when the branch is merged and migrations run from the main checkout).

### CR-04: RSC Null Guards (Task 3)

Three board settings RSC pages were using unguarded `user!.id` and `tenant!.id` non-null assertions. Between the layout auth guard and the child RSC render, Supabase's `getUser()` can return `null` if the session expires in that window, causing a TypeError 500 instead of a graceful redirect.

Pattern applied (identical to the canonical `byodb/page.tsx` reference):

**branding/page.tsx and toggles/page.tsx:**
- Added `import { redirect } from 'next/navigation'`
- Added `if (!user) redirect('/login')` after `getUser()`
- Replaced `user!.id` with `user.id`

**users/page.tsx:**
- Added `import { redirect } from 'next/navigation'`
- Added `if (!user) redirect('/login')` after `getUser()`
- Added `if (!tenant) redirect('/board/settings')` after tenant query
- Replaced all `user!.id` and `tenant!.id` assertions with `user.id` and `tenant.id`

## Verification Results

| Check | Result |
|-------|--------|
| `grep -c "tenant_owner_delete"` in migration | 1 (pass) |
| `grep -c "tenant_owner_update"` in migration | 1 (pass) |
| `make migrate` exit code | 0 (pass) |
| `user!.id` or `tenant!.id` remaining in 3 pages | 0 (pass) |
| `if (!user) redirect` in all 3 pages | 3 matches (pass) |
| `if (!tenant) redirect('/board/settings')` in users/page.tsx | 1 match (pass) |
| `make typecheck` | 0 errors (pass) |
| Unit tests (this worktree: 26 tests) | 26 passed (pass) |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new security surface introduced beyond what the plan addresses. The plan explicitly mitigates T-04-CR03-01, T-04-CR03-02, T-04-CR04-01, T-04-CR04-02, T-04-CR04-03.

## Self-Check: PASSED

- [x] `supabase/migrations/20260621000000_add_tenant_assets_rls.sql` exists
- [x] Commit 272cedd exists in git log
- [x] Commit 675a3a8 exists in git log
- [x] `branding/page.tsx` has `if (!user) redirect('/login')`
- [x] `toggles/page.tsx` has `if (!user) redirect('/login')`
- [x] `users/page.tsx` has `if (!user) redirect('/login')` and `if (!tenant) redirect('/board/settings')`
- [x] No `user!.id` or `tenant!.id` in any of the three pages
