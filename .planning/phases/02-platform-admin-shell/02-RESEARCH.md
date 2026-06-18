# Phase 2: Platform Admin Shell - Research

**Researched:** 2026-06-18
**Domain:** Next.js 16 App Router — Server Actions, cookies API, Server Components, layout re-rendering; Supabase PostgreSQL schema migration; custom design-system component composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Build a bespoke `PlatformShell` component — new file at `components/layout/PlatformShell.tsx`, dedicated to `/platform`. Same visual style as `DashboardShell` but purpose-built. `DashboardShell` is NOT modified.
- **D-02:** The `PlatformShell` topbar includes an `ActiveTenantIndicator` slot showing the active tenant name. When no tenant is active, shows a neutral placeholder.
- **D-03:** Add a `name TEXT NOT NULL DEFAULT ''` column to `public.tenants` via a new migration. Canonical display name for later editing in Phase 4.
- **D-04:** Tenant list displays each row as: name (from `tenants.name`) + status badge (mapped from `tenants.state`).
- **D-05:** Map `tenants.state` to display label: `'Registered'` → `'Pending'`, `'Provisioning'` → `'Pending'`, `'Active'` → `'Active'`, `'Suspended'` → `'Suspended'`, `'Decommissioned'` → filtered out entirely.
- **D-06:** Use a cookie (`platform_active_tenant`) to persist the active tenant ID. Set via Server Action on row click. Read by `/platform/layout.tsx` Server Component to pass active tenant name to `PlatformShell`.
- **D-07:** Cookie scope: path `/platform`, session-duration (no `max-age`), `httpOnly: false` so client can also read it for Phase 3 optimistic UI.
- **D-08:** Clicking a tenant row sets it as active context only — updates the cookie and refreshes the header indicator. No navigation to detail page.
- **D-09:** Row click handled via a Server Action — no full page reload required; header indicator updates without navigating away.

### Claude's Discretion

- Exact wording for the "no active tenant" placeholder in the header
- Whether `Decommissioned` tenants appear in the list or are filtered out
- Visual style of the status badge colour mapping
- Animation or transition on active-tenant indicator update

These have all been resolved in `02-UI-SPEC.md` (approved 2026-06-18):
- Placeholder: `"No workspace selected"`
- Decommissioned: filtered out (WHERE state != 'Decommissioned')
- Badge: `secondary` for Pending, `default` for Active, `destructive` for Suspended
- Transition: 200ms color-only on icon + text

### Deferred Ideas (OUT OF SCOPE)

- Tenant detail page (`/platform/tenants/[id]`) — Phase 3 or later
- Switch-flow feedback (loading spinner, success/error states) — Phase 3 (SWIT-01 through SWIT-04)
- RLS policies on data tables scoped by active tenant — Phase 3
- `tenants.name` editing UI — Phase 4 (BSET-01 branding settings)
- Storybook stories for new components — Phase 5 (STRB-01)
- Board Settings tabs — Phase 4

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PADM-01 | Platform admin can view a list of all registered tenants with their provisioning status (Active, Pending, Suspended) | DB migration adds `name` column; Supabase query with `createClient()` + existing RLS policy `tenants_select_platform_admin`; TenantList Server Component fetches and renders; status mapped via D-05 |
| PADM-02 | Platform admin can switch active tenant context by selecting a tenant from the list | Server Action sets `platform_active_tenant` cookie on row click; `revalidatePath('/platform', 'layout')` triggers layout re-render; ActiveTenantIndicator updates |
| PADM-03 | Platform admin sees the active tenant name as a persistent indicator in the platform admin header | PlatformShell reads active tenant name from cookie-derived server prop; ActiveTenantIndicator renders name or placeholder; sticky header ensures it's always visible |
| PADM-04 | Active tenant context persists across page navigations within the same platform admin session | Cookie with path `/platform` and no max-age is browser-session-scoped; layout reads it on every server render; persists for the duration of the browser session |

</phase_requirements>

---

## Summary

Phase 2 layers a complete Platform Admin Shell UI on top of the Phase 1 infrastructure (role guard, `tenants_select_platform_admin` RLS policy, `createPlatformClient`). The implementation involves three concerns that must land in a specific order: (1) the DB migration that adds `tenants.name`, (2) the PlatformShell component + layout wiring, and (3) the Server Action + cookie mechanism for active-tenant persistence.

The key technical insight is how the active-tenant cookie drives the header update. The Server Action sets the cookie via `(await cookies()).set(...)` from `next/headers`, then calls `revalidatePath('/platform', 'layout')`. This invalidates the layout's Router Cache entry, causing Next.js to re-fetch `/platform/layout.tsx` on the very next render, which reads the newly-set cookie and passes the active tenant name to `PlatformShell`. No client-side state management is needed in Phase 2 — the update flows entirely through the server render cycle.

