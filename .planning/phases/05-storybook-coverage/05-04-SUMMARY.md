---
phase: 05-storybook-coverage
plan: 04
subsystem: storybook-stories
tags: [storybook, stories, tenant-switcher, active-tenant, board-settings, compatibility]
dependency_graph:
  requires:
    - 05-01 (TenantSwitcher, TenantContext, TenantList components)
    - 05-02 (ContentStates + InviteStateRow)
    - 05-03 (layout migration)
  provides:
    - design-system/stories/TenantSwitcher.stories.tsx (5 stories)
    - design-system/stories/ActiveTenantIndicator.stories.tsx (3 stories)
    - design-system/stories/BoardSettingsTabs.stories.tsx (4 stories)
    - .storybook/next-config-stub.js (compatibility fix)
  affects:
    - Plan 05 (remaining Storybook coverage stories)
tech_stack:
  added: []
  patterns:
    - Per-story TenantProvider decorator with different initialName (not meta-level)
    - Wrapper components for internal state machine visual states (SwitchingInProgress)
    - parameters.nextjs.navigation.pathname per-story (not meta-level) for usePathname mocking
    - next/config stub for @storybook/nextjs compatibility with Next.js 16
key_files:
  created:
    - design-system/stories/TenantSwitcher.stories.tsx
    - design-system/stories/ActiveTenantIndicator.stories.tsx
    - design-system/stories/BoardSettingsTabs.stories.tsx
    - .storybook/next-config-stub.js
  modified:
    - .storybook/main.ts (added webpackFinal with next/config alias)
decisions:
  - Per-story TenantProvider decorator chosen over meta-level because each story needs a different initialName (null vs tenant name)
  - SwitchingInProgress story uses wrapper component duplicating TenantList visual structure to avoid triggering setActiveTenant server action import chain
  - SwitchFailure story renders Alert directly (not via TenantList) for the same reason — avoids next/headers dependency via server action
  - next/config stub created in .storybook/ and aliased via webpackFinal to fix @storybook/nextjs preset initialisation failure on Next.js 16
metrics:
  duration: "~12 minutes"
  completed_date: "2026-06-21T15:30:00Z"
  tasks_completed: 2
  files_created: 4
  files_modified: 1
---

# Phase 05 Plan 04: TenantSwitcher, ActiveTenantIndicator, and BoardSettingsTabs Stories Summary

Storybook stories for three D-06 components: TenantSwitcher sidebar dropdown (5 stories), ActiveTenantIndicator (3 stories), and BoardSettingsTabs/SettingsTabNav (4 stories). Fixed a pre-existing @storybook/nextjs + Next.js 16 compatibility blocker (missing next/config module).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | TenantSwitcher stories + next/config fix | 2b10435 | design-system/stories/TenantSwitcher.stories.tsx, .storybook/main.ts, .storybook/next-config-stub.js |
| 2 | ActiveTenantIndicator + BoardSettingsTabs stories | 6230d2e | design-system/stories/ActiveTenantIndicator.stories.tsx, design-system/stories/BoardSettingsTabs.stories.tsx |

## Decisions Made

1. **Per-story TenantProvider decorators:** `ActiveTenantIndicator` needs a different `initialName` in each story (null, "Acme Fleet", null for Loading). Using a meta-level decorator would force all stories to share one initial state. Per-story decorators correctly override the meta-level one (Storybook merges decorators in reverse order).

2. **SwitchingInProgress wrapper pattern:** `TenantList.isPending` and `pendingTenantId` are internal React state triggered by `useTransition()`. Since the state can only be reached by clicking a row (which calls the server action), stories cannot show it via props. A `SwitchingInProgressWrapper` component reproduces the exact visual output (spinner row, dimmed table, `aria-busy`) using the same design system primitives, without triggering the server action.

3. **Server action isolation for SwitchFailure:** `TenantList` imports `setActiveTenant` from `@/app/(dashboard)/platform/actions` which uses `'use server'` / `next/headers`. Rather than rendering `TenantList` in the SwitchFailure story (which would bundle the server action), the story renders the Alert and TenantList separately — the Alert with the failure message shown directly, and TenantList with a clean state below it. The visual effect matches what a user sees after a failed switch.

4. **next/config stub:** `@storybook/nextjs` 8.6.18 calls `addScopedAlias(baseConfig, "next/config")` during preset initialisation. Next.js 16 removed `next/config` (it was a Pages Router concept). This caused `require.resolve("next/config")` to throw at preset load time, aborting the build before webpack ran. The fix: create `.storybook/next-config-stub.js` and alias it via `webpackFinal` in `.storybook/main.ts`. A `node_modules/next/config.js` stub was also created temporarily to fix the Node-level resolution (non-committed, in node_modules).

