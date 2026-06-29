# Phase 3: Tenant Switcher States - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-20
**Phase:** 3-tenant-switcher-states
**Areas discussed:** Loading indicator scope, Success notification, Error contract & surface, Blocked state trigger & screen

---

## Loading Indicator Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Row-level spinner | Only the clicked row shows a Spinner; other rows remain interactive. Uses useTransition to track pending state per row. | ✓ |
| Full-list overlay | Entire table covered with a loading overlay / dimmed. Prevents any double-click. | |
| Header indicator changes | ActiveTenantIndicator switches to a loading state (pulsing or "Switching…" text). | |

**User's choice:** Row-level spinner

**Follow-up — row locking:**

| Option | Description | Selected |
|--------|-------------|----------|
| Lock all rows | Once a switch starts, all rows become non-interactive until resolved. Prevents race conditions. | ✓ |
| Only lock the active row | Other rows remain clickable, letting the admin queue a second switch. | |

**User's choice:** Lock all rows

**Notes:** Row-level spinner identifies which switch is in-flight; locking all rows prevents double-switching race conditions. Both decisions together.

---

## Success Notification

| Option | Description | Selected |
|--------|-------------|----------|
| Header update is enough | ActiveTenantIndicator updates to show new tenant name — that IS the confirmation. No extra UI. | ✓ |
| Inline success banner | Alert (success variant) appears at top of tenant list for a few seconds, then auto-dismisses. | |
| Success state on the row | Switched-to row briefly shows a checkmark or "Active" animation. | |

**User's choice:** Header update is enough

**Follow-up — optimistic update:**

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic update | Row highlight and header indicator switch immediately on click; reverses on failure. | ✓ |
| Wait for server confirmation | Row stays in loading state until server action resolves, then updates. | |

**User's choice:** Optimistic update

**Notes:** Phase 2 explicitly set the cookie httpOnly: false to enable this pattern. Optimistic + header-only confirmation keeps the UX clean and fast.

---

## Error Contract & Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Return ActionResult type | Change signature to Promise<{ ok: boolean; error?: string }>. Client checks ok; reverts optimistic state on failure. | ✓ |
| Client try/catch only | Keep void return. Wrap call in try/catch on client. | |
| You decide | Claude picks the right error contract. | |

**User's choice:** Yes — return ActionResult type

**Follow-up — error surface:**

| Option | Description | Selected |
|--------|-------------|----------|
| Inline banner above tenant list | Alert (destructive variant) above TenantList on failure. Dismissible. Reuses existing Alert component. | ✓ |
| Error state on the row itself | Failed row briefly shows error icon/color before resetting. | |
| Modal or dialog | Dialog opens with error message and retry/dismiss button. | |

**User's choice:** Inline banner above the tenant list

**Notes:** ActionResult return type lets the client get structured error messages. Alert (destructive) reuses existing design system component — no new components needed.

---

## Blocked State Trigger & Screen

| Option | Description | Selected |
|--------|-------------|----------|
| No active tenant selected yet | Platform admin navigates to /platform sub-route requiring an active tenant but hasn't selected one. | ✓ |
| Tenant mismatch or access denied | Server checks whether active tenant is accessible to current admin; blocked screen on any /platform/* route if denied. | |
| Both scenarios | Blocked screen covers both: (a) no tenant selected and (b) active tenant inaccessible. | |

**User's choice:** No active tenant selected yet

**Follow-up — architecture:**

| Option | Description | Selected |
|--------|-------------|----------|
| Platform layout guard | /platform/layout.tsx already reads cookie; if sub-route requires active tenant and cookie is empty, layout renders BlockedScreen instead of children. | ✓ |
| Middleware | middleware.ts checks cookie on protected /platform/* routes. | |
| Per-page check | Each page checks cookie itself and returns blocked UI. | |

**User's choice:** Platform layout guard

**Follow-up — blocked screen design:**

| Option | Description | Selected |
|--------|-------------|----------|
| EmptyState component + CTA | Reuse existing EmptyState with "Select a workspace to continue" and a link to the tenant list. | ✓ |
| Full-page custom screen | Bespoke layout with illustration, heading, instructions. | |
| You decide | Claude picks the design. | |

**User's choice:** EmptyState component + CTA

**Notes:** Scoped narrowly to "no active tenant selected" only — tenant-access-denied case deferred to Phase 4+. Layout guard is the right location since the layout already reads the cookie for ActiveTenantIndicator.

---

## Claude's Discretion

- Exact copy for the EmptyState title/description on the blocked screen
- Whether the blocked-state check is a prop on the layout or a separate RSC wrapper
- Whether BlockedScreen is its own component file or inlined in the layout
- Visual treatment of disabled rows while switch is in-flight (opacity vs. cursor)

## Deferred Ideas

- Tenant access-denied / suspended tenant blocked state — Phase 4+
- RLS policies on data tables (vehicles, drivers, etc.) — not required for SWIT-01–04
- Tenant detail pages (`/platform/tenants/[id]`) — beyond Phase 3 scope
- Toast/notification design system component — Phase 4+ if needed
