# Roadmap: EVE-145 — Tenant Switcher & Workspace Context

## Overview

This milestone adds a Platform Admin area and Board-level tenant settings to EVEcosys. The work proceeds in five phases: first laying the auth foundation (role + RLS + guards), then building the Platform Admin shell, then wiring the full tenant-switching state machine to UI, then delivering the Board Settings area, and finally covering all new components with Storybook stories. Each phase delivers a coherent, independently-verifiable capability before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Auth & Role Foundation** - Add `platform_admin` role to DB, RLS, types, and route guards *(completed 2026-06-18)*
- [x] **Phase 2: Platform Admin Shell** - `/platform` route with tenant list, active indicator, and session persistence *(completed 2026-06-20)*
- [ ] **Phase 3: Tenant Switcher States** - Full switch flow UI — loading, success, failure, and blocked states
- [ ] **Phase 4: Board Tenant Settings** - Four-tab settings area: Branding, Users, BYODB, Feature Toggles
- [ ] **Phase 5: Storybook Coverage** - Stories for every new shell component and all switch-state variants

## Phase Details

### Phase 1: Auth & Role Foundation
**Goal**: The `platform_admin` role exists in the database, is enforced by RLS, and all protected routes correctly gate access so no existing role can reach restricted areas
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. A user with `platform_admin` role can reach `/platform` without redirect; any other role is sent to `/login`
  2. A board member can reach their tenant settings route; a non-board user is denied
  3. RLS policies prevent a platform admin query from returning rows that belong to a different tenant context
  4. The `platform_admin` value is valid in the `users.role` enum and recognised by `AppUser` / `UserRole` types
**Plans:** 3 plans

Plans:

Wave 1:
- [x] 01-01-PLAN.md — DB migration, seed, TypeScript types, server helper, and Wave 0 test infrastructure (AUTH-01, AUTH-04)

Wave 2 *(blocked on Wave 1 completion)*:
- [x] 01-02-PLAN.md — Schema push [BLOCKING] + /platform and /board/settings route guards and stub pages (AUTH-02, AUTH-03)

Wave 3 — Gap Closure *(blocked on Wave 2 completion)*:
- [x] 01-03-PLAN.md — board_no_tenant E2E test: SC-2 negative case (board member with no tenant → /login) (AUTH-03)

### Phase 2: Platform Admin Shell
**Goal**: Platform admins can navigate to `/platform`, see all registered tenants with their provisioning status, and have the current active tenant persistently shown in the header across navigations
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: PADM-01, PADM-02, PADM-03, PADM-04
**Success Criteria** (what must be TRUE):
  1. Platform admin sees a list of all tenants (name + status: Active / Pending / Suspended) after navigating to `/platform`
  2. Platform admin can click a tenant row to make it the active context
  3. The active tenant name appears in the `/platform` shell header at all times
  4. Navigating between pages within `/platform` does not reset the active tenant — it persists for the session
**Plans:** 3 plans
**UI hint**: yes

Plans:

Wave 0:
- [x] 02-01-PLAN.md — DB migration (tenants.name) + schema push [BLOCKING] + Tenant type sync + status utility + 4 Wave 0 test files (PADM-01..04)

Wave 1 *(blocked on Wave 0 completion)*:
- [x] 02-02-PLAN.md — ActiveTenantIndicator + bespoke PlatformShell + layout cookie-read wiring (PADM-03)

Wave 2 *(blocked on Wave 0 + Wave 1 completion)*:
- [x] 02-03-PLAN.md — setActiveTenant Server Action + TenantList + tenant-list page + active-row highlight (PADM-01, PADM-02, PADM-04)

### Phase 3: Tenant Switcher States
**Goal**: The tenant-switching action provides clear, real-time feedback for every outcome — in-progress, success, error, and blocked — so platform admins always know what happened and what to do next
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: SWIT-01, SWIT-02, SWIT-03, SWIT-04
**Success Criteria** (what must be TRUE):
  1. A spinner or loading indicator is visible to the platform admin for the full duration of a context switch
  2. After a successful switch, a confirmation state (toast or inline banner) tells the admin which workspace is now active
  3. If the switch fails (network error or permissions denial), an error state is shown with a clear message — the previous context remains intact
  4. If the admin navigates to a URL that is inaccessible in the current tenant context, a blocked/no-access screen appears rather than a blank page or raw error
**Plans**: TBD
**UI hint**: yes

### Phase 4: Board Tenant Settings
**Goal**: Board members can configure their own tenant's branding, membership, BYODB connection, and feature toggles through a dedicated settings area within the main dashboard — without affecting other tenants
**Mode:** mvp
**Depends on**: Phase 1, Phase 3
**Requirements**: BSET-01, BSET-02, BSET-03, BSET-04
**Success Criteria** (what must be TRUE):
  1. Board member can upload a logo, set a primary colour, and update the tenant display name — changes persist after page reload
  2. Board member can invite a new manager or driver by email and remove an existing user from their tenant
  3. Board member can enter BYODB credentials and register them via the `lib/tenant/` provisioning stack through a new API route — success and failure states are communicated
  4. Board member can toggle each platform feature flag on or off for their tenant — the toggle state reflects the saved value after reload
**Plans**: TBD
**UI hint**: yes

### Phase 5: Storybook Coverage
**Goal**: Every new design-system component and all switch-state variants have Storybook stories, so components can be reviewed and tested in isolation without a running app
**Mode:** mvp
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: STRB-01
**Success Criteria** (what must be TRUE):
  1. `TenantSwitcher` has stories covering the default list view, the loading state, success state, failure state, and blocked state
  2. `ActiveTenantIndicator` has a story for each of its display modes
  3. `BoardSettingsTabs` has a story for each of its four tabs (Branding, Users, BYODB, Feature Toggles)
  4. All new stories render without console errors in Storybook and pass the tokens pipeline (`make tokens`)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth & Role Foundation | 3/3 | Complete | 2026-06-18 |
| 2. Platform Admin Shell | 3/3 | Complete | 2026-06-20 |
| 3. Tenant Switcher States | 0/TBD | Not started | - |
| 4. Board Tenant Settings | 0/TBD | Not started | - |
| 5. Storybook Coverage | 0/TBD | Not started | - |
