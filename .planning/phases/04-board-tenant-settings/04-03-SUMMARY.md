---
phase: 04-board-tenant-settings
plan: "03"
subsystem: users-tab, api-routes, unit-tests, e2e-stub
tags: [users, invite, remove, alert-dialog, member-table, api-routes, wave-1]
dependency_graph:
  requires:
    - 04-01 (users.tenant_id FK + RLS policies + test stubs)
    - 04-02 (settings shell + layout + SettingsTabNav)
  provides:
    - app/(dashboard)/board/settings/users/page.tsx (RSC page with member list + invite form)
    - components/board/settings/InviteForm.tsx (Client Component — email/role → invite API)
    - components/board/settings/MemberTable.tsx (Client Component — table + AlertDialog remove + optional force-reset)
    - app/api/board/settings/users/invite/route.ts (POST — inviteUserByEmail with role + tenant_id metadata)
    - app/api/board/settings/users/remove/route.ts (DELETE — tenant-scoped users row delete + deleteUser)
    - app/api/board/settings/users/reset-password/route.ts (stub — wired button, real impl deferred)
    - test/unit/api/board/settings/users-invite.test.ts (5 tests passing)
    - test/unit/api/board/settings/users-remove.test.ts (4 tests passing)
    - e2e/tests/board/users.spec.ts (1 smoke test + 1 todo)
  affects:
    - components/board/settings/MemberTable.tsx (created in Task 1 as stub, fully implemented in Task 2)
tech_stack:
  added: []
  patterns:
    - RSC data-fetch page → Client Component prop pattern (same as manager/users/page.tsx)
    - Three-step API auth guard (getUser → profile.role → tenant.owner_id)
    - createServiceClient for auth.admin operations (never at module scope)
    - AlertDialog for destructive confirmation (cannot be dismissed by overlay click)
    - EmptyState for zero-data rendering
    - Optimistic removal (filter localMembers on success)
    - Tenant-scoped delete: .eq('tenant_id', tenant.id) prevents cross-tenant deletes
key_files:
  created:
    - app/(dashboard)/board/settings/users/page.tsx
    - components/board/settings/InviteForm.tsx
    - components/board/settings/MemberTable.tsx
    - app/api/board/settings/users/invite/route.ts
    - app/api/board/settings/users/remove/route.ts
    - app/api/board/settings/users/reset-password/route.ts
  modified:
    - test/unit/api/board/settings/users-invite.test.ts (todos → 5 real tests)
    - test/unit/api/board/settings/users-remove.test.ts (todos → 4 real tests)
    - e2e/tests/board/users.spec.ts (todo → 1 smoke test + 1 todo)
decisions:
  - "MemberTable stub created in Task 1 to satisfy typecheck for users page; fully implemented in Task 2"
  - "reset-password route created as stub returning ok:true; auth_troubleshooting button wired per locked decision D-11; full implementation deferred"
  - "NEXT_PUBLIC_APP_URL used as redirectTo base in inviteUserByEmail (falls back to undefined in test env)"
metrics:
  duration_minutes: 18
  completed_date: "2026-06-20"
  tasks_completed: 2
  files_created: 6
  files_modified: 3
---

# Phase 4 Plan 03: Users Tab — InviteForm + MemberTable + invite/remove API Routes Summary

**One-liner:** Users tab vertical slice with service-role invite (role allowlist + tenant_id metadata) and tenant-scoped remove (cross-tenant delete impossible via .eq('tenant_id', tenant.id)); MemberTable with AlertDialog confirmation and conditional auth_troubleshooting force-reset button; 9 unit tests green.

## What Was Built

### Task 1: Users tab RSC page + InviteForm + invite API route

**`app/(dashboard)/board/settings/users/page.tsx`**
- RSC that fetches `tenants (id, feature_flags)` by `owner_id = user.id` and `users (id, full_name, email, role, created_at)` by `tenant_id = tenant.id`
- Renders `<InviteForm tenantId={tenant.id} />` above `<MemberTable members={...} authTroubleshootingEnabled={...} />` in a flex-column gap container
- Auth guaranteed by parent `board/settings/layout.tsx` — no re-guard needed

**`components/board/settings/InviteForm.tsx`**
- Client Component with email Input and role Select (manager / driver only)
- Three-state feedback: idle, pending (Spinner inside Button, disabled), result (success Alert "Invitation sent" / failure Alert "Invitation failed")
- Defense-in-depth role validation before API call
- Uses `var(--ds-*)` tokens for all spacing/font values per CLAUDE.md

**`app/api/board/settings/users/invite/route.ts`**
- POST with full three-step auth guard (getUser → role=board check → tenant lookup by owner_id)
- Role allowlist: `['manager', 'driver'].includes(role)` — platform_admin and board rejected with 400
- Calls `createServiceClient().auth.admin.inviteUserByEmail(email, { data: { role, tenant_id: tenant.id }, redirectTo: ... })`
- tenant_id comes from server-side tenant lookup — client cannot inject a different tenant_id

**`test/unit/api/board/settings/users-invite.test.ts`**
- 5 tests: 401 (no user), 403 (role=manager), 400 (role=platform_admin with message match), 400 (missing email), 200 (verifies mockAdminInvite called with correct data including tenant_id and redirectTo containing /login)

### Task 2: MemberTable + remove API route + E2E users stub

