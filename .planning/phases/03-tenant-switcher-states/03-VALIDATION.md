---
phase: 3
slug: tenant-switcher-states
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npx vitest run --reporter=verbose test/unit/components/platform/ test/unit/lib/platform/` |
| **Full suite command** | `make test` |
| **E2E framework** | Playwright 1.60.0 |
| **E2E config file** | `playwright.config.ts` |
| **E2E run command** | `make e2e` |
| **Estimated runtime** | ~15s unit · ~60s E2E |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run test/unit/components/platform/ test/unit/lib/platform/`
- **After every plan wave:** Run `make test` (full Vitest suite)
- **Before `/gsd:verify-work`:** Full Vitest suite green + relevant E2E specs green

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 03-xx-01 | TBD | 0 | SWIT-04 | BlockedScreen renders EmptyState with correct title and CTA | unit | `npx vitest run test/unit/components/platform/BlockedScreen.test.tsx` | ❌ W0 | ⬜ pending |
| 03-xx-02 | TBD | 0 | SWIT-02 | TenantContext provider/consumer renders correctly | unit | `npx vitest run test/unit/components/platform/TenantContext.test.tsx` | ❌ W0 | ⬜ pending |
| 03-xx-03 | TBD | 0 | SWIT-03 | setActiveTenant returns `{ ok: false, error }` on cookie write failure | unit | `npx vitest run test/unit/lib/platform/setActiveTenant.test.ts` | ✅ (new case) | ⬜ pending |
| 03-xx-04 | TBD | 0 | SWIT-01–03 | TenantList loading/error/optimistic states (mock updated to `{ ok: true }`) | unit | `npx vitest run test/unit/components/platform/TenantList.test.tsx` | ✅ (new cases) | ⬜ pending |
| 03-xx-05 | TBD | 0 | SWIT-02 | ActiveTenantIndicator reads from TenantContext and updates optimistically | unit | `npx vitest run test/unit/components/platform/ActiveTenantIndicator.test.tsx` | ✅ (new cases) | ⬜ pending |
| 03-xx-06 | TBD | 0 | SWIT-01–04 | Full switch flow E2E + BlockedScreen E2E | E2E | `make e2e` (new spec) | ❌ W0 | ⬜ pending |
| 03-xx-07 | TBD | 1 | SWIT-01 | Spinner renders on pending row; all other rows aria-disabled; Table aria-busy | unit | `npx vitest run test/unit/components/platform/TenantList.test.tsx` | ✅ | ⬜ pending |
| 03-xx-08 | TBD | 1 | SWIT-02 | setActiveTenant returns `{ ok: true }` on success | unit | `npx vitest run test/unit/lib/platform/setActiveTenant.test.ts` | ✅ | ⬜ pending |
| 03-xx-09 | TBD | 1 | SWIT-03 | Alert destructive renders with error text; dismiss button clears Alert; optimistic state reverts | unit | `npx vitest run test/unit/components/platform/TenantList.test.tsx` | ✅ | ⬜ pending |
| 03-xx-10 | TBD | 1 | SWIT-04 | layout renders BlockedScreen when cookie absent and pathname !== /platform | unit | `npx vitest run test/unit/components/platform/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/unit/components/platform/BlockedScreen.test.tsx` — stubs for SWIT-04 (new component, no file exists)
- [ ] `test/unit/components/platform/TenantContext.test.tsx` — stubs for context provider/consumer (new module)
- [ ] `e2e/tests/platform/tenant-switcher.spec.ts` — E2E spec for SWIT-01–04 (new file)
- [ ] `e2e/page-objects/PlatformPage.ts` — page object for `/platform` (follows DashboardPage.ts pattern)
- [ ] Update `test/unit/components/platform/TenantList.test.tsx` — change mock from `mockResolvedValue(undefined)` to `mockResolvedValue({ ok: true })`
- [ ] New test cases in `test/unit/lib/platform/setActiveTenant.test.ts` — ActionResult error path (SWIT-03)
- [ ] New test cases in `test/unit/components/platform/ActiveTenantIndicator.test.tsx` — context-based name rendering (SWIT-02)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ActiveTenantIndicator header updates immediately on row click (optimistic) | SWIT-02 | React Context timing cannot be reliably asserted in unit tests without a full app render | Start dev server, log in as platform_admin, click a different tenant — verify header changes before spinner disappears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s (unit) / 60s (E2E)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