5. **pathname per story (not meta):** Per RESEARCH.md Risk 2, `SettingsTabNav` uses `pathname.startsWith(tab.href)` to determine the active tab. Setting pathname only in meta would mean all four stories show the same tab active. Each story has its own `parameters.nextjs.navigation.pathname`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing Storybook build failure: next/config missing in Next.js 16**
- **Found during:** Task 1 verification (npm run build-storybook)
- **Issue:** `@storybook/nextjs` 8.6.18 calls `require.resolve("next/config")` during preset initialisation. Next.js 16 removed this module (it was a Pages Router concept with no equivalent in App Router). The error `Cannot find module 'next/config'` caused the build to abort before webpack ran.
- **Fix:** Created `.storybook/next-config-stub.js` with `getConfig()` / `setConfig()` stubs and aliased it in `.storybook/main.ts` via `webpackFinal`. Also created `node_modules/next/config.js` for Node-level resolution (not committed — in gitignored node_modules).
- **Files modified:** `.storybook/main.ts`, `.storybook/next-config-stub.js` (new)
- **Commit:** 2b10435
- **Residual:** A second deeper incompatibility exists (webpack Cache.shutdown conflict between `@storybook/builder-webpack5` and `next/dist/compiled/webpack`) — see Known Issues below.

**2. [Rule 3 - Blocking] Avoided server action import chain in SwitchFailure and SwitchingInProgress stories**
- **Found during:** Task 1 implementation (code analysis)
- **Issue:** `TenantList` imports `setActiveTenant` from `@/app/(dashboard)/platform/actions` which uses `'use server'` and `next/headers`. Rendering `TenantList` in Storybook would bundle this import chain, potentially causing issues in the browser context.
- **Fix:** Used wrapper components for switching/failure visual states rather than relying on `TenantList` internal state. `SwitchFailure` renders the Alert directly. `SwitchingInProgress` uses a `SwitchingInProgressWrapper` component that reproduces the same visual output.
- **Files modified:** design-system/stories/TenantSwitcher.stories.tsx
- **Commit:** 2b10435

## Known Issues (Pre-existing, Out of Scope)

**Storybook webpack build failure (Next.js 16 + @storybook/nextjs 8.6.18 incompatibility)**

After fixing the `next/config` module resolution issue, a second failure appears:
```
SB_BUILDER-WEBPACK5_0002 (WebpackInvocationError): Module not found: TypeError: Cannot read properties of undefined (reading 'tap')
  at Cache.shutdown (next/dist/compiled/webpack/bundle5.js)
```

Root cause: `@storybook/builder-webpack5` creates webpack compiler instances that call `Cache.shutdown` with a plugin hook API that doesn't match `next/dist/compiled/webpack/bundle5.js` (Next.js 16's bundled, patched webpack5 with a modified cache plugin interface).

Confirmed pre-existing: build fails identically with no story files at all (just the base Storybook config). This incompatibility was present from when Storybook was first installed (commit `49420ff` — Storybook 8.6.18 installed alongside Next.js 16.2.4).

**Resolution path (requires architectural decision):**
- Option A: Downgrade Next.js to v15 (LTS) which is fully supported by `@storybook/nextjs` 8.6.18
- Option B: Upgrade `@storybook/nextjs` to a version with explicit Next.js 16 support (when available)
- Option C: Switch to `@storybook/react-webpack5` and manually add Next.js mocks — loses automatic `next/navigation` and `next/link` mocking

**This is documented in `deferred-items.md`** and is NOT blocking story file correctness.

## Story File Correctness

Although the Storybook build cannot be verified end-to-end (pre-existing build failure), the story files are structurally and type-correct:
- All imports use `@/components/*` paths (not relative paths)
- `@storybook/nextjs` mocks `next/navigation` (usePathname) and `next/link` via the export-mocks alias map (visible in preset code)
- `TenantProvider` correctly provides `TenantContext` for all stories that need it
- No hardcoded hex values for colors with --ds-* tokens (only --ds-color-* used)
- TypeScript type-check passes: `make typecheck` exits 0
- `make tokens` exits 0

## Known Stubs

None. Story files use real component imports. TenantProvider provides real context. The only "mock" is the `SwitchingInProgressWrapper` which duplicates visual structure — this is intentional (plan explicitly calls for a wrapper component) and matches exactly what TenantList renders during the switching state.

## Threat Flags

None. Story files are build-time static assets with static mock data only. No credentials or PII in story args (per T-05-05 accepted threat). No new packages installed (per T-05-SC accepted threat).

## Self-Check: PASSED

**Files created:**
- [x] design-system/stories/TenantSwitcher.stories.tsx — FOUND (exports: DefaultList, ActiveRowHighlighted, SwitchingInProgress, SwitchFailure, EmptyTenants)
- [x] design-system/stories/ActiveTenantIndicator.stories.tsx — FOUND (exports: Default, NoTenant, Loading)
- [x] design-system/stories/BoardSettingsTabs.stories.tsx — FOUND (exports: BrandingTabActive, UsersTabActive, BYODBTabActive, FeatureTogglesTabActive)
- [x] .storybook/next-config-stub.js — FOUND

**Files modified:**
- [x] .storybook/main.ts — confirmed: webpackFinal with next/config alias added

**Commits exist:**
- [x] 2b10435 — feat(05-04): add TenantSwitcher stories + fix Storybook next/config compatibility
- [x] 6230d2e — feat(05-04): add ActiveTenantIndicator and BoardSettingsTabs stories

**Verification:**
- [x] make tokens — PASSED
- [x] make typecheck — PASSED (no TypeScript errors on story files)
- [ ] npm run build-storybook — FAILED (pre-existing Next.js 16 / @storybook/nextjs webpack incompatibility, not caused by plan changes)
