# Phase 4: Board Tenant Settings - Context

**Gathered:** 2026-06-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers a four-tab settings area at `/board/settings` where board members configure their own tenant — branding (logo, colour, name), user membership (invite + remove), BYODB database connection, and platform feature toggles. Auth is already guarded by the existing `board/settings/layout.tsx`. The `lib/tenant/` provisioning stack is the implementation backbone for BYODB. No other tenant's data is accessible.

**In scope:**
- Settings tab navigation bar (4 nested routes under `/board/settings`)
- Branding tab: logo upload to Supabase Storage, hex colour input, display name — BSET-01
- Users tab: invite by email (Supabase inviteUserByEmail) with role selection, remove user (hard delete) — BSET-02
- BYODB tab: credential form wired to `lib/tenant/registrationService.ts` via a new API route — BSET-03
- Feature Toggles tab: 8 per-tenant flags stored as JSONB on the tenants table — BSET-04
- 'Settings' nav item added to the board DashboardShell NAV

**Out of scope:**
- Branding preview hot-reload (deferred — BSET-05 v2)
- Platform admin creating/suspending tenants (Platform Admin v2 scope)
- Cross-tenant user management
- Roles beyond manager and driver (board members cannot invite platform_admins)
- Mobile/responsive design (web-first; deferred to v2)

</domain>

<decisions>
## Implementation Decisions

### Tab Navigation (D-01–D-04)

- **D-01:** Use **nested routes** for all four tabs:
  - `/board/settings/branding` — Branding tab (BSET-01)
  - `/board/settings/users` — Users tab (BSET-02)
  - `/board/settings/byodb` — BYODB tab (BSET-03)
  - `/board/settings/toggles` — Feature Toggles tab (BSET-04)
  Each tab is a `page.tsx` under `app/(dashboard)/board/settings/`.
- **D-02:** `/board/settings` root **redirects to `/board/settings/branding`**. Replace the current stub `page.tsx` with a `redirect('/board/settings/branding')`.
- **D-03:** The **tab navigation bar lives in `board/settings/layout.tsx`** — a new layout shared across all four sub-pages. The existing auth + tenant guard in that layout stays intact; the new layout wraps it around both the tab nav and `{children}`.
- **D-04:** Add **`{ label: 'Settings', icon: '...', href: '/board/settings' }`** to the board NAV array in `app/(dashboard)/board/layout.tsx`. Icon choice is Claude's discretion.

### Branding (D-05–D-07)

- **D-05:** Logo is a **file upload to a Supabase Storage bucket**. A new migration adds `logo_url TEXT` to the `tenants` table. The upload API route writes to Supabase Storage (RLS-secured) and saves the resulting public URL to `tenants.logo_url`.
- **D-06:** Primary colour is a **free hex input** (text field, e.g. `#1A2B3C`). Validated client-side. A new migration adds `primary_color TEXT` to `tenants`. Stored as the raw hex string.
- **D-07:** All branding changes are submitted via an **explicit Save button**. On server action success: inline success feedback (reuse Alert, success variant). On failure: inline Alert (destructive variant), same ActionResult pattern as Phase 3. No optimistic updates — wait for server confirmation.

### Feature Flags (D-08–D-11)

- **D-08:** V1 flag set — **8 named flags** stored under a `feature_flags JSONB` column on `tenants`:

  | Flag key | What it controls |
  |---|---|
  | `member_invitations` | Whether the tenant can invite new members |
  | `fleet` | Fleet feature availability |
  | `carbon` | Carbon reporting availability |
  | `trips` | Trips management availability |
  | `driver_behaviour_score` | Driver behaviour scoring availability |
  | `alerts` | Alerts feature availability |
  | `charging_stations` | Charging station feature availability |
  | `auth_troubleshooting` | Enables force-password-reset capability for board members |

