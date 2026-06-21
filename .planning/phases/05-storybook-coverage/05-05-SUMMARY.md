---
phase: 05-storybook-coverage
plan: "05"
subsystem: design-system/storybook
tags: [storybook, stories, content-states, invite-state-row, ui-coverage]
dependency_graph:
  requires: ["05-02"]
  provides: [ContentStates stories, InviteStateRow stories]
  affects: [design-system/stories]
tech_stack:
  added: []
  patterns: [Storybook Meta+StoryObj pattern, render-function stories for multi-component files, static Date offsets for stable story args]
key_files:
  created:
    - design-system/stories/ContentStates.stories.tsx
    - design-system/stories/InviteStateRow.stories.tsx
  modified: []
decisions:
  - Used `onLearnMore` prop (actual component API) instead of plan's `onSeeFeatures` typo
  - Used static Date offsets from fixed reference epoch (2026-06-21T12:00:00Z) for InviteStateRow stories to prevent time-drift rendering issues
  - ContentStates uses render-function stories (not args) because components don't share a single prop interface
metrics:
  duration: "10m"
  completed: "2026-06-21"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 05 Plan 05: ContentStates and InviteStateRow Storybook Stories Summary

Storybook story files for all 5 shell content state components (LoadingState, EmptyState, ErrorState, RestrictedState, UnavailableState) and the InviteStateRow with all 5 lifecycle states plus LimitedAccess variant.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ContentStates stories (all 5 shell states) | 7ed4c5c | design-system/stories/ContentStates.stories.tsx |
| 2 | InviteStateRow stories (5 lifecycle states + LimitedAccess) | 7ed4c5c | design-system/stories/InviteStateRow.stories.tsx |

## What Was Built

**ContentStates.stories.tsx** — covers all five shell content state components:
- `Loading` — shimmer grid via LoadingState
- `Empty` — zero-data placeholder with message
- `EmptyWithCta` — empty state with action button
- `Error` — connection/server error with retry and report actions
- `Restricted` — 403 access denied with back and request-access actions
- `Unavailable` — feature gated/upgrade required

Uses `LoadingState` as the primary Meta component; other state components rendered via `render:` functions since they have distinct prop interfaces. A decorator wraps each story in a `max-width: 600px, padding: 24px` container for realistic viewport context.

**InviteStateRow.stories.tsx** — covers all 5 invite lifecycle states plus the limited access variant:
- `Sent` — amber badge, expires in 5 days, Resend + Revoke buttons
- `Expiring` — amber badge, expires in 8 hours, Resend + Revoke buttons
- `Accepted` — green badge, joined 2h ago, View button
- `Expired` — grey badge, expired 3 days ago, Re-invite button
- `Revoked` — red badge, revoked 1 day ago by Admin User, Re-invite button
- `LimitedAccess` — sent state with `isLimitedAccess: true`; buttons are rendered but disabled with lock glyph

All Date values use static offsets from a fixed reference epoch (`2026-06-21T12:00:00Z`) to prevent time-drift rendering inconsistencies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected prop name mismatch for UnavailableState**
- **Found during:** Task 1
- **Issue:** Plan specified `onSeeFeatures` as the second prop for UnavailableState, but the actual component (ContentStates.tsx) exports `onLearnMore`
- **Fix:** Used `onLearnMore={fn()}` to match the actual component API
- **Files modified:** design-system/stories/ContentStates.stories.tsx
- **Commit:** 7ed4c5c

## Verification

- ContentStates.stories.tsx: no ESLint errors
- InviteStateRow.stories.tsx: no ESLint errors
- No story-specific TypeScript errors
- Pre-existing typecheck errors in `.next/` generated files are out of scope and pre-date this plan

## Known Stubs

None — all stories use static mock data with no placeholder text or unconnected data sources.

## Threat Flags

None — story files contain only fictional names and emails (charlie@example.com, dana@example.com, etc.) with no real PII and no new network endpoints.

## Self-Check: PASSED

- design-system/stories/ContentStates.stories.tsx: EXISTS
- design-system/stories/InviteStateRow.stories.tsx: EXISTS
- Commit 7ed4c5c: EXISTS
- ESLint clean on both new files: CONFIRMED