The DashboardShell is already client-only (`'use client'`). PlatformShell follows the same structure but cannot itself read cookies — it must receive the active tenant name as a prop from the Server Component layout. This Server → Client prop-passing pattern is the canonical split in App Router: server components own data fetching, client components own interactivity.

**Primary recommendation:** Build in wave order — migration first, then PlatformShell + layout (which can be tested with a hardcoded `activeTenantName`), then the Server Action + TenantList (which wires up the cookie). This decoupling lets each wave be verified independently.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tenant list data fetch | API / Backend (Server Component) | Database | `/platform/page.tsx` is a Server Component; it queries Supabase directly with `createClient()` + RLS; no separate API route needed |
| Active-tenant cookie write | API / Backend (Server Action) | — | `cookies().set()` can only be called in Server Functions or Route Handlers, not Server Components; Server Action is the correct tier |
| Active-tenant cookie read | Frontend Server (SSR layout) | — | `/platform/layout.tsx` is a Server Component; reads cookie at request time via `(await cookies()).get()`; passes value to PlatformShell as prop |
| Shell chrome rendering | Browser / Client | Frontend Server | PlatformShell is `'use client'` (needs `useRouter`, `usePathname`, logout); receives data as props from server layout |
| ActiveTenantIndicator rendering | Browser / Client | — | Lives inside PlatformShell (client component); receives `activeTenantName` prop; pure display, no state needed in Phase 2 |
| DB schema change | Database / Storage | — | SQL migration adds `name` column; no code can run until migration lands |
| Row-click Server Action | API / Backend (Server Action) | Browser / Client (caller) | `'use server'` directive; called from TenantList client component; writes cookie + calls revalidatePath |

---

## Standard Stack

### Core

No new packages are installed in Phase 2. All libraries are already in `package.json`.

| Library | Installed Version | Purpose | Why Standard |
|---------|-----------------|---------|--------------|
| `next` | ^16.2.7 (latest: 16.2.9) | App Router, Server Actions, `cookies()`, `revalidatePath()` | Project stack [VERIFIED: npm registry] |
| `@supabase/ssr` | ^0.10.2 (latest: 0.12.0) | Server-side Supabase client + cookie handling | Project stack [VERIFIED: npm registry] |
| `@evecosys/design-system` | local monorepo | Badge, Table, Skeleton, EmptyState, Card | Project design system [VERIFIED: codebase] |
| `lucide-react` | ^1.14.0 (latest: 1.21.0) | `BuildingOffice2` icon for ActiveTenantIndicator | Matches DashboardShell pattern [VERIFIED: codebase] |
| `next/headers` (built-in) | included with next | `cookies()` async function for reading/writing cookies | Official Next.js built-in [VERIFIED: nextjs.org/docs] |
| `next/cache` (built-in) | included with next | `revalidatePath()` for invalidating Router Cache | Official Next.js built-in [VERIFIED: nextjs.org/docs] |

**No new packages to install.** Phase 2 is purely new files + a migration.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `class-variance-authority` | ^0.7.1 | CVA already used in design-system Badge, Table | Only if PlatformShell needs new variant logic — unlikely |
| `tailwind-merge` | ^3.6.0 | `cn()` utility for conditional Tailwind classes | Use in PlatformShell for conditional active-tab styling |

---

## Package Legitimacy Audit

> Phase 2 installs zero new packages. All libraries referenced above are already in `package.json` and have been in the project through Phase 1.

| Package | Registry | Status | Disposition |
|---------|----------|--------|-------------|
| `next` ^16.2.7 | npm | Existing — in use | Approved (existing) |
| `@supabase/ssr` ^0.10.2 | npm | Existing — in use | Approved (existing) |
| `lucide-react` ^1.14.0 | npm | Existing — in use | Approved (existing) |
| `@evecosys/design-system` | local monorepo | Existing — in use | Approved (local) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck not run — no new packages in this phase; all packages were already audited at project setup.*

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  ▼
[/platform request]
  │
  ▼
app/(dashboard)/platform/layout.tsx  ← Server Component
  │   1. Role guard (platform_admin check — already in place from Phase 1)
  │   2. (await cookies()).get('platform_active_tenant') → tenantId
  │   3. If tenantId: query tenants.name WHERE id = tenantId
  │   4. Pass { activeTenantName, user } props to <PlatformShell>
  │
  ▼
components/layout/PlatformShell.tsx  ← 'use client'
  │   Renders topbar + horizontal nav
  │   Topbar right slot: <ActiveTenantIndicator name={activeTenantName} />
  │
  ▼
app/(dashboard)/platform/page.tsx  ← Server Component (replaces stub)
  │   1. createClient() → fetch all tenants WHERE state != 'Decommissioned'
  │      (RLS: tenants_select_platform_admin grants access)
  │   2. Map state → display label (D-05)
  │   3. Render <TenantList tenants={mappedTenants} />
  │
  ▼
