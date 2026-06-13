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

### Active

<!-- EVE-145 scope: full feature build — design + React + wired-up logic + Storybook -->

- [ ] `platform_admin` role added to auth system, RLS, and DB schema
- [ ] Platform Admin route (`/platform`) with tenant list — accessible only to platform admins
- [ ] Active tenant indicator in Platform Admin header showing current workspace
- [ ] Tenant switcher UI — tenant list, selection, loading / success / failure states
- [ ] Context persistence across navigation for platform admin sessions
- [ ] Blocked / no-access state when a restricted destination is reached
- [ ] API routes wiring `lib/tenant/` provisioning stack to HTTP endpoints
- [ ] Board Tenant Settings area — four tabs: Branding, Users, BYODB, Feature Toggles
- [ ] Storybook stories for all new shell components and states
- [ ] E2E test: platform admin switches tenants; sees new context reflected app-wide

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
| Platform Admin route model | Clean separation — platform ops never mixed with tenant UX; industry standard (Vercel, Stripe) | — Pending |
| Full feature build (design + code + Storybook) | Deliverable must be implementation-ready and immediately usable; not a spec-only phase | — Pending |
| Board settings within main app | Boards have a natural home in their tenant's dashboard; separate app would be friction | — Pending |

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
*Last updated: 2026-06-13 after initialization*
