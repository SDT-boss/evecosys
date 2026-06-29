# Phase 4: Board Tenant Settings - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-20
**Phase:** 4-board-tenant-settings
**Areas discussed:** Tab navigation model, Logo storage approach, Feature flags definition, User invite flow

---

## Tab Navigation Model

| Question | Options | Selected |
|---|---|---|
| Single URL vs nested routes? | In-page Tabs / Nested routes | Nested routes ✓ |
| Default landing tab? | Redirect to /branding / Redirect to /users / Keep /settings as own page | Redirect to /branding ✓ |
| Where does the tab nav bar live? | board/settings/layout.tsx / Each individual page | layout.tsx ✓ |
| Add Settings to board NAV? | Yes / No | Yes ✓ |

**Notes:** User confirmed nested routes for deep-linkability. Settings entry to be added alongside Overview, Fleet, Carbon, Trips.

---

## Logo Storage Approach

| Question | Options | Selected |
|---|---|---|
| Logo input method? | File upload → Supabase Storage / URL input only / You decide | File upload → Supabase Storage ✓ |
| Colour input method? | Free hex input / Colour picker / You decide | Free hex input ✓ |
| Save mechanism? | Save button with feedback / Auto-save on change | Save button with feedback ✓ |

**Notes:** Standard save-button pattern with Alert feedback (success + destructive), consistent with Phase 3 ActionResult approach. No optimistic updates.

---

## Feature Flags Definition

| Question | Options | Selected |
|---|---|---|
| Flag definition approach? | Define now (fixed set) / Placeholder flags / Flexible system from start | Define now — fixed set ✓ |
| What flags? (freeform) | — | member_invitations, feature availability per module, auth_troubleshooting, all current app features |
| Auth troubleshooting meaning? | Force password reset / Session visibility / Enable support mode | Force password reset ✓ |
| Toggle effect? | Hide entire nav sections / Disable features within pages / You decide | Disable features within pages ✓ |
| DB storage shape? | JSONB column on tenants / Boolean columns / Separate table | JSONB column on tenants ✓ |

**User's freeform flag description:** "member invitations, feature availability, user authentication troubleshooting, all individual features in the application right now"

**Resolved to 8 flags:** `member_invitations`, `fleet`, `carbon`, `trips`, `driver_behaviour_score`, `alerts`, `charging_stations`, `auth_troubleshooting`

**Notes:** Flags disable capabilities within pages; nav items remain visible. `auth_troubleshooting` flag surfaces a force-password-reset action on the Users tab.

---

## User Invite Flow

| Question | Options | Selected |
|---|---|---|
| Invite mechanism? | Supabase inviteUserByEmail / Create pending DB row | Supabase inviteUserByEmail ✓ |
| Role selection on invite? | Yes, role selector on form / No, assign post-invite | Yes, role selector ✓ |
| Remove behaviour? | Hard delete (users table + auth) / Soft delete | Hard delete ✓ |
| User list source? | users WHERE tenant_id matches / users WHERE owner_id chain | tenant_id matches ✓ |

**Notes:** Invite calls Supabase Admin API via service-role client. Role options: Manager, Driver only (no platform_admin). Remove triggers a confirmation dialog before hard delete. Researcher/planner to verify whether `users.tenant_id` column exists or needs a new migration.

---

## Claude's Discretion

- Icon for Settings nav entry in board NAV
- Sub-route slug for BYODB tab (chose `/byodb`; `/database` is an alternative)
- Visual treatment of logo upload (drag-and-drop vs simple file input)
- Hex colour validation implementation details
- Default JSONB value for `feature_flags` on new tenants (recommend all flags `true`)
- Exact UI labels for each feature flag
- Whether `auth_troubleshooting` is visually grouped separately from feature-availability flags

## Deferred Ideas

- Branding preview hot-reload (v2 scope, already in REQUIREMENTS.md as BSET-05)
- Hiding entire nav sections when a feature is toggled off (requires nav-guard changes, descoped in discussion)
- Platform admin visibility into per-tenant feature flag state (Platform Admin v2)