components/platform/TenantList.tsx  ← 'use client'
  │   Table with clickable rows
  │   Row click → calls setActiveTenant(tenantId) Server Action
  │
  ├──[row click]──▶
  │
  ▼
app/(dashboard)/platform/actions.ts  ← 'use server'
  │   setActiveTenant(tenantId: string)
  │   1. (await cookies()).set('platform_active_tenant', tenantId, { path: '/platform', httpOnly: false })
  │   2. revalidatePath('/platform', 'layout')
  │      → invalidates layout Router Cache
  │      → Next.js re-fetches layout.tsx on next render
  │      → layout reads updated cookie → passes new name to PlatformShell
  │      → ActiveTenantIndicator updates (color transition: grey-40 → Jade)
  │
  ▼
Browser receives updated UI
  (ActiveTenantIndicator shows new tenant name)
  (TenantList row shows data-[state=selected] highlight)
```

### Recommended Project Structure

```
app/(dashboard)/platform/
├── layout.tsx          # EXTEND — add cookie read + PlatformShell wiring
├── page.tsx            # REPLACE stub — fetch tenants, render TenantList
└── actions.ts          # NEW — setActiveTenant Server Action

components/
├── layout/
│   ├── DashboardShell.tsx        # UNCHANGED
│   └── PlatformShell.tsx         # NEW — bespoke shell for /platform
└── platform/
    ├── ActiveTenantIndicator.tsx  # NEW — header slot component
    └── TenantList.tsx             # NEW — client component, row-click handler

supabase/migrations/
└── 20260618120000_add_tenant_name.sql  # NEW — adds name column to tenants
```

### Pattern 1: Server Action Cookie Write + Layout Revalidation

**What:** A `'use server'` function writes a cookie then calls `revalidatePath('/platform', 'layout')`. The `'layout'` type parameter ensures the layout at `/platform` and all its nested pages are invalidated. On the next render cycle (triggered immediately for Server Actions), Next.js re-fetches the layout — which reads the newly-set cookie and passes the updated data to the client shell.

**When to use:** Any time layout-level server state (read from cookies or DB) must update without a full navigation.

```typescript
// Source: nextjs.org/docs/app/api-reference/functions/cookies
// Source: nextjs.org/docs/app/api-reference/functions/revalidatePath
// app/(dashboard)/platform/actions.ts
'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function setActiveTenant(tenantId: string) {
  const cookieStore = await cookies()
  cookieStore.set('platform_active_tenant', tenantId, {
    path: '/platform',
    httpOnly: false,   // D-07: client must be able to read for Phase 3 optimistic UI
    // No maxAge — session-duration cookie (D-07)
  })
  revalidatePath('/platform', 'layout')
}
```

### Pattern 2: Layout Reads Cookie, Passes Prop to Client Shell

**What:** The Server Component layout reads the cookie (available because server components have access to the incoming request), fetches the tenant name from DB, and passes it as a prop to the client shell. This is the canonical "server fetches, client renders" split.

**When to use:** Any time a client component needs server-only data (cookies, DB) without exposing those to the browser.

```typescript
// Source: nextjs.org/docs/app/api-reference/functions/cookies
// app/(dashboard)/platform/layout.tsx
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { PlatformShell } from '@/components/layout/PlatformShell'
import { redirect } from 'next/navigation'
import type { AppUser } from '@/types'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'platform_admin') redirect('/login')

  // Read active tenant from cookie
  const cookieStore = await cookies()
  const tenantId = cookieStore.get('platform_active_tenant')?.value ?? null

  let activeTenantName: string | null = null
  if (tenantId) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()
    activeTenantName = tenant?.name ?? null
  }

  return (
    <PlatformShell
      user={profile as AppUser}
      activeTenantName={activeTenantName}
    >
      {children}
    </PlatformShell>
  )
}
```

### Pattern 3: Client Component Calls Server Action Inline (no form)

**What:** In Next.js App Router, a client component can import and call a Server Action directly — it does not need to be bound to a `<form>`. The call is an async function that returns after the server has executed.

**When to use:** Any non-form mutation triggered from a client event (button click, row click).

```typescript
// components/platform/TenantList.tsx
'use client'
import { setActiveTenant } from '@/app/(dashboard)/platform/actions'
// TableRow onClick calls the Server Action directly
<TableRow
  key={tenant.id}
  role="button"
  tabIndex={0}
  aria-label={`Set ${tenant.name} as active workspace`}
  data-state={activeTenantId === tenant.id ? 'selected' : undefined}
  className="cursor-pointer"
  onClick={() => setActiveTenant(tenant.id)}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTenant(tenant.id) }}
