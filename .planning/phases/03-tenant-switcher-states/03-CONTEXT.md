# Phase 3: Tenant Switcher States - Context

**Gathered:** 2026-06-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 adds real-time feedback to the tenant context-switch action so platform admins always know the outcome. Every switch triggers a visible loading state, resolves into a clear success signal or an inline error, and any attempt to access a route that requires an active tenant when none is selected shows a blocked/no-access screen rather than a broken page.

**In scope:**
- Loading state during switch: row-level spinner on the clicked row, all rows locked until resolved (SWIT-01)
- Success signal: ActiveTenantIndicator header update + optimistic row highlight — no additional toast (SWIT-02)
- Error state: `setActiveTenant` returns `ActionResult`; on failure, an inline Alert (destructive) appears above the tenant list and optimistic state reverts (SWIT-03)
- Blocked screen: platform layout guard renders an EmptyState when no active tenant cookie exists and a sub-route requires one (SWIT-04)

**Out of scope:**
- Tenant detail pages (`/platform/tenants/[id]`) — future phase
- Blocked state for tenant access denied / suspended tenant — Phase 3 only covers "no tenant selected"
- Toast/notification component — not building one; using existing Alert + header update
- RLS policies on data tables (vehicles, drivers, etc.) — Phase 1 D-03 deferred this to Phase 3+ but it's not required to satisfy SWIT-01–04

</domain>

<decisions>
## Implementation Decisions

### Loading State (SWIT-01)

- **D-01:** Use a **row-level spinner** — only the clicked row shows a `Spinner` component from the design system while the switch is in-flight. Other rows do not show loading UI.
- **D-02:** **All rows are locked** during a switch. Once a row click fires, the entire `TenantList` becomes non-interactive (pointer-events disabled or rows disabled) until the action resolves. Prevents race conditions from double-switching. Row-level spinner still identifies which switch is pending.
- **D-03:** Use React 19's `useTransition` / `startTransition` to wrap the `setActiveTenant` call. `isPending` from the transition drives both the row spinner and the disabled-row state. No external state management needed.

### Success Confirmation (SWIT-02)

- **D-04:** The **ActiveTenantIndicator header update is the success confirmation** — no toast, no inline banner, no extra component. When the switch resolves, the header already shows the new tenant name. This is sufficient feedback.
- **D-05:** Apply an **optimistic update** — immediately set local state to the new `activeTenantId` on row click (before the server action resolves). This makes the row highlight and header indicator switch instantly. On failure, revert local state back to the previous `activeTenantId`. Phase 2 set the cookie `httpOnly: false` (D-07) specifically to enable this.

### Error Contract & Surface (SWIT-03)

- **D-06:** Change `setActiveTenant` signature from `Promise<void>` to `Promise<{ ok: boolean; error?: string }>`. On cookie failure or any thrown error, return `{ ok: false, error: "message" }` instead of throwing. This is the structured ActionResult pattern.
- **D-07:** On failure, the client **reverts optimistic state** (local `activeTenantId` resets to previous value) and renders an **inline Alert (destructive variant)** above the `TenantList`. Alert is dismissible. Reuses the existing Alert component — no new components needed.
- **D-08:** Error message copy: something like "Failed to switch workspace. Please try again." with the server-provided `error` string appended if available.

### Blocked / No-Access Screen (SWIT-04)

