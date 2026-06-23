# EVE-145: Tenant Switcher & Workspace Context

## What This Is

A full feature build for the EVecosys fleet platform that adds a Platform Admin area and Board-level tenant settings. Internal team members (platform admins) get a dedicated route to list all tenant organizations and switch between them safely. Board members get a tenant settings area to configure branding, users, BYODB connections, and feature toggles — without leaving the main app.

This is part of the broader "Platform Foundation — Multi-tenant Fleet Platform" project.

## Core Value

Platform admins can always see which tenant they're operating in and switch context without any cross-tenant data leakage or user confusion.

## Requirements

### Validated

<!-- Shipped capabilities inferred from existing codebase (.planning/codebase/) -->

- ✓ Multi-role authentication (manager, driver, board) with JWT sessions via Supabase Auth — existing
- ✓ Role-gated dashboards with server-side auth enforcement at layout level — existing
- ✓ DashboardShell navigation shell (topbar + horizontal nav + content wrapper) — existing
- ✓ Tenant state machine with BYODB registration service and Vault credential storage — existing (`lib/tenant/`)
- ✓ Supabase RLS enforcement on all data access — existing
- ✓ Design token system (`var(--ds-*)` CSS custom properties) — existing
- ✓ `@evecosys/design-system` component library — existing

<!-- EVE-145 phases 1–4 shipped -->

- ✓ `platform_admin` role added to auth system, RLS, and DB schema — Phase 1
- ✓ Platform Admin route (`/platform`) with tenant list — accessible only to platform admins — Phase 2
- ✓ Active tenant indicator in Platform Admin header showing current workspace — Phase 2
- ✓ Context persistence across navigation for platform admin sessions — Phase 2
- ✓ Tenant switcher UI — tenant list, selection, loading / success / failure / blocked states — Phase 3
- ✓ Blocked / no-access state when a restricted destination is reached — Phase 3
- ✓ API routes wiring `lib/tenant/` provisioning stack to HTTP endpoints — Phase 4
- ✓ Board Tenant Settings area — four tabs: Branding, Users, BYODB, Feature Toggles — Phase 4

### Active

<!-- EVE-145 remaining scope -->

- [ ] Storybook stories for all new shell components and states — Phase 5 (executed, pending UAT)
- [ ] E2E test: platform admin switches tenants; sees new context reflected app-wide — stubs exist (`test.skip`); full E2E deferred until Supabase local env is stable

### Out of Scope

- Mobile / responsive design — web-first; tablet/mobile deferred
- Real-time tenant data sync across concurrent sessions — deferred
- Tenant creation / deletion flows — deferred (Platform Admin v2)
- Third-party SSO for platform admins — deferred
- Branding preview hot-reload — deferred

## Context

**Active branch:** `feature/eve-145-design-tenant-switcher-and-workspace-context-ux`
**Linear issue:** EVE-145 — "Design tenant switcher and workspace context UX"
**Linear project:** Platform Foundation — Multi-tenant Fleet Platform

**Existing tenant infrastructure (built, untested in production):**
- `lib/tenant/stateMachine.ts` — pure state transitions (Pending → Provisioning → Active → Suspended → Deprovisioned)
- `lib/tenant/registrationService.ts` — orchestrates BYODB probe → Vault store → state transition
- `lib/tenant/vaultStore.ts` — Supabase Vault RPC integration for credential storage
- No API routes expose any of this to the app yet
- No tenant switcher UI exists
- No `platform_admin` role in DB or RLS

**Key codebase patterns (from .planning/codebase/):**
- Auth enforcement happens per-layout at `app/(dashboard)/{role}/layout.tsx` — no centralised middleware
- Server Components fetch data; Client Components handle interaction; mutations go through `app/api/**/route.ts`
- New migrations go in `supabase/migrations/` — never edit existing files
- Design tokens via `var(--ds-*)` only; no hardcoded hex
- Components belong in `@evecosys/design-system` (not `components/ui/`)

## Constraints

- **Design tokens:** All colours, spacing, radii via `var(--ds-*)` — no hardcoded hex values
- **Component source:** New UI primitives in `design-system/components/` and exported from `@evecosys/design-system`
- **Schema changes:** New migration file per change; never edit existing migrations
- **CI gate:** lint + test + tokens + build + audit must all pass before merge
- **Security:** `platform_admin` access must be enforced at both layout and API route level; never expose other tenant data through RLS

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Platform Admin route model | Clean separation — platform ops never mixed with tenant UX; industry standard (Vercel, Stripe) | `/platform` standalone route group with its own PlatformShell — Phase 2 |
| Full feature build (design + code + Storybook) | Deliverable must be implementation-ready and immediately usable; not a spec-only phase | All 4 feature phases shipped with Storybook in Phase 5 — complete |
| Board settings within main app | Boards have a natural home in their tenant's dashboard; separate app would be friction | `app/(dashboard)/board/settings/` route group inside main dashboard — Phase 4 |
| Middleware for RSC pathname detection | Keeps `platform/layout.tsx` fully server-rendered; alternative (thin client wrapper) would force a client boundary | `middleware.ts` forwards `x-pathname` header; scoped to non-static routes — Phase 3 |
| ActionResult pattern for server actions | `{ ok, error }` return instead of throw; lets client components handle errors without try/catch | Applied to `setActiveTenant` and all board-settings API routes — Phases 3–4 |
| TenantContext for cross-boundary state | Server Components render initial state; Client Components need live updates — context bridges the gap | `TenantProvider` + `useTenantContext()` in `components/platform/TenantContext.tsx` — Phase 3 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-21 after Phase 3 UAT (code-verified)*