>
```

**Pitfall:** `setActiveTenant` is async — the row click fires and returns immediately. The UI updates when the layout re-render completes (visible as a brief re-render). In Phase 2 this is acceptable; Phase 3 adds a loading state (SWIT-01).

### Pattern 4: DB Migration — ALTER TABLE ADD COLUMN

**What:** New migration file adds `name TEXT NOT NULL DEFAULT ''` to `public.tenants`. Must be a new file — never edit existing migrations.

**When to use:** Any schema change.

```sql
-- Source: codebase analysis (existing migration convention)
-- supabase/migrations/20260618120000_add_tenant_name.sql
-- Phase 2: Platform Admin Shell — add display name to tenants table.
-- The empty-string DEFAULT is intentional: existing rows need a valid name value
-- without a data-migration step. Phase 4 branding settings (BSET-01) allows
-- board members to set the canonical name. Platform admins see '' until then.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
```

**Why `DEFAULT ''` not `DEFAULT NULL`:** The column is `NOT NULL` per D-03. Existing tenant rows (created without a name) get an empty string, which the UI can handle gracefully (showing `''` or falling back to ID). Avoids needing a data backfill step.

### Anti-Patterns to Avoid

- **Reading cookies in a Server Action to get the tenant for validation:** The action only needs to SET the cookie, not validate the tenant ID. Validation of the tenant's existence is done in the layout's DB query (if the tenant ID in the cookie doesn't match any row, `activeTenantName` is null and the indicator shows the placeholder).
- **Using `revalidatePath('/platform')` without the `'layout'` type:** Without `'layout'`, only the page cache is invalidated, not the layout. The layout's cookie read would not re-execute, so `activeTenantName` would remain stale.
- **Importing Server Actions in Server Components:** Server Actions are called FROM client components (or forms). The layout is a Server Component — it does not call Server Actions. It reads data directly.
- **Calling `cookies().set()` in a Server Component render:** Not allowed. `set()` and `delete()` can only be called in Server Functions (actions) or Route Handlers. Reading with `cookies().get()` is fine in Server Components.
- **`'use client'` on the layout:** The layout must remain a Server Component to read cookies and fetch DB data. Adding `'use client'` would break cookie access.
- **Hardcoding hex values in PlatformShell:** Must use `var(--ds-*)` tokens and `var(--topbar-bg)` / `var(--nav-bg)` legacy chrome variables — never hardcoded hex per CLAUDE.md.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status badge styling | Custom CSS status chip | `<Badge variant="secondary">`, `<Badge variant="default">`, `<Badge variant="destructive">` from `@evecosys/design-system` | Variants already encode the semantic colors; focus ring, hover, and transition handled |
| Table layout | Custom `<table>` + `<tr>` + `<td>` | `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell` from `@evecosys/design-system` | Row heights (56px), hover state, selected state, header styles already baked in |
| Empty state | Custom "no tenants" `<div>` | `<EmptyState>` from `@evecosys/design-system` | Icon slot, title, description, spacing all handled; consistent with rest of app |
| Loading state | Custom spinner or shimmer | `<Skeleton>` from `@evecosys/design-system` | `animate-pulse`, radius, and color token already applied |
| Navigation tabs | Custom `<button>` tabs | Horizontal `<button>` pattern from `DashboardShell` — copy verbatim | `NavigationItem` is designed for sidebar (left border active state); horizontal tab pattern in DashboardShell uses plain `<button>` with bottom-border active style |
| Cookie serialization | Custom cookie read/write | `next/headers` `cookies()` API | Official Next.js API; handles Set-Cookie headers correctly; works in Server Actions |
| Cache invalidation | Full page reload (`router.refresh()`) | `revalidatePath('/platform', 'layout')` | Targeted invalidation; no full navigation; layout re-fetches from server without unmounting UI |

**Key insight:** The design system components carry the EVEcosys visual contract (token usage, hover/focus/selected states). Bypassing them risks token drift and accessibility regressions.

---

## Common Pitfalls

### Pitfall 1: revalidatePath Without 'layout' Type

**What goes wrong:** `revalidatePath('/platform')` (without second argument) invalidates the page cache, not the layout cache. The platform layout's Server Component render (which reads the cookie) does not re-execute. The ActiveTenantIndicator continues showing the old value.

**Why it happens:** By default, `revalidatePath` with a literal path targets the page. The layout is a separate cache entry and requires the `'layout'` type to be invalidated.

**How to avoid:** Always use `revalidatePath('/platform', 'layout')` in the `setActiveTenant` action. [VERIFIED: nextjs.org/docs/app/api-reference/functions/revalidatePath]

**Warning signs:** ActiveTenantIndicator shows stale name after clicking a row; only updates after a full page navigation.

### Pitfall 2: cookies() set() Called Outside a Server Action / Route Handler

**What goes wrong:** `TypeError: Cookies can only be modified in a Server Action or Route Handler.` Attempting to call `cookieStore.set()` inside a Server Component render (e.g., directly in `layout.tsx` during rendering) throws this error.

**Why it happens:** HTTP does not allow setting cookies after streaming starts. Next.js enforces this at runtime.

**How to avoid:** Cookie writes must be in `app/(dashboard)/platform/actions.ts` (`'use server'` directive). The layout only reads via `cookieStore.get()`. [VERIFIED: nextjs.org/docs/app/api-reference/functions/cookies]

**Warning signs:** Runtime error during layout render if cookie write logic accidentally ends up outside the Server Action.

### Pitfall 3: NavigationItem Used for Horizontal Tabs

**What goes wrong:** `NavigationItem` renders with a left 3px border for active state — it is designed for sidebar navigation. Using it in PlatformShell's horizontal tab bar produces incorrect active indicator styling (left border instead of bottom border).

**Why it happens:** `NavigationItem` is a sidebar-oriented component (see its source: `border-l-2` active style).

**How to avoid:** Copy the horizontal tab `<button>` pattern directly from `DashboardShell.tsx`. Use `border-bottom: 2.5px solid var(--ds-color-brand-primary)` for active state, `margin-bottom: -1px` to overlap the nav strip border. Replace the `#7cc242` hardcoded color with `var(--ds-color-brand-primary)`. [VERIFIED: codebase — DashboardShell.tsx line 131-141]