- **D-09:** When a feature flag is OFF, the feature is **disabled within its page** (locked state or hidden capability) — the nav item itself remains visible. Nav hiding is out of scope for v1.
- **D-10:** `auth_troubleshooting` flag specifically **enables the force-password-reset action** for board members within their tenant. When OFF, that action is not surfaced in the Users tab.
- **D-11:** Stored as **`feature_flags JSONB NOT NULL DEFAULT '{}'`** added via new migration on the `tenants` table. Default state for new tenants (all on vs all off) is Claude's discretion — recommend all-on by default so existing tenants get a sensible default.

### User Management (D-12–D-15)

- **D-12:** Invite = **`supabase.auth.admin.inviteUserByEmail()`** via the Supabase Admin API. Sends a real invitation email. Creates the auth user. Must go through the service-role client (`lib/supabase/service.ts`) inside an API route handler.
- **D-13:** Invite form includes a **role selector (Manager / Driver)**. The chosen role is written to the `users` table when the invite is accepted (or via a post-invite webhook). Board members cannot select `platform_admin`.
- **D-14:** Remove = **hard delete**: delete the row from the `users` table AND call `supabase.auth.admin.deleteUser(userId)` via the service-role client. Symmetric with the invite flow. Irreversible — confirmation dialog before executing.
- **D-15:** The Users tab list queries **`users WHERE tenant_id = <current tenant id>`**. This requires the `users` table to have a `tenant_id` foreign key column (may not exist yet — researcher/planner to verify and add migration if needed). Display: name, email, role, and a Remove button per row.

### Claude's Discretion
- Exact icon name for the Settings nav entry in the board NAV
- Sub-route slug variants if names conflict (e.g. `/toggles` vs `/features`)
- Visual treatment of the Supabase Storage logo upload (drag-and-drop vs simple `<input type="file">`)
- Hex colour validation details (lowercase normalisation, length check)
- Default value for `feature_flags` JSONB — recommend all flags `true` for new tenants
- Exact UI label and description for each feature flag on the toggles tab
- Whether `auth_troubleshooting` is grouped separately from the other feature-availability flags in the UI
- Confirmation dialog copy for the Remove user action

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Board Settings Foundation
- `app/(dashboard)/board/settings/layout.tsx` — existing auth + board role + tenant guard (will gain tab nav in this phase)
- `app/(dashboard)/board/settings/page.tsx` — stub to be replaced with redirect to `/board/settings/branding`
- `app/(dashboard)/board/layout.tsx` — board DashboardShell NAV to be updated with Settings entry (D-04)

### Tenant Infrastructure (lib/tenant/)
- `lib/tenant/registrationService.ts` — BYODB registration orchestrator: probe → vault → state transition (BSET-03)
- `lib/tenant/credentials.ts` — credential validation and normalisation for BYODB inputs
- `lib/tenant/types.ts` — `Tenant` type, `TenantState`, domain error classes
- `lib/tenant/stateMachine.ts` — pure tenant state transitions (caller persists state)

### Supabase Clients
- `lib/supabase/service.ts` — service-role client for `inviteUserByEmail` and `deleteUser` (D-12, D-14) — import only from API routes or Server Components
- `lib/supabase/server.ts` — cookie-based server client for data fetching

### Database Schema
- `supabase/migrations/20260609120000_create_tenants.sql` — tenants table baseline (columns to add onto)
- `supabase/migrations/20260618120000_add_tenant_name.sql` — most recent migration pattern to follow for new columns

### Design System Components
- `design-system/components/Tabs` — tab nav bar across all four settings tabs (D-03)
- `design-system/components/Switch` — feature flag toggles (D-08–D-11)
- `design-system/components/Alert` — success/error feedback (success + destructive variants, D-07)
- `design-system/components/Input` — form fields (hex colour, display name, BYODB credentials)
- `design-system/components/Button` — save actions, invite submit, remove trigger
- `design-system/components/Table` — user list display (D-15)
- `design-system/components/Dialog` — confirmation dialog for Remove user (D-14)

