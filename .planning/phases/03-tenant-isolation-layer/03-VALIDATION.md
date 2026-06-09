---
phase: 3
slug: tenant-isolation-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-09
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run test/unit/lib/tenant/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run test/unit/lib/tenant/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | SEC-01 | unit | `npx vitest run test/unit/lib/tenant/authGuard.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | SEC-01/SEC-04 | unit | `npx vitest run test/unit/lib/tenant/authGuard.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | SEC-02/SEC-04 | unit | `npx vitest run test/unit/lib/tenant/tenantIsolation.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 2 | SEC-03 | build | `npx next build` | ✅ | ⬜ pending |
| 3-03-01 | 03 | 2 | SEC-03 | unit | `npx vitest run test/unit/lib/tenant/` | ✅ | ⬜ pending |
| 3-03-02 | 03 | 2 | TEST-03 | unit | `npx vitest run test/unit/lib/tenant/tenantIsolation.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/unit/lib/tenant/authGuard.test.ts` — stubs for SEC-01 (session validation) and SEC-04 (ownership check)
- [ ] `test/unit/lib/tenant/tenantIsolation.test.ts` — stubs for SEC-02 (RLS isolation) and TEST-03 (cross-tenant reads return zero rows)

*Existing infrastructure (vitest, supabaseMock.ts) covers the framework — only test file stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `server-only` import causes Next.js build error when imported client-side | SEC-03 | Requires intentional Client Component misconfiguration to trigger | Create a temp Client Component that imports `lib/tenant/authGuard.ts`, run `npx next build`, confirm build error, then revert |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