**Warning signs:** Active tab shows a left vertical bar instead of a bottom underline.

### Pitfall 4: Tenant List Query Returns Zero Rows Despite Data Existing

**What goes wrong:** Supabase returns `[]` for the tenants query even though rows exist in the DB. No error is thrown — just empty results.

**Why it happens:** RLS silent data starvation. If `createClient()` is used but the user's JWT doesn't carry the `platform_admin` role that `tenants_select_platform_admin` policy checks, the policy returns false and the row is hidden.

**How to avoid:** Confirm the platform admin user in local dev is seeded via `seed.sql` with role `platform_admin`. Verify `get_my_role()` returns `'platform_admin'` for this user. The `tenants_select_platform_admin` policy from Phase 1's migration (`20260613120000_platform_admin_role.sql`) must be applied — verify with `make migrate` or `make db-reset`. [VERIFIED: codebase — 20260613120000_platform_admin_role.sql]

**Warning signs:** Empty tenant list in UI with no error; `console.log(tenants)` shows `[]`; checking the DB directly shows rows exist.

### Pitfall 5: `activeTenantId` Tracking in TenantList for Row Highlight

**What goes wrong:** After a row click, no visual feedback that the row is now active (selected state not applied). The `data-[state=selected]` attribute on the TableRow is never set, so the grey-10 background doesn't appear.

**Why it happens:** TenantList is a client component that doesn't know the current active tenant without being told. The layout passes `activeTenantName` but not `activeTenantId` — the component needs the ID to compare against tenant rows.

**How to avoid:** The layout should read the cookie and pass BOTH `activeTenantName` and `activeTenantId` as props. TenantList receives `activeTenantId` and applies `data-state={currentTenantId === activeTenantId ? 'selected' : undefined}` on each row. [ASSUMED — based on App Router prop-passing pattern]

**Warning signs:** Clicking a row updates the header indicator but no row in the table shows a selected highlight.

### Pitfall 6: Migration Timestamp Collision

**What goes wrong:** Migration filename timestamp matches or precedes an existing migration, causing Supabase CLI to skip it or apply migrations out of order.

**Why it happens:** Migrations must be applied in chronological timestamp order. The last existing migration is `20260613120000_platform_admin_role.sql`.