- **D-09:** The blocked screen is triggered by a **single condition: no active tenant cookie** when a platform admin navigates to a `/platform` sub-route that requires one. The tenant-list page itself does not require an active tenant (it's how you select one). Only sub-routes beyond the list need one.
- **D-10:** The check lives in **`/platform/layout.tsx`** (the platform layout guard). The layout already reads the cookie for `ActiveTenantIndicator`. If a sub-route is flagged as tenant-required and the cookie is absent, the layout renders a `BlockedScreen` component instead of `{children}`.
- **D-11:** The blocked screen uses the existing **`EmptyState` component** from the design system. Message: "Select a workspace to continue" with a description and a link/button pointing back to the tenant list (`/platform`). No new design system components.

### Claude's Discretion
- Exact copy for the EmptyState title/description on the blocked screen
- Whether the blocked-state check is a prop on the layout or a separate RSC wrapper inside the layout
- Whether `BlockedScreen` is its own component file or inlined in the layout
- Visual treatment of disabled rows while switch is in-flight (opacity reduction vs. cursor-not-allowed)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 Foundation (what Phase 3 modifies)
- `app/(dashboard)/platform/actions.ts` — `setActiveTenant` server action to be updated with ActionResult return type (D-06)
- `components/platform/TenantList.tsx` — client component to receive loading/error/optimistic state (D-01–D-05, D-07)
- `components/platform/ActiveTenantIndicator.tsx` — success signal; receives new active tenant name from optimistic state
- `app/(dashboard)/platform/layout.tsx` — location for blocked-state check (D-10); already reads cookie
- `app/(dashboard)/platform/page.tsx` — server component that passes `activeTenantId` to TenantList

### Phase 2 Decisions (carry forward)
- `.planning/phases/02-platform-admin-shell/02-CONTEXT.md` — D-07: cookie is `httpOnly: false` for Phase 3 optimistic UI; D-09: row click via Server Action

### Phase 1 Decisions
- `.planning/phases/01-auth-role-foundation/01-CONTEXT.md` — D-01/D-03: `createPlatformClient(tenantId)` mechanism for RLS-scoped queries; wiring this into data queries is Phase 3+ scope but not required for SWIT-01–04

### Design System Components
- `design-system/components/Spinner` — row-level loading indicator (D-01)
- `design-system/components/Alert` — destructive variant for error surface (D-07); success/default variants available
- `design-system/components/EmptyState` — blocked screen (D-11)

### Requirements
- `.planning/REQUIREMENTS.md` — SWIT-01 through SWIT-04 definitions
- `.planning/ROADMAP.md` — Phase 3 success criteria and dependencies

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `design-system/components/Spinner` — drop-in for row-level loading indicator
- `design-system/components/Alert` — destructive + success variants exist; no new components needed for error surface
- `design-system/components/EmptyState` — already used in `TenantList` for empty/error states; reuse for blocked screen
- `components/platform/ActiveTenantIndicator.tsx` — already transitions between "no workspace" and active-tenant states; will update via optimistic local state

### Established Patterns
- **Server Action + useTransition:** Next.js 16 / React 19 pattern — wrap server action call in `startTransition`; `isPending` drives loading UI. `TenantList` is already `'use client'`.
- **Optimistic UI:** Phase 2 explicitly set `httpOnly: false` on the cookie so client code can read it. Phase 3 moves to local React state for the active tenant ID (seeded from the server-passed prop) and only falls back to cookie after page reload.
- **CSS tokens:** All colours and spacing via `var(--ds-*)` — no hardcoded values.
- **ActionResult pattern:** Return `{ ok: boolean; error?: string }` from server actions that can fail — consistent with how API routes return structured errors.

### Integration Points
- `app/(dashboard)/platform/actions.ts` → `TenantList.tsx`: ActionResult flows back to client; on error, error string displayed in Alert
- `app/(dashboard)/platform/layout.tsx` → `BlockedScreen`: layout reads cookie and decides whether to render children or the blocked screen
- `components/platform/ActiveTenantIndicator.tsx`: Phase 3 may need to accept an optimistic-state prop or read from a shared context if the header and TenantList need to stay in sync without a full server revalidation

</code_context>

<specifics>
## Specific Ideas

- The `TenantList` component will need a `pendingTenantId: string | null` state variable to track which row is in the loading state, and an `activeTenantId` state variable initialized from the server-passed prop (for optimistic updates)
- Error Alert should appear above the `<Table>` element, inside the TenantList render
- The blocked screen check could be: if `pathname` is beyond `/platform` root AND `activeTenantId` cookie is absent → render `<EmptyState>` instead of `{children}` — but the exact sub-route boundary is Claude's call
- `Spinner` inside a table row: render inside `<TableCell>` replacing or alongside the tenant name

</specifics>

<deferred>
## Deferred Ideas

- Tenant access-denied / suspended tenant blocked state — both cases in SWIT-04 language, but scoped to "no tenant selected" only for Phase 3; full access-denied check is Phase 4+
- RLS policies on data tables (vehicles, drivers, etc.) — Phase 1 D-03 explicitly deferred to Phase 3+; not required for SWIT-01–04 and can be its own plan within Phase 3 or Phase 4
- Tenant detail pages (`/platform/tenants/[id]`) — beyond Phase 3 scope
- Toast/notification component for design system — could be useful in Phase 4+; not building one in Phase 3

</deferred>

---

*Phase: 3-Tenant Switcher States*
*Context gathered: 2026-06-20*
