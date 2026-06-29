---
phase: 2
slug: platform-admin-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-18
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.8 + jsdom |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Setup file** | `test/setup.ts` (jsdom mocks: ResizeObserver, matchMedia, next/navigation) |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 2-??-01 | TBD | 0 | PADM-01 | N/A | unit | `npm test -- --run test/unit/lib/platform/tenantStatus.test.ts` | ❌ W0 | ⬜ pending |
| 2-??-02 | TBD | 0 | PADM-01 | N/A | unit (component) | `npm test -- --run test/unit/components/platform/TenantList.test.tsx` | ❌ W0 | ⬜ pending |
| 2-??-03 | TBD | 0 | PADM-02 | Cookie set only via Server Action | unit | `npm test -- --run test/unit/lib/platform/setActiveTenant.test.ts` | ❌ W0 | ⬜ pending |
| 2-??-04 | TBD | 0 | PADM-03 | N/A | unit (component) | `npm test -- --run test/unit/components/platform/ActiveTenantIndicator.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/unit/lib/platform/tenantStatus.test.ts` — `mapTenantState()` and `statusBadgeVariant()` for PADM-01
- [ ] `test/unit/components/platform/TenantList.test.tsx` — TenantList render + empty + error states (PADM-01)
- [ ] `test/unit/lib/platform/setActiveTenant.test.ts` — Server Action cookie set + revalidatePath (PADM-02, PADM-04)
- [ ] `test/unit/components/platform/ActiveTenantIndicator.test.tsx` — placeholder and name render (PADM-03)

*All four test files are new — Wave 0 must create stubs before implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Active tenant persists across `/platform` navigations in a real browser | PADM-04 | Requires live session; Playwright scope is E2E-only per project convention | Log in as platform_admin, set active tenant, navigate between pages, confirm indicator stays |
| Status badge colors render correctly | PADM-01 | Visual; no automated assertion | Verify Active=green, Pending=yellow, Suspended=red in browser |
| Row click stays on list page (no navigation) | PADM-02 | React event + router interaction; covered partially by unit tests | Click row, confirm URL stays `/platform`, confirm header updates |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