**How to avoid:** Use a timestamp after `20260613120000`. A safe choice is `20260618120000_add_tenant_name.sql` (today's date, noon UTC). Never use a timestamp that matches an existing file. [VERIFIED: codebase — migrations directory]

---

## Code Examples

### DB Migration: Add name Column

```sql
-- Source: codebase analysis — existing migration convention
-- supabase/migrations/20260618120000_add_tenant_name.sql
-- Phase 2: Platform Admin Shell — add display name to tenants.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
```

### Server Action: setActiveTenant

```typescript
// Source: nextjs.org/docs/app/api-reference/functions/cookies + revalidatePath
// app/(dashboard)/platform/actions.ts
'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function setActiveTenant(tenantId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('platform_active_tenant', tenantId, {
    path: '/platform',
    httpOnly: false,  // D-07: client must read for Phase 3 optimistic UI
    // No maxAge = session-duration cookie (D-07)
  })
  revalidatePath('/platform', 'layout')  // 'layout' type is REQUIRED
}
```

### ActiveTenantIndicator Component

```typescript
// Source: codebase analysis — DashboardShell.tsx structure + 02-UI-SPEC.md
// components/platform/ActiveTenantIndicator.tsx
import { BuildingOffice2 } from 'lucide-react'

interface ActiveTenantIndicatorProps {
  name: string | null
}

export function ActiveTenantIndicator({ name }: ActiveTenantIndicatorProps) {
  const isActive = Boolean(name)
  return (
    <div className="flex items-center gap-[var(--ds-space-xs)]">
      <BuildingOffice2
        size={14}
        style={{
          color: isActive ? 'var(--ds-color-brand-primary)' : 'var(--ds-color-neutral-grey-40)',
          transition: 'color var(--ds-motion-duration-base) var(--ds-motion-easing-standard)',
        }}
      />
      <span
        className="text-xs font-semibold"
        style={{
          color: isActive ? 'var(--ds-color-brand-primary)' : 'var(--ds-color-neutral-grey-40)',
          transition: 'color var(--ds-motion-duration-base) var(--ds-motion-easing-standard)',
        }}
      >
        {name ?? 'No workspace selected'}
      </span>
    </div>
  )
}
```

### Status Mapping Function

```typescript
// Source: CONTEXT.md D-05 + lib/tenant/types.ts
// Must stay in sync with TenantState in lib/tenant/types.ts
import type { TenantState } from '@/lib/tenant/types'

export type DisplayStatus = 'Active' | 'Pending' | 'Suspended'

export function mapTenantState(state: TenantState): DisplayStatus | null {
  switch (state) {
    case 'Active':      return 'Active'
    case 'Registered':  return 'Pending'
    case 'Provisioning': return 'Pending'
    case 'Suspended':   return 'Suspended'
    case 'Decommissioned': return null  // filtered out — UI spec decision
  }
}

export function statusBadgeVariant(status: DisplayStatus): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'Active':    return 'default'
    case 'Pending':   return 'secondary'
    case 'Suspended': return 'destructive'
  }
}
```

### Tenant List Server Component (page.tsx)

```typescript
// Source: codebase analysis — manager/layout.tsx pattern + 02-UI-SPEC.md
// app/(dashboard)/platform/page.tsx
import { createClient } from '@/lib/supabase/server'
import { TenantList } from '@/components/platform/TenantList'
import { mapTenantState } from '@/lib/platform/tenantStatus'
import type { TenantState } from '@/lib/tenant/types'

export default async function PlatformPage() {
  const supabase = await createClient()

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, state')
    .neq('state', 'Decommissioned')
    .order('created_at', { ascending: true })

  if (error) {
    // Error state — rendered in TenantList
    return <TenantList tenants={[]} error="Could not load tenants" />
  }

  const mapped = (tenants ?? [])
    .map(t => ({
      id: t.id,
      name: t.name as string,
      status: mapTenantState(t.state as TenantState),
    }))
    .filter(t => t.status !== null) as Array<{ id: string; name: string; status: 'Active' | 'Pending' | 'Suspended' }>

  return <TenantList tenants={mapped} />
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cookies()` was synchronous | `cookies()` is now **async** — must `await` | Next.js 15 (RC) | Must use `await cookies()` in all usages; synchronous access still works in Next.js 15/16 for backward compat but is deprecated |
| `revalidatePath(path)` — single argument | `revalidatePath(path, type)` — type `'page'` or `'layout'` available | Next.js 14+ | Phase 2 MUST use `'layout'` type to invalidate the platform layout's cache entry |

**Deprecated/outdated:**

- Synchronous `cookies()` call: Still works in Next.js 16 for backward compatibility but will be removed in a future version. Always use `await cookies()`.
- Route Handler as alternative to Server Action for cookie writes: Valid but unnecessary overhead when a Server Action suffices.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Layout must pass both `activeTenantName` AND `activeTenantId` to TenantList for the selected-row highlight | Pitfall 5 / Code Examples | If wrong: row selection highlight never shows (minor UX gap, not a blocker); easy fix |
| A2 | `mapTenantState` utility lives in `lib/platform/tenantStatus.ts` (new file) | Code Examples | If wrong: function is inlined in page.tsx instead; trivial location decision |
| A3 | `PlatformShell` uses same horizontal tab button pattern as DashboardShell (plain `<button>`) rather than `NavigationItem` | Architecture Patterns / Pitfall 3 | If wrong: planner could decide to use NavigationItem with different styling; aesthetic only |

---

## Open Questions (RESOLVED)

1. **`Tenant` type needs `name` field**
   - What we know: `lib/tenant/types.ts` defines `Tenant` interface without `name` (the column doesn't exist yet in the DB schema)
   - What's unclear: Whether to update the `Tenant` interface in `lib/tenant/types.ts` to add `name: string` in the same wave as the migration, or keep the DB type separate from the UI type
   - Recommendation: Update `Tenant` interface in `lib/tenant/types.ts` in the same wave as the migration. This keeps the types in sync with the DB schema and avoids a later breaking type mismatch.

2. **`statusBadgeVariant` + `mapTenantState` location**
   - What we know: These utility functions are needed by `TenantList` and potentially by future phases
   - What's unclear: Should they live in `lib/platform/tenantStatus.ts` (new file) or inline in `components/platform/TenantList.tsx`?
   - Recommendation: Create `lib/platform/tenantStatus.ts` as a new module. This keeps business logic out of the component and makes it independently testable.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev server | ✓ | (via nvm, project runtime) | — |
| Supabase CLI (local Docker) | DB migration via `make migrate` | ✓ | Local Docker Supabase from Phase 1 | — |
| `lucide-react` `BuildingOffice2` icon | ActiveTenantIndicator | ✓ | ^1.14.0 in package.json | Use any building-type icon from lucide |

`BuildingOffice2` availability in the installed version of `lucide-react` is marked [ASSUMED] — the icon set has evolved across versions. The implementer should verify `BuildingOffice2` exists in the installed version, and fall back to `Building` if not. [ASSUMED]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.8 + jsdom |
| Config file | `vitest.config.mts` |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run` (all tests, no filter) |
| Setup file | `test/setup.ts` — provides jsdom mocks for ResizeObserver, matchMedia, next/navigation |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PADM-01 | `mapTenantState()` maps DB states to display labels correctly | unit | `npm test -- --run test/unit/lib/platform/tenantStatus.test.ts` | ❌ Wave 0 |
| PADM-01 | `statusBadgeVariant()` returns correct variant for each status | unit | `npm test -- --run test/unit/lib/platform/tenantStatus.test.ts` | ❌ Wave 0 |
| PADM-01 | `TenantList` renders tenant names and badge variants from props | unit (component) | `npm test -- --run test/unit/components/platform/TenantList.test.tsx` | ❌ Wave 0 |
| PADM-01 | `TenantList` renders EmptyState when tenants array is empty | unit (component) | `npm test -- --run test/unit/components/platform/TenantList.test.tsx` | ❌ Wave 0 |
| PADM-01 | `TenantList` renders error state when `error` prop is set | unit (component) | `npm test -- --run test/unit/components/platform/TenantList.test.tsx` | ❌ Wave 0 |
| PADM-02 | `setActiveTenant` calls `cookies().set()` with correct name + path | unit (Server Action mock) | `npm test -- --run test/unit/lib/platform/setActiveTenant.test.ts` | ❌ Wave 0 |
| PADM-02 | `setActiveTenant` calls `revalidatePath('/platform', 'layout')` | unit (Server Action mock) | `npm test -- --run test/unit/lib/platform/setActiveTenant.test.ts` | ❌ Wave 0 |
| PADM-03 | `ActiveTenantIndicator` renders placeholder when `name` is null | unit (component) | `npm test -- --run test/unit/components/platform/ActiveTenantIndicator.test.tsx` | ❌ Wave 0 |
| PADM-03 | `ActiveTenantIndicator` renders tenant name when `name` is provided | unit (component) | `npm test -- --run test/unit/components/platform/ActiveTenantIndicator.test.tsx` | ❌ Wave 0 |
| PADM-04 | Cookie is set with `path: '/platform'` and no `maxAge` | unit (Server Action mock) | covered by setActiveTenant test above | ❌ Wave 0 |

**Manual-only checks (no automated test):**
- PADM-04 full persistence: navigating between `/platform` pages and verifying the header indicator remains — requires a live browser session; Playwright would be appropriate but Phase 2 scope is unit tests only per CLAUDE.md memory note.
- Visual color of badge variants and ActiveTenantIndicator transition — visual; no automated assertion needed.

### Sampling Rate

- **Per task commit:** `npm test -- --run test/unit/lib/platform/ test/unit/components/platform/`
- **Per wave merge:** `npm test -- --run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `test/unit/lib/platform/tenantStatus.test.ts` — covers PADM-01 state mapping
- [ ] `test/unit/lib/platform/setActiveTenant.test.ts` — covers PADM-02 (mock `next/headers` + `next/cache`)
- [ ] `test/unit/components/platform/TenantList.test.tsx` — covers PADM-01 render + empty state + error state
- [ ] `test/unit/components/platform/ActiveTenantIndicator.test.tsx` — covers PADM-03 render states

**Mocking notes for Server Action tests:** `next/headers` and `next/cache` must be mocked in Vitest (same pattern as `lib/supabase/server.ts` mock in `createPlatformClient.test.ts`). Follow the `vi.mock(...)` hoisting pattern already established in the test suite.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (indirectly) | Platform layout role guard already in place from Phase 1 — re-verify it runs before cookie read |
| V3 Session Management | yes | Cookie is session-scoped (no max-age); `httpOnly: false` is a deliberate D-07 decision (client reads for Phase 3); no sensitive data in cookie value (UUID only) |
| V4 Access Control | yes | RLS policy `tenants_select_platform_admin` ensures platform admin can only see tenants, not mutate them; Server Action does not validate that the tenantId corresponds to a real tenant (acceptable in Phase 2 — worst case is an invalid cookie value that resolves to null activeTenantName) |
| V5 Input Validation | yes (low risk) | `tenantId` passed to `setActiveTenant` is a UUID string from a table row click — already a DB-verified UUID; no external user input |
| V6 Cryptography | no | No crypto operations in Phase 2 |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cookie value spoofing (setting arbitrary `platform_active_tenant` UUID) | Tampering | Cookie is `httpOnly: false` so client CAN read/write it. Worst case: attacker sets it to a valid tenant UUID they already know. RLS policy gates all data access — the cookie value alone grants no data access; only the user's JWT role + RLS determines what data they see. [ASSUMED] |
| Role guard bypass if layout caches auth check | Spoofing | Layout reads from Supabase on every request (dynamic rendering forced by `cookies()` call); no static rendering risk |
| XSS reading the non-httpOnly cookie | Information Disclosure | Cookie value is a UUID (tenant ID); no secrets or PII. Acceptable per D-07 design decision. |

---

## Sources

### Primary (HIGH confidence)

- `nextjs.org/docs/app/api-reference/functions/cookies` — cookies() async API, set() options (httpOnly, path, maxAge, sameSite), Server Action constraint
- `nextjs.org/docs/app/api-reference/functions/revalidatePath` — revalidatePath(path, type), 'layout' type behavior, Server Action vs Route Handler behavior
- Codebase: `components/layout/DashboardShell.tsx` — horizontal nav pattern, topbar structure, `h-[62px]`, `var(--topbar-bg)`, `var(--nav-bg)`
- Codebase: `design-system/components/Badge/index.tsx` — variant definitions (default, secondary, destructive)
- Codebase: `design-system/components/Table/index.tsx` — row heights (56px h-14), selected state (`data-[state=selected]`), hover state
- Codebase: `design-system/components/EmptyState/index.tsx` — EmptyState API (icon, title, description, action)
- Codebase: `design-system/components/Skeleton/index.tsx` — Skeleton API
- Codebase: `design-system/components/NavigationItem/index.tsx` — sidebar-oriented (left border active) — NOT for horizontal tabs
- Codebase: `design-system/tokens/variables.css` — all `--ds-*` token values
- Codebase: `app/globals.css` — `--topbar-bg`, `--nav-bg`, `--topbar-border`, `--bg` chrome variables
- Codebase: `supabase/migrations/20260613120000_platform_admin_role.sql` — `tenants_select_platform_admin` RLS policy
- Codebase: `supabase/migrations/20260609120000_create_tenants.sql` — tenants table schema (no name column yet)
- Codebase: `lib/supabase/server.ts` — `createClient()` and `createPlatformClient()` patterns
- Codebase: `lib/tenant/types.ts` — `TenantState`, `TENANT_STATES`, `Tenant` interface
- Codebase: `app/(dashboard)/manager/layout.tsx` — canonical layout + shell wiring pattern
- Codebase: `app/(dashboard)/platform/layout.tsx` — current Phase 1 guard (to be extended)
- Codebase: `types/index.ts` — `AppUser` interface (includes `platform_admin` role)
- Codebase: `supabase/seed.sql` — platform_admin dev user seeded with role `platform_admin`
- Codebase: `test/unit/lib/platform/createPlatformClient.test.ts` — established Server Action mocking pattern for `vi.mock('@/lib/supabase/server', ...)`
- Codebase: `vitest.config.mts` — test environment (jsdom), setup files, globals
- Codebase: `.planning/phases/02-platform-admin-shell/02-UI-SPEC.md` — approved visual + interaction contract
- Codebase: `package.json` — confirmed lucide-react ^1.14.0, next ^16.2.7, @supabase/ssr ^0.10.2

### Secondary (MEDIUM confidence)

- WebSearch + official docs cross-reference: `revalidatePath('/platform', 'layout')` behavior — confirmed via nextjs.org

### Tertiary (LOW confidence)

- `BuildingOffice2` icon availability in lucide-react ^1.14.0: [ASSUMED] — icon inventory changes across versions; implementer should verify.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all libraries already in project, verified in package.json and codebase
- Architecture: HIGH — patterns confirmed via official Next.js docs + DashboardShell codebase analysis
- DB migration: HIGH — existing migration files confirm naming convention and schema starting point
- Pitfalls: HIGH — verified against official docs (cookies set() constraint, revalidatePath type)
- Test patterns: HIGH — existing test suite (createPlatformClient.test.ts) provides exact mocking pattern to follow

**Research date:** 2026-06-18
**Valid until:** 2026-07-18 (30 days; Next.js App Router APIs are stable)
