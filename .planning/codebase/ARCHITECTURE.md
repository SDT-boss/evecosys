# Architecture
<!-- mapped: 2026-06-13 -->

**Analysis Date:** 2026-06-13

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Browser / Client                                  │
│   React 19 Client Components   (app/(auth)/**,  components/**)      │
└──────────────────────┬──────────────────────────────────────────────┘
                       │  HTTP / RSC streaming
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                Next.js 16 App Router  (app/**)                      │
│                                                                      │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────────┐ │
│  │  Route Groups    │  │  Role Layouts   │  │  API Routes        │ │
│  │  (auth)          │  │  manager/       │  │  app/api/**        │ │
│  │  (dashboard)     │  │  board/         │  │  route.ts handlers │ │
│  │  (ds-preview)    │  │  driver/        │  └────────────────────┘ │
│  └──────────────────┘  └─────────────────┘                         │
└───────┬──────────────────────────┬──────────────────────────────────┘
        │                          │
        ▼                          ▼
┌──────────────────┐    ┌──────────────────────────────────────────┐
│  lib/supabase/   │    │  lib/tenant/                             │
│  client.ts       │    │  stateMachine.ts  (pure, in-memory)      │
│  server.ts       │    │  registrationService.ts (orchestrator)   │
│  service.ts      │    │  credentials.ts   (validation)           │
│  (RLS-respecting │    │  probe.ts / probeDriver.ts               │
│   clients)       │    │  vault.ts / vaultStore.ts                │
└───────┬──────────┘    └───────────────────────┬──────────────────┘
        │                                        │
        ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL + RLS + Auth + Vault)              │
│  Tables: users, vehicles, drivers, trips, alerts, charging_stations  │
│  Auth: Supabase Auth (JWT sessions via @supabase/ssr cookie adapter) │
│  Vault: store_byodb_secret / delete_byodb_secret RPCs               │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root layout | ThemeProvider + font injection | `app/layout.tsx` |
| Auth group | Login, signup, forgot/reset password flows | `app/(auth)/` |
| Manager layout | Role guard (manager), DashboardShell + nav | `app/(dashboard)/manager/layout.tsx` |
| Board layout | Role guard (board), DashboardShell + nav | `app/(dashboard)/board/layout.tsx` |
| Driver layout | Role guard (driver), DashboardShell + nav | `app/(dashboard)/driver/layout.tsx` |
| DashboardShell | Topbar + horizontal nav + main content area | `components/layout/DashboardShell.tsx` |
| API routes | Mutation endpoints behind role checks | `app/api/**/route.ts` |
| Supabase browser client | RLS-respecting client for React client components | `lib/supabase/client.ts` |
| Supabase server client | RLS-respecting server client (cookies-based) | `lib/supabase/server.ts` |
| Supabase service client | Bypasses RLS — admin-only, server-only marker | `lib/supabase/service.ts` |
| Tenant state machine | Pure in-memory lifecycle transitions | `lib/tenant/stateMachine.ts` |
| BYODB registration service | Orchestrates probe → vault → state transition | `lib/tenant/registrationService.ts` |
| Credential normalizer | Validates + normalises structured/URL inputs | `lib/tenant/credentials.ts` |
| Connectivity probe interface | Port to test against (sync boundary) | `lib/tenant/probe.ts` |
| Real connectivity probe | pg + mysql2 live reachability driver | `lib/tenant/probeDriver.ts` |
| Vault interface | Port for secret storage (sync boundary) | `lib/tenant/vault.ts` |
| Supabase vault store | Concrete vault using Supabase Vault RPCs | `lib/tenant/vaultStore.ts` |
| Domain types | AppUser, Vehicle, Driver, Trip, Alert, etc. | `types/index.ts` |
| Behavior score | Pure driver score calculator from trips | `lib/behaviorScore.ts` |
| Fleet health score | Pure fleet health calculator from vehicles/alerts | `lib/fleetHealth.ts` |
| Design system | Tokenised Radix/shadcn primitive components | `design-system/components/` |

## Pattern Overview

**Overall:** Role-gated Next.js App Router with server-side auth enforcement, Supabase for data + auth, and a hexagonal / ports-and-adapters architecture inside `lib/tenant/`.

**Key Characteristics:**
- Server Components perform auth checks and data fetching at the layout level before rendering pages
- Client Components (`"use client"`) handle interactive UI only — they call `lib/supabase/client.ts` (browser)
- API route handlers are the mutation boundary; all writes go through `app/api/**/route.ts`
- The tenant provisioning subsystem (`lib/tenant/`) uses explicit interfaces (ports) to keep business logic testable without real databases
- Design tokens flow from `design-system/tokens/tokens.json` → Style Dictionary → `dist/tokens/variables.css`, consumed via `var(--ds-*)` CSS custom properties

## Layers

**Presentation (Server Components):**
- Purpose: Fetch data from Supabase and render HTML
- Location: `app/(dashboard)/**/page.tsx`
- Contains: Async React Server Components that call `lib/supabase/server.ts` directly
- Depends on: `lib/supabase/server.ts`, `lib/behaviorScore.ts`, `lib/fleetHealth.ts`, `types/`

**Presentation (Client Components):**
- Purpose: Interactive UI — forms, navigation, real-time clocks, theme toggles
- Location: `app/(auth)/**/page.tsx`, `components/**`
- Contains: `"use client"` React components
- Depends on: `lib/supabase/client.ts`, `components/ui/`, design system

**Route Group Layouts (Role Guards):**
- Purpose: Authenticate + authorise the current user before rendering any child page
- Location: `app/(dashboard)/manager/layout.tsx`, `app/(dashboard)/board/layout.tsx`, `app/(dashboard)/driver/layout.tsx`
- Pattern: `getUser()` → check `profile.role` → `redirect('/login')` if wrong role
- Depends on: `lib/supabase/server.ts`

**API Layer:**
- Purpose: Mutation endpoints (POST/PATCH) with role enforcement
- Location: `app/api/**/route.ts`
- Contains: Next.js Route Handlers; each handler re-verifies the session and role before acting
- Depends on: `lib/supabase/server.ts`, `lib/supabase/service.ts` (for admin operations)

**Domain / Business Logic:**
- Purpose: Pure, framework-independent business logic
- Location: `lib/tenant/`, `lib/behaviorScore.ts`, `lib/fleetHealth.ts`
- Contains: State machines, orchestrators, validators, score calculators
- Depends on: Interfaces only (no Next.js, no Supabase SDK at this layer for tenant)

**Infrastructure Adapters:**
- Purpose: Concrete implementations of domain interfaces
- Location: `lib/tenant/vaultStore.ts`, `lib/tenant/probeDriver.ts`, `lib/supabase/*.ts`
- Depends on: `@supabase/ssr`, `@supabase/supabase-js`, `pg`, `mysql2`

**Design System:**
- Purpose: Token-driven Radix/shadcn component primitives
- Location: `design-system/components/`
- Exported as: `@evecosys/design-system` (resolved via `components.json` / path alias)
- Depends on: `class-variance-authority`, `@radix-ui/*`, `clsx`, `tailwind-merge`

## Data Flow

### Authenticated Page Request

1. Browser hits `/manager` → Next.js invokes `app/(dashboard)/manager/layout.tsx` (Server Component)
2. Layout calls `createClient()` from `lib/supabase/server.ts` (cookie-based session)
3. `supabase.auth.getUser()` — if no session, `redirect('/login')`
4. Fetches `users` row, checks `profile.role === 'manager'` — if wrong role, `redirect('/login')`
5. Renders `<DashboardShell>` wrapping the page child
6. Page (`app/(dashboard)/manager/page.tsx`) runs as Server Component — fetches fleet data via `supabase.from('vehicles')...`
7. HTML streamed to browser

### Mutation (API Route)

1. Client Component fires `fetch('/api/alerts/resolve', { method: 'POST', body: ... })`
2. `app/api/alerts/resolve/route.ts` — calls `createClient()` (server), verifies session + role
3. Performs Supabase mutation (UPDATE alerts)
4. Returns `NextResponse.json({ success: true })`
5. Client Component updates local UI state

### Tenant BYODB Registration Flow

1. Caller provides `Tenant` in `Provisioning` state and a `BYODBCredentialInput`
2. `BYODBRegistrationService.register()` (`lib/tenant/registrationService.ts`):
   - Guards: tenant must be `Provisioning`
   - `normalizeCredential()` validates and normalises input
   - `ConnectivityProbe.probe()` tests live reachability + schema ownership
   - `VaultStore.store()` writes secret to Supabase Vault
   - `transition()` advances state `Provisioning → Active`
   - On failure after store: rolls back vault secret, re-throws

**State Management:**
- Server: no in-memory state; all state in Supabase PostgreSQL + session cookies
- Client: local React `useState` for form fields, loading flags, and UI toggles
- Tenant lifecycle: explicit state machine in `lib/tenant/stateMachine.ts` (in-memory transitions only; persistence is the caller's responsibility)

## Key Abstractions

**ConnectivityProbe:**
- Interface: `lib/tenant/probe.ts`
- Concrete: `lib/tenant/probeDriver.ts` (RealConnectivityProbe — pg + mysql2)
- Inject fake probes to avoid network calls in unit tests

**VaultStore:**
- Interface: `lib/tenant/vault.ts`
- Concrete: `lib/tenant/vaultStore.ts` (SupabaseVaultStore via RPCs)
- Inject in-memory stores for unit tests

**DashboardShell:**
- Location: `components/layout/DashboardShell.tsx`
- Pattern: receives `navItems`, `user`, and optional `alertBell` slot; role-specific navs defined in each layout

**AppUser / Domain Types:**
- Location: `types/index.ts`
- Contains: `AppUser`, `Vehicle`, `Driver`, `Trip`, `Alert`, `ChargingStation`, `UserPreference`, `UserRole`

## Entry Points

| Entry Point | Location | Responsibility |
|-------------|----------|----------------|
| Root redirect | `app/page.tsx` | Redirects any unauthenticated visit to `/login` |
| Root layout | `app/layout.tsx` | Injects ThemeProvider, globals.css, design token CSS, Google Fonts |
| Manager layout | `app/(dashboard)/manager/layout.tsx` | Auth guard + role check + DashboardShell |
| Board layout | `app/(dashboard)/board/layout.tsx` | Auth guard + role check + DashboardShell |
| Driver layout | `app/(dashboard)/driver/layout.tsx` | Auth guard + role check + DashboardShell |

## Architectural Constraints

- **Server-only clients:** `lib/supabase/service.ts` imports `server-only` — build fails if imported from a Client Component. Use only inside `app/api/` handlers or Server Components.
- **Two Supabase client flavours:** `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server). Never use `client.ts` inside Server Components or API routes.
- **RLS enforcement:** All browser queries go through `client.ts`/`server.ts` and respect Row Level Security. Only `service.ts` bypasses RLS.
- **No shared mutable global state:** All Supabase clients are created per-request inside function bodies.
- **Tenant state machine is pure:** `lib/tenant/stateMachine.ts` performs no I/O. The caller is responsible for persisting state.
- **Design tokens via CSS custom properties only:** All colours, spacing, and radii must use `var(--ds-*)`. No hardcoded hex values in new components.

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Duplicate Badge component (`components/ui/Badge.tsx` vs `design-system/components/Badge/`) | Diverging variant names; design system incomplete | Import `Badge` from `@evecosys/design-system` |
| Inline service-role client in API routes | Bypasses the `server-only` safety guard | Use `createServiceClient` from `@/lib/supabase/service` |
| Hardcoded hex colours in `style` props | Bypasses design token system | Define semantic token aliases in `tokens.json`, use `var(--ds-color-*)` |

## Error Handling

**Domain errors** extend `Error` with a typed `name`: `InvalidStateTransitionError`, `AuthSessionError`, `TenantAccessError`, `ProvisioningRollbackError`, `ConnectivityError`, `CredentialValidationError`, `VaultStorageError` — all defined in `lib/tenant/types.ts` and related interface files.

**API boundary:** catch domain errors and return appropriate HTTP status codes.

**Cross-cutting:** `console.*` only for logging — no structured logging framework. Credentials and passwords are never included in error messages.

---
*Architecture analysis: 2026-06-13*
