---
status: partial
phase: 01-auth-role-foundation
source: [01-VERIFICATION.md]
started: 2026-06-18T10:35:00Z
updated: 2026-06-18T10:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Driver/board cannot reach `/platform`
expected: Navigating to `/platform` as a driver or board user redirects to `/login`
result: [pending]

### 2. Board user with no tenant row is redirected at `/board/settings`
expected: A board user with no corresponding `tenants` row (owner_id = user.id) navigating to `/board/settings` is redirected to `/login`
result: [pending]

### 3. Seed user exists after `make db-reset`
expected: After running `make db-reset`, the user `platform-admin@evecosys.local` exists in `public.users` with role `platform_admin`
result: [pending]

### 4. Full `make e2e` passes
expected: `make e2e` exits 0 — platform_admin can reach `/platform`, manager cannot, board user with tenant can reach `/board/settings`, unauthenticated GET /platform redirects to /login
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
