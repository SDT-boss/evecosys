---
phase: 1
slug: auth-role-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x (unit/integration) + Playwright (E2E) |
| **Config file** | `vitest.config.ts` (project root) + `playwright.config.ts` |
| **Quick run command** | `npx vitest run test/unit/lib/platform/` |
| **Full suite command** | `make test` (Vitest) · `make e2e` (Playwright — requires running app) |
| **Estimated runtime** | ~10s (Vitest unit) · ~60s (Playwright E2E) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run test/unit/lib/platform/`
- **After every plan wave:** Run `make test`
- **Before `/gsd:verify-work`:** Full suite (`make test` + `make e2e`) must be green
- **Max feedback latency:** 10 seconds (unit), 60 seconds (E2E)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| DB migration (role enum + RLS) | 01 | 1 | AUTH-01, AUTH-04 | — | `platform_admin` valid in `users.role`; `tenants_select_platform_admin` policy blocks cross-tenant reads | Vitest unit | `npx vitest run test/unit/lib/platform/` | ❌ W0 | ⬜ pending |
| TypeScript types | 01 | 1 | AUTH-01 | — | `UserRole` includes `'platform_admin'`; TypeScript compiles without error | `make typecheck` | `npx tsc --noEmit` | ✅ (tsc exists) | ⬜ pending |
| `createPlatformClient` | 01 | 1 | AUTH-04 | — | `set_active_tenant` is called with correct tenantId before returning client | Vitest unit | `npx vitest run test/unit/lib/platform/createPlatformClient.test.ts` | ❌ W0 | ⬜ pending |
| `/platform` layout guard | 02 | 2 | AUTH-02 | — | platform_admin reaches page; manager/board/driver redirected to /login | Playwright E2E | `make e2e` | ❌ W0 | ⬜ pending |
| `/board/settings` layout guard | 02 | 2 | AUTH-03 | — | board+tenant-owner reaches page; no-tenant or wrong role redirected to /login | Playwright E2E | `make e2e` | ❌ W0 | ⬜ pending |
| Seed script | 01 | 1 | AUTH-01 | — | `make db-reset` creates platform_admin user without errors; `platform-admin@evecosys.local` exists in `public.users` | manual | `make db-reset && psql ... -c "SELECT role FROM public.users WHERE email='platform-admin@evecosys.local'"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/unit/lib/platform/createPlatformClient.test.ts` — unit tests for AUTH-01 (platform_admin valid in UserRole) and AUTH-04 (`set_active_tenant` called with tenantId)
- [ ] `e2e/tests/auth-guards/role-isolation.spec.ts` — extend with `/platform` and `/board/settings` route tests (AUTH-02, AUTH-03)
- [ ] `e2e/helpers/auth.helpers.ts` — add `platform_admin` to `TEST_USERS`, `AUTH_STATE_PATH`, and widen `UserSpec` role type
- [ ] `e2e/global-setup.ts` — add `ensureTestUser('platform_admin')` and storageState generation for `e2e/.auth/platform-admin.json`

*Note: Wave 0 test infrastructure must be created BEFORE the implementation tasks in later waves.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `make db-reset` applies seed.sql and creates platform_admin user | AUTH-01, AUTH-06 | Requires running Docker + local Supabase; seed.sql auto-application is not testable in Vitest | Run `make db-reset`; then `make dev`; log in as `platform-admin@evecosys.local` / `DevPassword123!`; confirm redirect to `/platform` stub |
| `/platform` stub renders minimal HTML without crash | AUTH-02 | UI rendering requires a browser | After `make dev`, visit `http://localhost:3000/platform` as platform_admin; confirm stub text visible, no JS errors |
| `check.make lint` and `make typecheck` pass | AUTH-01 | CI gate | Run `make lint && make typecheck`; confirm 0 errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s (Vitest unit)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