### Prior Phase Context
- `.planning/phases/03-tenant-switcher-states/03-CONTEXT.md` — ActionResult pattern `{ ok: boolean; error?: string }` (D-07); Alert component usage for inline feedback
- `.planning/phases/01-auth-role-foundation/01-CONTEXT.md` — RLS patterns and `createPlatformClient` for tenant-scoped queries

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — BSET-01 through BSET-04 definitions
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, and dependencies (requires Phase 1 + Phase 3)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `design-system/components/Tabs` — direct reuse for settings tab bar; active-tab highlight via current pathname
- `design-system/components/Switch` — perfect fit for feature flag toggles; already in design system
- `design-system/components/Alert` (success + destructive) — established Phase 3 pattern for save feedback; no new components needed
- `design-system/components/Dialog` — for the Remove user confirmation (pre-existing)
- `lib/tenant/registrationService.ts` — the BYODB probe + vault flow is already built and tested; Phase 4 just needs an API route to call it
- `lib/supabase/service.ts` — already has the service-role client setup; use it inside `app/api/` handlers for invite/remove

### Established Patterns
- **Server Action / ActionResult:** Return `{ ok: boolean; error?: string }` from server actions; on failure render Alert (destructive) above the form. Carry Phase 3 pattern forward unchanged.
- **Layout-level auth guard:** `board/settings/layout.tsx` already enforces board role + tenant existence. The new layout builds on top of it.
- **API route for mutations:** Writes go through `app/api/**/route.ts` with role re-verification. BYODB registration and user invite/remove follow this pattern (not Server Actions) because they require the service-role client.
- **New migrations only:** Every schema change (logo_url, primary_color, feature_flags, and possibly users.tenant_id) is a new file in `supabase/migrations/` — never edit existing migrations.
- **Design tokens:** `var(--ds-*)` for all colours, spacing, radii — no hardcoded hex in component JSX.

### Integration Points
- `app/(dashboard)/board/layout.tsx` NAV → add Settings entry pointing to `/board/settings`
- `app/(dashboard)/board/settings/layout.tsx` → replaces current passthrough with a full tab nav + auth guard layout
- `app/api/board/settings/branding/route.ts` (new) → handles logo upload to Supabase Storage + tenants UPDATE
- `app/api/board/settings/users/invite/route.ts` (new) → calls `supabase.auth.admin.inviteUserByEmail`
- `app/api/board/settings/users/remove/route.ts` (new) → calls `supabase.auth.admin.deleteUser` + deletes users row
- `app/api/board/settings/byodb/route.ts` (new) → calls `registrationService.register()` from `lib/tenant/`
- `app/api/board/settings/toggles/route.ts` (new) → updates `tenants.feature_flags JSONB`

</code_context>

<specifics>
## Specific Ideas

- `auth_troubleshooting` flag unlocks a "Force password reset" action within the Users tab — not a separate tab or page, just a button per user row that appears when the flag is ON
- `feature_flags` JSONB column default should be all-flags-true so existing tenants don't suddenly lose access when the migration runs
- The Tabs tab bar at the top of settings: use `pathname.startsWith('/board/settings/X')` to determine the active tab (standard Next.js pattern with `usePathname` or RSC-passed `pathname`)
- BYODB form: follow the structured/URL input modes already defined in `lib/tenant/credentials.ts` — don't invent new input formats
- Logo upload: return the Supabase Storage public URL and store in `tenants.logo_url`; if upload fails, do not update the DB row

</specifics>

<deferred>
## Deferred Ideas

- Branding preview hot-reload during configuration — deferred as BSET-05 (v2 scope, already in REQUIREMENTS.md)
- Feature flag: hiding entire nav sections when a feature is off — deferred, requires nav-guard changes in board/layout.tsx and was explicitly descoped in discussion
- Platform admin–level visibility of which feature flags each tenant has set — Platform Admin v2 scope
- Role assignment post-invite (two-step flow) — not chosen; role is set on the invite form (D-13)

</deferred>

---

*Phase: 4-Board Tenant Settings*
*Context gathered: 2026-06-20*
