---
phase: 4
slug: rollback-error-recovery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-09
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 |
| **Config file** | `vitest.config.mts` (unit); `vitest.integration.config.mts` (Wave 0 — new) |
| **Quick run command** | `npx vitest run test/unit/lib/tenant/rollback.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Integration run command** | `npx vitest run --config vitest.integration.config.mts` |
| **Estimated runtime** | ~5s (unit quick); ~15s (full unit suite); ~30s (integration) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run test/unit/lib/tenant/rollback.test.ts`
- **After every plan wave:** Run `npx vitest run` (full unit suite)
- **Before `/gsd:verify-work`:** Full unit suite + integration suite must be green
- **Max feedback latency:** 15 seconds (unit); 30 seconds (integration)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | ROLLBACK-01/02/03 | unit stub | `npx vitest run test/unit/lib/tenant/rollback.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 0 | TEST-04 | integration stub | `npx vitest run --config vitest.integration.config.mts` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 0 | TEST-04 | integration config | `npx vitest run --config vitest.integration.config.mts` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | ROLLBACK-01 | unit | `npx vitest run test/unit/lib/tenant/rollback.test.ts` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | ROLLBACK-02/03 | unit | `npx vitest run test/unit/lib/tenant/rollback.test.ts` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 2 | ROLLBACK-03/TEST-04 | integration | `npx vitest run --config vitest.integration.config.mts` | ❌ W0 | ⬜ pending |
| 4-04-01 | 04 | 3 | TEST-04 | unit (full suite) | `npx vitest run` | ✅ (293 green) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/unit/lib/tenant/rollback.test.ts` — stub file with describe blocks for ROLLBACK-01, ROLLBACK-02, ROLLBACK-03
- [ ] `test/integration/tenant-provisioning.test.ts` — stub file covering integration test describe blocks
- [ ] `vitest.integration.config.mts` — integration config with `environment: 'node'` and `.env.local` loading

*Wave 0 must complete before any implementation tasks run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Integration tests pass against local Supabase (Docker) | TEST-04 | Requires Docker + running local Supabase instance | Run `make db-start` then `npx vitest run --config vitest.integration.config.mts`; all tests must pass |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