**`components/board/settings/MemberTable.tsx`**
- Client Component — Table with Name/Email/Role/Joined/Actions columns
- EmptyState (icon=Users from lucide-react, title="No team members") when localMembers is empty
- AlertDialog for remove: title "Remove {full_name}?", description with name + email, AlertDialogAction → handleRemove, AlertDialogCancel → close without action
- Optimistic removal: `setLocalMembers(prev => prev.filter(m => m.id !== userId))` on success
- removeError displayed in destructive Alert above the table when non-null
- Conditional "Reset password" button (variant="outline") visible only when `authTroubleshootingEnabled === true`; wired to `/api/board/settings/users/reset-password`; shows "Reset email sent" for 3s on success

**`app/api/board/settings/users/remove/route.ts`**
- DELETE with full three-step auth guard
- Validates userId presence: missing → 400 "Missing userId"
- `admin.from('users').delete().eq('id', userId).eq('tenant_id', tenant.id)` — tenant_id scope is the cross-tenant delete guard (T-04-03-02)
- `admin.auth.admin.deleteUser(userId)` after row delete succeeds
- Returns `{ ok: true }` on success

**`app/api/board/settings/users/reset-password/route.ts`**
- Stub route with auth guard returning `{ ok: true }` without real operation
- Documented TODO for `auth.admin.generateLink('recovery', ...)` implementation

**`test/unit/api/board/settings/users-remove.test.ts`**
- 4 tests: 401 (no user), 403 (role≠board), 400 (missing userId), 200 (verifies mockAdminFrom called with 'users', eqSpy called with tenant_id, mockAdminDeleteUser called with userId)

**`e2e/tests/board/users.spec.ts`**
- Smoke test: navigates to `/board/settings/users`, asserts `Team members` heading visible and `Send invitation` button visible
- `test.todo('board member can invite and remove a member')` for full flow (requires real email + teardown)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | fb169a1 | feat(04-03): Task 1 — Users tab RSC page + InviteForm + invite API route |
| 2 | 60d5175 | feat(04-03): Task 2 — MemberTable + remove API route + E2E users stub |

## Deviations from Plan

**1. [Rule 2 - Missing Critical Functionality] MemberTable stub in Task 1**
- **Found during:** Task 1 typecheck — `users/page.tsx` imports MemberTable but it is a Task 2 file
- **Issue:** `make typecheck` failed with "Cannot find module '@/components/board/settings/MemberTable'"
- **Fix:** Created minimal MemberTable stub (typed props, no-op render) in Task 1 so typecheck passes; fully replaced with complete implementation in Task 2
- **Files modified:** `components/board/settings/MemberTable.tsx`
- **Commits:** fb169a1 (stub), 60d5175 (full impl)

**2. [Rule 2 - Missing Critical Functionality] reset-password stub route**
- **Found during:** Task 2 — MemberTable `handleForceReset` calls `/api/board/settings/users/reset-password` which did not exist
- **Issue:** Without a route, the fetch would 404 and generate Next.js 404 errors in production
- **Fix:** Created stub route with auth guard returning `{ ok: true }`; auth_troubleshooting button UX is present per locked decision D-11; real implementation deferred
- **Files modified:** `app/api/board/settings/users/reset-password/route.ts`
- **Commit:** 60d5175

## Threat Model Compliance

All four STRIDE threats from the plan were mitigated in implementation:

| Threat | Mitigation Applied |
|--------|-------------------|
| T-04-03-01: role injection in invite | `['manager', 'driver'].includes(role)` allowlist — returns 400 for platform_admin, board, or any other value |
| T-04-03-02: cross-tenant delete | `.eq('tenant_id', tenant.id)` scope guard — tenant.id comes from server-side `owner_id = auth.uid()` lookup |
| T-04-03-03: service-role client disclosure | `createServiceClient()` called only inside route handler body, never at module scope, never in Client Components |
| T-04-03-04: tenant_id forgery in invite | `tenant_id` in invite metadata set from server-side tenant lookup — client body cannot override it |

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| reset-password route | `app/api/board/settings/users/reset-password/route.ts` | Returns `{ ok: true }` without actual password reset email; full implementation requires `auth.admin.generateLink('recovery', { email })` which is descoped from BSET-02. Button UX is present per auth_troubleshooting locked decision. |
| E2E full-flow test | `e2e/tests/board/users.spec.ts` | `test.todo('board member can invite and remove a member')` — requires real test email with deliverability + teardown; deferred intentionally by plan. |

## Self-Check: PASSED

- app/(dashboard)/board/settings/users/page.tsx: FOUND
- components/board/settings/InviteForm.tsx: FOUND
- components/board/settings/MemberTable.tsx: FOUND
- app/api/board/settings/users/invite/route.ts: FOUND
- app/api/board/settings/users/remove/route.ts: FOUND
- app/api/board/settings/users/reset-password/route.ts: FOUND
- test/unit/api/board/settings/users-invite.test.ts: FOUND (5 tests passing)
- test/unit/api/board/settings/users-remove.test.ts: FOUND (4 tests passing)
- e2e/tests/board/users.spec.ts: FOUND (1 smoke test)
- Commits fb169a1 and 60d5175: FOUND in git log
- make typecheck: PASSED (exit 0)
- make lint: PASSED (0 errors, warnings only — all pre-existing)
- grep tenant_id.*tenant.id in remove/route.ts: FOUND
- grep inviteUserByEmail in invite/route.ts: FOUND
- grep EmptyState in MemberTable.tsx: FOUND
