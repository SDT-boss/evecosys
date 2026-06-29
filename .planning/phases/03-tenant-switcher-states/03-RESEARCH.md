# Phase 3: Tenant Switcher States — Research

**Researched:** 2026-06-20
**Domain:** React 19 useTransition, Next.js 16 Server Actions, optimistic UI, design-system Spinner/Alert/EmptyState, pathname detection in RSC layouts
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Loading State (SWIT-01)**
- D-01: Row-level spinner — only the clicked row shows a `Spinner` component while the switch is in-flight.
- D-02: All rows are locked during a switch (pointer-events disabled). Row-level spinner still identifies the pending row.
- D-03: Use React 19's `useTransition` / `startTransition`. `isPending` drives both the row spinner and the disabled-row state.

**Success Confirmation (SWIT-02)**
- D-04: The ActiveTenantIndicator header update IS the success confirmation. No toast, no inline banner.
- D-05: Apply an optimistic update — immediately set local `activeTenantId` state on row click. Revert on failure. Phase 2 set `httpOnly: false` (D-07 from Phase 2) specifically to enable this.

**Error Contract & Surface (SWIT-03)**
- D-06: Change `setActiveTenant` return type from `Promise<void>` to `Promise<{ ok: boolean; error?: string }>`.
- D-07: On failure, revert optimistic state and render an inline `Alert variant="destructive"` above the TenantList. Alert is dismissible.
- D-08: Error message copy: "Failed to switch workspace. Please try again." with server error string appended in parentheses if present.

**Blocked / No-Access Screen (SWIT-04)**
- D-09: Blocked screen triggered by one condition: no active tenant cookie when navigating to a `/platform` sub-route that requires one.
- D-10: The check lives in `/platform/layout.tsx`.
- D-11: Blocked screen uses the existing `EmptyState` component. Message: "Select a workspace to continue".

### Claude's Discretion
- Exact copy for the EmptyState title/description on the blocked screen
- Whether the blocked-state check is a prop on the layout or a separate RSC wrapper inside the layout
- Whether `BlockedScreen` is its own component file or inlined in the layout
- Visual treatment of disabled rows while switch is in-flight (opacity reduction vs cursor-not-allowed)

### Deferred Ideas (OUT OF SCOPE)
- Tenant access-denied / suspended tenant blocked state
- RLS policies on data tables (vehicles, drivers, etc.)
- Tenant detail pages (`/platform/tenants/[id]`)
- Toast/notification component for design system
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SWIT-01 | A loading state is displayed while a tenant context switch is in progress | `useTransition` `isPending` drives row-level Spinner and locked TableBody; verified component API in codebase |
| SWIT-02 | A success state confirms the active workspace has changed after a successful switch | Optimistic local state + `revalidatePath` causes layout re-render; ActiveTenantIndicator already handles null/string transitions |
| SWIT-03 | A failure/error state is shown gracefully if a context switch fails | `setActiveTenant` ActionResult return type change; Alert `variant="destructive"` verified in codebase |
| SWIT-04 | A blocked/no-access state is shown if the admin navigates to a restricted destination | `x-pathname` header via middleware OR `usePathname` in client wrapper; BlockedScreen using EmptyState verified |
</phase_requirements>

---

## Summary

Phase 3 wires four UI states (loading, success, error, blocked) onto the tenant-switching action established in Phase 2. The foundation is solid: `setActiveTenant` already sets the `platform_active_tenant` cookie with `httpOnly: false`, `TenantList` is already `'use client'`, and all three design-system components required (Spinner, Alert, EmptyState) are confirmed present and exportable from `@evecosys/design-system`. No new packages are needed.

The critical implementation pattern is React 19's `useTransition` wrapping the async server action call inside `TenantList`. The `isPending` flag from the transition is the single source of truth for all loading state visuals. The optimistic update strategy (immediately update local `activeTenantId` state, revert on `!result.ok`) requires `setActiveTenant` to be awaited inside the transition callback — currently it is called without `await` and returns `void`. Both changes must land together.

The one non-trivial decision is how `platform/layout.tsx` reads the current pathname — as an RSC, it cannot call `usePathname()`. The UI-SPEC specifies reading the `x-pathname` header set by Next.js middleware, but **there is no `middleware.ts` in this codebase**. The planner must choose between (A) adding a minimal `middleware.ts` to forward the pathname header, or (B) wrapping the blocked-screen check in a thin `'use client'` component that calls `usePathname()`. Both are well-understood patterns in Next.js 16.

**Primary recommendation:** Use Approach A (middleware forwarding `x-pathname`) for the pathname check in the layout. It keeps the layout fully server-rendered, matches the UI-SPEC intent, and the middleware is trivially small (~5 lines). Approach B introduces a client boundary just to read a URL — avoidable.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Loading spinner (SWIT-01) | Browser / Client (`TenantList`) | — | `isPending` is only available in a `'use client'` component via `useTransition` |
| Optimistic active-tenant update (SWIT-02) | Browser / Client (`TenantList` + `PlatformShell`) | — | Local React state must update synchronously on click, before server responds |
| Cookie write on switch | API / Backend (`setActiveTenant` Server Action) | — | Server Action runs on server; cookie is set server-side |
| Error state display (SWIT-03) | Browser / Client (`TenantList`) | — | `result.ok` is checked in the client after awaiting the server action inside the transition |
| Blocked screen guard (SWIT-04) | Frontend Server (RSC Layout) | — | `platform/layout.tsx` is a Server Component; reads cookie server-side; renders BlockedScreen or children |
| Pathname detection for blocked-screen | Middleware (preferred) or Browser/Client (fallback) | Frontend Server | RSC cannot call `usePathname()`; middleware can inject `x-pathname` header; layout then reads via `headers()` |

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| React | 19.2.4 | `useTransition`, `startTransition`, optimistic UI | Built in; provides `isPending` for async server action transitions |
| Next.js | 16.2.7 | Server Actions, `revalidatePath`, `headers()`, `cookies()` | Built in; App Router async layouts are the standard RSC pattern |
| `@evecosys/design-system` | local monorepo | Spinner, Alert, AlertTitle, AlertDescription, EmptyState, Button | Project standard; all required components confirmed present |
| `lucide-react` | (installed) | Building2 icon already in ActiveTenantIndicator | Already used in Phase 2; no new icons needed for Phase 3 |

[VERIFIED: codebase scan] All libraries confirmed present and already used in the Phase 2 code.

### No New Packages Required

Phase 3 is a pure composition phase. Every component, hook, and utility needed already exists in the project. There is nothing to install.

**Installation:** none

---

## Package Legitimacy Audit

No external packages are installed in Phase 3. This section is intentionally empty.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Row Click (TenantList — client)
  │
  ├─► setOptimisticState(newTenantId) — synchronous, immediate
  │     └─► activeTenantId local state → ActiveTenantIndicator updates
  │
  └─► startTransition(async () => {
          setPendingTenantId(tenant.id)
          const result = await setActiveTenant(tenant.id)   ← Server Action
                                    │
                                    ├─► cookies().set('platform_active_tenant', id)
                                    └─► revalidatePath('/platform', 'layout')
                                                │
                                                └─► Layout RSC re-renders
                                                      └─► ActiveTenantIndicator
                                                            confirms via server name
          if (!result.ok) {
              revertOptimisticState(previousTenantId)
              setSwitchError(result.error)         ← Alert renders
          }
          setPendingTenantId(null)
      })
  │
  └─► isPending = true while transition runs
          └─► TableBody opacity 0.5, cursor not-allowed
              Pending row: Spinner replaces tenant name text


GET /platform/some-sub-route (RSC Layout — server)
  │
  ├─► Read 'platform_active_tenant' cookie  (already implemented)
  ├─► Read x-pathname header from middleware  (NEW — requires middleware.ts)
  │
  └─► isSubRoute && !tenantId ?
        ├─ YES → render <BlockedScreen /> inside <PlatformShell activeTenantName={null}>
        └─ NO  → render {children} (existing behavior)
```

### Recommended Project Structure

```
app/(dashboard)/platform/
├── actions.ts              # MODIFY: void → ActionResult return type
├── layout.tsx              # MODIFY: add pathname check + BlockedScreen guard
└── page.tsx                # unchanged

components/platform/
├── TenantList.tsx          # MODIFY: useTransition, optimistic state, error Alert
├── ActiveTenantIndicator.tsx  # MODIFY if Approach A (context); unchanged if prop-passed
└── BlockedScreen.tsx       # NEW: EmptyState wrapper with "Select a workspace" content

middleware.ts               # NEW (at project root): forwards x-pathname header
```

### Pattern 1: React 19 useTransition Wrapping a Server Action

**What:** Wrap an async server action in `startTransition`. The transition's `isPending` flag tracks in-flight state without blocking the UI thread.

**When to use:** Any client component that calls a server action and needs loading feedback without a full page reload.

**Example (as verified in Next.js 16 / React 19):**
```tsx
// Source: React 19 docs + existing pattern in ThemeToggle.tsx (startTransition usage confirmed)
'use client'
import { useTransition, useState } from 'react'
import { setActiveTenant } from '@/app/(dashboard)/platform/actions'

const [isPending, startTransition] = useTransition()
const [pendingTenantId, setPendingTenantId] = useState<string | null>(null)
const [activeTenantId, setActiveTenantId] = useState(initialActiveTenantId)
const [switchError, setSwitchError] = useState<string | null>(null)

function handleRowClick(tenant: TenantRow) {
  const previousId = activeTenantId
  setActiveTenantId(tenant.id)          // optimistic
  setSwitchError(null)                   // clear previous error
  setPendingTenantId(tenant.id)

  startTransition(async () => {
    const result = await setActiveTenant(tenant.id)
    if (!result.ok) {
      setActiveTenantId(previousId)      // revert
      setSwitchError(
        result.error
          ? `Failed to switch workspace. Please try again. (${result.error})`
          : 'Failed to switch workspace. Please try again.'
      )
    }
    setPendingTenantId(null)
  })
}
```

[VERIFIED: codebase scan] `startTransition` is confirmed used in `components/ui/ThemeToggle.tsx`. React 19.2.4 is installed.

### Pattern 2: ActionResult Return Type

**What:** Server Actions that can fail return `{ ok: boolean; error?: string }` instead of throwing. The client checks `result.ok`.

**When to use:** Any server action where the client needs structured error information.

**Example:**
```typescript
// Source: D-06 from 03-CONTEXT.md, confirmed pattern from existing codebase conventions
'use server'
export async function setActiveTenant(tenantId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const cookieStore = await cookies()
    cookieStore.set('platform_active_tenant', tenantId, {
      path: '/platform',
      httpOnly: false,
    })
    revalidatePath('/platform', 'layout')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Cookie write failed' }
  }
}
```

### Pattern 3: Pathname Detection in RSC Layout (Middleware Approach — Recommended)

**What:** `middleware.ts` at the project root intercepts all requests and forwards `request.nextUrl.pathname` as an `x-pathname` header. The RSC layout reads it with `headers()`.

**When to use:** When a Server Component layout needs the current URL pathname without dropping to a client component.

**Why this approach:** There is no `middleware.ts` in this project today. Adding a minimal one is ~5 lines and keeps the layout fully server-rendered. The `PlatformShell` is already `'use client'` so `usePathname()` IS available there, but reading the pathname in the layout (before rendering the shell) is cleaner for the blocked-screen guard.

**Example middleware.ts (new file at project root):**
```typescript
// Source: Next.js 16 docs pattern for pathname header forwarding
// [ASSUMED] — standard pattern; confirm against Next.js 16.2.7 docs before implementing
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set('x-pathname', request.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Layout consumption:**
```typescript
// Source: Next.js 16 headers() API — confirmed used in platform/layout.tsx already
import { headers } from 'next/headers'

const headerStore = await headers()
const pathname = headerStore.get('x-pathname') ?? ''
const isSubRoute = pathname !== '/platform' && pathname !== '/platform/'

if (isSubRoute && !tenantId) {
  return (
    <PlatformShell user={profile as AppUser} activeTenantName={null}>
      <BlockedScreen />
    </PlatformShell>
  )
}
```

[VERIFIED: codebase scan] `headers` from `next/headers` is NOT currently imported in `platform/layout.tsx` — only `cookies` is. The middleware file does not exist. Both are new additions for Phase 3.

[VERIFIED: codebase scan] `cookies` from `next/headers` is already used with `await` in `platform/layout.tsx` (line 23), so the async `headers()` call follows the same established pattern.

### Pattern 4: ActiveTenantIndicator Optimistic Update (Approach B — Recommended)

The UI-SPEC proposes two approaches for keeping `ActiveTenantIndicator` in sync with the optimistic state in `TenantList`. Approach B (callback prop) is recommended for Phase 3 because:

1. `PlatformShell` is already `'use client'` — it can hold `activeTenantName` in local state initialized from the server-passed prop.
2. No new context infrastructure needed.
3. Simpler: `TenantList` receives an `onActiveTenantChange(name: string) => void` callback from `PlatformShell`; calls it on row click with the tenant name.

**Example:**
```tsx
// PlatformShell (client component, already 'use client')
const [activeTenantName, setActiveTenantName] = useState(initialActiveTenantName)

// Pass to TenantList (which must also be a child of PlatformShell, via page.tsx)
// Problem: TenantList is a child of page.tsx, not PlatformShell directly.
```

**Important discovery:** `TenantList` receives `tenants` and `activeTenantId` from `platform/page.tsx` (a Server Component), which is itself rendered as `{children}` inside `PlatformShell`. This means `PlatformShell` cannot directly pass props to `TenantList` — they are in different component trees.

**Revised recommendation — Approach A (React Context) for header sync:**

For Phase 3, use a `TenantContext` provided by `PlatformShell` (which is already `'use client'`). `TenantList` reads from and writes to this context. `ActiveTenantIndicator` reads from the same context. This is the only pattern that allows `TenantList` (a grandchild of `PlatformShell` via `{children}`) to update the header without prop drilling through the Server Component boundary.

```tsx
// components/platform/TenantContext.tsx (NEW)
'use client'
import { createContext, useContext, useState } from 'react'

interface TenantContextValue {
  activeTenantName: string | null
  setActiveTenantName: (name: string | null) => void
}
const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({ children, initialName }: { children: React.ReactNode, initialName: string | null }) {
  const [activeTenantName, setActiveTenantName] = useState(initialName)
  return (
    <TenantContext.Provider value={{ activeTenantName, setActiveTenantName }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenantContext() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenantContext must be used within TenantProvider')
  return ctx
}
```

`PlatformShell` wraps its render in `<TenantProvider initialName={activeTenantName}>`. `ActiveTenantIndicator` reads `useTenantContext().activeTenantName`. `TenantList` calls `useTenantContext().setActiveTenantName(tenant.name)` on optimistic click.

[ASSUMED] — The context approach requires `ActiveTenantIndicator` to become a client component (it currently is a pure function with no `'use client'` directive). This is an acceptable addition.

### Anti-Patterns to Avoid

- **Calling `setActiveTenant` without `await` inside `startTransition`:** The current `TenantList.tsx` calls `setActiveTenant(tenant.id)` without `await`. Phase 3 MUST add `await` inside the transition to read the ActionResult.
- **Reading `usePathname()` in a Server Component:** RSC layouts cannot use client hooks. Must use middleware header forwarding.
- **Setting `httpOnly: true` on the `platform_active_tenant` cookie:** Phase 2 explicitly set `httpOnly: false` for client-side optimistic reads. Do not change this.
- **Calling `revalidatePath` inside the transition check:** `revalidatePath` runs server-side in the action. The client transition only checks `result.ok`. No client-side revalidation calls.
- **Auto-dismissing the error Alert:** The UI-SPEC specifies manual-only dismissal to ensure the admin reads the error.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Row-level loading indicator | Custom CSS spinner | `<Spinner size="sm">` from `@evecosys/design-system` | Already built, branded Cyber Jade, has `role="status"` for a11y |
| Inline error banner | Custom `div` with error styling | `<Alert variant="destructive">` + `<AlertTitle>` + `<AlertDescription>` | Has `role="alert"` (live region), correct token colours, left-border styling — already tested |
| Blocked screen | Custom empty div | `<EmptyState>` from `@evecosys/design-system` | Already used in `TenantList` for empty/error states; centred layout baked in |
| BlockedScreen CTA navigation | `router.push()` button | `<Button variant="secondary" asChild><Link href="/platform">` | `asChild` + `Link` is accessible, crawlable, and correct for declarative navigation |
| Transition loading state | `useState(loading)` + manual set/clear | `useTransition()` from React 19 | `isPending` is automatically tied to the async boundary of the transition; no manual cleanup needed |

**Key insight:** Every visual primitive for Phase 3 already exists in the design system. The work is orchestrating them with React state — not building new components (except `BlockedScreen` which is a thin content wrapper).

---

## Common Pitfalls

### Pitfall 1: Forgetting `await` on `setActiveTenant` Inside the Transition

**What goes wrong:** If `startTransition(async () => { setActiveTenant(id) })` is called without `await`, the transition completes immediately (before the server responds), `isPending` returns to `false`, and `result.ok` is `undefined` — no error handling works.

**Why it happens:** The current `TenantList.tsx` (Phase 2) calls `setActiveTenant(tenant.id)` without `await` and without checking the return value (it was `void`). Phase 3 changes the return type but the call site must also change.

**How to avoid:** The transition callback MUST be `async` and MUST `await` the server action: `const result = await setActiveTenant(tenant.id)`.

**Warning signs:** Spinner disappears immediately on click; error Alert never appears on failure; optimistic state is never reverted.

[VERIFIED: codebase scan] Confirmed: current `TenantList.tsx` line 64 calls `setActiveTenant(tenant.id)` without await.

### Pitfall 2: `isPending` Controls ALL Loading State — Never Track Loading Separately

**What goes wrong:** Adding a separate `const [isLoading, setIsLoading] = useState(false)` alongside `useTransition` leads to race conditions — the two flags can diverge if the transition throws unexpectedly.

**Why it happens:** Developers reach for familiar `useState` loading patterns.

**How to avoid:** `isPending` from `useTransition` IS the loading flag. All loading state derives from it. `pendingTenantId` identifies WHICH row, but the lock-all-rows and lock-duration derives purely from `isPending`.

### Pitfall 3: No `middleware.ts` Means `x-pathname` Header Is Absent

**What goes wrong:** `platform/layout.tsx` tries to read `headerStore.get('x-pathname')` but gets `null` because no middleware forwarded it — blocked-screen check never triggers.

**Why it happens:** The UI-SPEC mentions `x-pathname` but there is no existing `middleware.ts` in this project.

**How to avoid:** The planner MUST include a Wave 0 task to create `middleware.ts` before the layout guard is implemented.

**Warning signs:** Navigating to `/platform/reports` with no active tenant does not show BlockedScreen — shows a 404 or blank page instead.

[VERIFIED: codebase scan] Confirmed: no `middleware.ts` exists in the project root.

### Pitfall 4: TenantList Cannot Directly Update ActiveTenantIndicator via Props

**What goes wrong:** Planning assumes `TenantList` and `ActiveTenantIndicator` share a prop chain, but `TenantList` is a `{children}` grandchild of `PlatformShell` (passed through `platform/page.tsx`). There is no prop path from `TenantList` to `ActiveTenantIndicator` without context.

**Why it happens:** The component tree appears simple but crosses a Server Component boundary (`platform/page.tsx` is RSC; `PlatformShell` is client).

**How to avoid:** Use a React Context provider in `PlatformShell` (already `'use client'`) to bridge `TenantList` → `ActiveTenantIndicator`.

[VERIFIED: codebase scan] Confirmed: `platform/page.tsx` is a Server Component; `TenantList` is rendered directly from it; `PlatformShell` renders `{children}` which includes the page output — there is no prop chain between `PlatformShell` and `TenantList`.

### Pitfall 5: Existing `setActiveTenant` Tests Will Fail After Return Type Change

**What goes wrong:** `test/unit/lib/platform/setActiveTenant.test.ts` mocks `setActiveTenant` returning `undefined` (the current `void` return). After Phase 3 changes the return type to `ActionResult`, the mock must be updated too. Tests will silently pass against the mock even if the real implementation is broken.

**Why it happens:** The mock at the top of `TenantList.test.tsx` is `vi.fn().mockResolvedValue(undefined)`.

**How to avoid:** Update `setActiveTenant` mock to return `{ ok: true }`. Add new test cases for `{ ok: false, error: '...' }` path.

[VERIFIED: codebase scan] Confirmed: `TenantList.test.tsx` line 6 mocks `setActiveTenant` as `vi.fn().mockResolvedValue(undefined)`.

### Pitfall 6: Spinner Has `role="status" aria-label="Loading"` Baked In

**What goes wrong:** A developer wraps Spinner in a parent with a conflicting `role` or `aria-label`, creating confusing screen-reader output.

**Why it happens:** The Spinner component already has `role="status"` and `aria-label="Loading"` baked in. The UI-SPEC adds an `sr-only` span alongside it for additional context.

**How to avoid:** Render `<Spinner aria-hidden="true" />` (to silence the baked-in label) alongside the `<span className="sr-only">Switching to {tenant.name}…</span>`, OR keep the Spinner's own label and omit the sr-only span. The UI-SPEC uses the sr-only pattern — set `aria-hidden="true"` on the Spinner instance to avoid duplicate announcements.

[VERIFIED: codebase scan] Confirmed: `Spinner/index.tsx` has `role="status" aria-label="Loading"` hardcoded.

---

## Code Examples

Verified patterns from codebase source:

### Spinner (size="sm") — confirmed API

```tsx
// Source: design-system/components/Spinner/index.tsx (verified)
import { Spinner } from '@evecosys/design-system'

// Inside TableCell when pendingTenantId === tenant.id:
<span className="flex items-center gap-[var(--ds-space-xs)]">
  <Spinner size="sm" aria-hidden="true" />
  <span className="sr-only">Switching to {tenant.name}…</span>
</span>

// Available sizes: "sm" (h-4 w-4), "md" (h-6 w-6, default), "lg" (h-10 w-10)
// Default colour: text-[var(--ds-color-brand-primary)] (Cyber Jade)
// role="status" aria-label="Loading" are baked in — use aria-hidden="true" to suppress
```

### Alert (variant="destructive") — confirmed API

```tsx
// Source: design-system/components/Alert/index.tsx (verified)
import { Alert, AlertTitle, AlertDescription } from '@evecosys/design-system'

// Sub-components: Alert, AlertTitle, AlertDescription (all exported from @evecosys/design-system)
// Alert has role="alert" baked in (live region)
// variant options: "default" | "success" | "warning" | "destructive"

<Alert variant="destructive" className="mb-[var(--ds-space-sm)]">
  <AlertTitle>Switch failed</AlertTitle>
  <AlertDescription>
    Failed to switch workspace. Please try again.
    {switchError ? ` (${switchError})` : ''}
  </AlertDescription>
  <button
    aria-label="Dismiss error"
    className="absolute right-[var(--ds-space-md)] top-[var(--ds-space-md)] text-[var(--ds-color-status-error)] hover:opacity-70"
    onClick={() => setSwitchError(null)}
  >
    ×
  </button>
</Alert>
```

### EmptyState — confirmed API for BlockedScreen

```tsx
// Source: design-system/components/EmptyState/index.tsx (verified)
import { EmptyState, Button } from '@evecosys/design-system'
import Link from 'next/link'

// Props: icon (optional ReactNode), title (required string), description (optional string), action (optional ReactNode)
// Renders centred with py-[--ds-space-3xl] px-[--ds-space-xl] by default

<EmptyState
  title="Select a workspace to continue"
  description="This area requires an active workspace. Choose one from the tenant list to get started."
  action={
    <Button variant="secondary" asChild>
      <Link href="/platform">Go to tenant list</Link>
    </Button>
  }
/>
```

### Button asChild with Link — confirmed API

```tsx
// Source: design-system/components/Button/index.tsx (verified)
// asChild?: boolean — uses Radix Slot to render the child element instead of <button>
// Confirmed: Button exports `asChild` prop, uses @radix-ui/react-slot

import { Button } from '@evecosys/design-system'
import Link from 'next/link'

<Button variant="secondary" asChild>
  <Link href="/platform">Go to tenant list</Link>
</Button>
```

### TableBody disabled-rows pattern — confirmed CSS-only approach

```tsx
// Source: UI-SPEC interaction contract (verified against design-system Table component)
// No Table prop for disabled state — apply inline styles to wrapper elements

<Table
  aria-busy={isPending}
  style={{ cursor: isPending ? 'not-allowed' : undefined }}
>
  <TableHeader>...</TableHeader>
  <TableBody style={{ opacity: isPending ? 0.5 : 1 }}>
    {tenants.map((tenant) => (
      <TableRow
        key={tenant.id}
        style={{ pointerEvents: isPending ? 'none' : undefined }}
        data-state={activeTenantId === tenant.id ? 'selected' : undefined}
        // onClick and onKeyDown only fire when not isPending (pointer-events: none handles it)
        onClick={() => handleRowClick(tenant)}
      >
        <TableCell>
          {pendingTenantId === tenant.id ? (
            <span className="flex items-center gap-[var(--ds-space-xs)]">
              <Spinner size="sm" aria-hidden="true" />
              <span className="sr-only">Switching to {tenant.name}…</span>
            </span>
          ) : (
            tenant.name
          )}
        </TableCell>
        <TableCell>
          <Badge variant={statusBadgeVariant(tenant.status)}>{tenant.status}</Badge>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useState(loading)` + manual set/clear for async calls | `useTransition` + `isPending` | React 18+ / React 19 | Transition does not block UI; pending state is automatically bounded to the async operation |
| Server Actions throw on error → client catches in try/catch | Server Actions return `ActionResult` `{ ok, error }` | Established Next.js 14+ pattern | Structured error handling; no try/catch in client components |
| `router.push()` + `router.refresh()` for cookie updates | `revalidatePath('/platform', 'layout')` in server action | Next.js 13+ App Router | Server-initiated cache invalidation without client navigation |

**Deprecated/outdated:**
- Calling a server action inside `onClick` without `startTransition`: valid but loses `isPending` — always use `startTransition` for server actions that take user-visible time.
- `httpOnly: true` cookies for UI state: Phase 2 explicitly set `httpOnly: false` to enable client reads; do not revert this.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `middleware.ts` pathname-forwarding pattern (`x-pathname` header) works in Next.js 16.2.7 App Router | Architecture Patterns, Pattern 3 | Blocked-screen check in layout.tsx would need refactoring to a client wrapper instead; low risk since both approaches work |
| A2 | `ActiveTenantIndicator` converting to a client component (to read context) does not introduce performance issues | Architecture Patterns, Pattern 4 | Component is a pure display component with no data fetching — hydration cost is negligible |
| A3 | `revalidatePath('/platform', 'layout')` inside `setActiveTenant` causes the layout to re-render with the updated cookie value (already established in Phase 2) | Pattern 2 | Phase 2 already relies on this; if it's wrong the Phase 2 indicator would already be broken |

---

## Open Questions

1. **Pathname detection approach (Approach A vs Approach B)**
   - What we know: No `middleware.ts` exists; both approaches work in Next.js 16.
   - What's unclear: Whether the team wants any middleware at all (it affects ALL routes, not just `/platform`).
   - Recommendation: Use Approach A (middleware) but scope the matcher to `/platform/*` only to minimize footprint. The planner must decide.

2. **ActiveTenantIndicator context vs re-render-from-server**
   - What we know: `revalidatePath('/platform', 'layout')` fires after every successful switch, causing the layout to re-render and pass the updated `activeTenantName` prop to `PlatformShell`. The header WILL update after the revalidation completes.
   - What's unclear: Whether the optimistic header update (immediate, before server responds) is required or if the post-revalidation update (slightly delayed) is acceptable per SWIT-02.
   - Recommendation: The UI-SPEC explicitly requires the optimistic update ("update the context immediately... within the same synchronous event handler"). Use TenantContext. The post-revalidation server re-render is a bonus confirmation, not the primary signal.

3. **Existing `setActiveTenant.test.ts` — update scope**
   - What we know: All 4 existing tests verify the `void`-return behavior. After ActionResult change, they remain valid for the cookie-write path but need additional tests for the error path.
   - What's unclear: Whether to modify the existing test file or create a new one.
   - Recommendation: Extend the existing test file — add `describe` blocks for the error path. Wave 0 gap.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Next.js App Router | `headers()`, Server Actions, `revalidatePath` | Yes | 16.2.7 | — |
| React 19 `useTransition` | Loading state pattern | Yes | 19.2.4 | — |
| `@evecosys/design-system` Spinner | SWIT-01 | Yes | local | — |
| `@evecosys/design-system` Alert/AlertTitle/AlertDescription | SWIT-03 | Yes | local | — |
| `@evecosys/design-system` EmptyState | SWIT-04 | Yes | local | — |
| `@evecosys/design-system` Button (asChild) | BlockedScreen CTA | Yes | local | — |
| `@radix-ui/react-slot` | Button `asChild` prop | Yes | (transitive dep of design-system) | — |
| `middleware.ts` | Pathname forwarding for SWIT-04 | MISSING (must be created) | — | Approach B: client wrapper with `usePathname()` |

**Missing dependencies with no fallback:** none — `middleware.ts` has a viable Approach B fallback.

**Missing dependencies with viable fallback:**
- `middleware.ts`: does not exist; planner must either add it (Approach A) or implement Approach B (client wrapper using `usePathname()`).

---

## Validation Architecture

`nyquist_validation: true` in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run --reporter=verbose test/unit/components/platform/ test/unit/lib/platform/` |
| Full suite command | `make test` (runs `vitest`) |
| E2E framework | Playwright 1.60.0 |
| E2E config file | `playwright.config.ts` |
| E2E run command | `make e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SWIT-01 | Spinner renders on the pending row when `isPending=true` | unit | `npx vitest run test/unit/components/platform/TenantList.test.tsx` | Yes (needs new tests) |
| SWIT-01 | All other rows have `aria-disabled="true"` and pointer-events disabled | unit | `npx vitest run test/unit/components/platform/TenantList.test.tsx` | Yes (needs new tests) |
| SWIT-01 | `Table` has `aria-busy="true"` during switch | unit | `npx vitest run test/unit/components/platform/TenantList.test.tsx` | Yes (needs new tests) |
| SWIT-02 | ActiveTenantIndicator reads from TenantContext and updates optimistically | unit | `npx vitest run test/unit/components/platform/ActiveTenantIndicator.test.tsx` | Yes (needs new tests) |
| SWIT-02 | `setActiveTenant` returns `{ ok: true }` on successful cookie write | unit | `npx vitest run test/unit/lib/platform/setActiveTenant.test.ts` | Yes (needs new test case) |
| SWIT-03 | `setActiveTenant` returns `{ ok: false, error }` when cookie write throws | unit | `npx vitest run test/unit/lib/platform/setActiveTenant.test.ts` | Yes (needs new test case) |
| SWIT-03 | Alert destructive renders with error text when `switchError` is set | unit | `npx vitest run test/unit/components/platform/TenantList.test.tsx` | Yes (needs new tests) |
| SWIT-03 | Optimistic state reverts when action returns `ok: false` | unit | `npx vitest run test/unit/components/platform/TenantList.test.tsx` | Yes (needs new tests) |
| SWIT-03 | Dismiss button clears the Alert | unit | `npx vitest run test/unit/components/platform/TenantList.test.tsx` | Yes (needs new tests) |
| SWIT-04 | BlockedScreen renders EmptyState with correct title and CTA | unit | `npx vitest run --reporter=verbose` (new file) | No — Wave 0 gap |
| SWIT-04 | platform/layout renders BlockedScreen when cookie absent and isSubRoute | unit/integration | `npx vitest run test/unit/components/platform/` | No — Wave 0 gap |
| SWIT-01–03 | Full switch flow: spinner visible, header updates, error Alert on failure | E2E | `make e2e` (new spec) | No — Wave 0 gap |
| SWIT-04 | Navigating to `/platform/reports` without active tenant shows BlockedScreen | E2E | `make e2e` (new spec) | No — Wave 0 gap |

### Sampling Rate

- **Per task commit:** `npx vitest run test/unit/components/platform/ test/unit/lib/platform/`
- **Per wave merge:** `make test` (full Vitest suite)
- **Phase gate:** Full Vitest suite green + relevant E2E specs green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `test/unit/components/platform/BlockedScreen.test.tsx` — covers SWIT-04 (new component)
- [ ] `test/unit/components/platform/TenantContext.test.tsx` — covers context provider/consumer (new module)
- [ ] New test cases in `test/unit/lib/platform/setActiveTenant.test.ts` — ActionResult error path (SWIT-03)
- [ ] New test cases in `test/unit/components/platform/TenantList.test.tsx` — loading/error/optimistic states (SWIT-01, SWIT-02, SWIT-03)
- [ ] New test cases in `test/unit/components/platform/ActiveTenantIndicator.test.tsx` — context-based name rendering (SWIT-02)
- [ ] `e2e/tests/platform/tenant-switcher.spec.ts` — E2E coverage for SWIT-01 through SWIT-04
- [ ] `e2e/page-objects/PlatformPage.ts` — page object for `/platform` (follows `DashboardPage.ts` pattern)

*Note: Vitest mock for `setActiveTenant` in `TenantList.test.tsx` must be updated from `mockResolvedValue(undefined)` to `mockResolvedValue({ ok: true })` when the return type changes — otherwise existing passing tests will silently mask incorrect behavior.*

---

## Security Domain

`security_enforcement` is not set to `false` in config — treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth guard already in layout.tsx from Phase 1 — unchanged |
| V3 Session Management | yes (partial) | Cookie `platform_active_tenant` is session-scoped, path-scoped to `/platform`, `httpOnly: false` by design (Phase 2 D-07) |
| V4 Access Control | yes | BlockedScreen guard in layout.tsx — prevents accessing sub-routes without active tenant context |
| V5 Input Validation | yes (minimal) | `tenantId` passed to `setActiveTenant` is a UUID from the server-rendered tenant list — not user-typed. No additional validation beyond what Supabase UUID column enforces. |
| V6 Cryptography | no | Cookie stores a tenant UUID (not a secret); no crypto operations |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cookie poisoning (`platform_active_tenant` set to arbitrary UUID) | Spoofing / Elevation of Privilege | Cookie is `httpOnly: false` by design (Phase 2 D-07); RLS policies scope queries to the active tenant (Phase 1 D-01); a poisoned UUID either returns no data (UUID doesn't exist) or the attacker's own tenant data (already accessible). Not a new attack surface for Phase 3. |
| Double-submit race (clicking two rows quickly) | Tampering | D-02: all rows are locked (`pointer-events: none`) while `isPending`; only one transition can be in-flight at a time |
| Blocked-screen bypass (direct URL navigation with no cookie) | Elevation of Privilege | Layout RSC reads cookie server-side on every request — cannot be bypassed by client-side navigation |

---

## Sources

### Primary (HIGH confidence)

- Codebase scan (verified) — `app/(dashboard)/platform/actions.ts`: current `setActiveTenant` signature, cookie name, `revalidatePath` call
- Codebase scan (verified) — `components/platform/TenantList.tsx`: current call site (no await, no startTransition)
- Codebase scan (verified) — `components/layout/PlatformShell.tsx`: component tree structure, `activeTenantName` prop chain
- Codebase scan (verified) — `app/(dashboard)/platform/layout.tsx`: current cookie read, no `headers()` call, no pathname check
- Codebase scan (verified) — `design-system/components/Spinner/index.tsx`: size prop ("sm"/"md"/"lg"), `role="status"`, `aria-label="Loading"` baked in
- Codebase scan (verified) — `design-system/components/Alert/index.tsx`: `variant="destructive"` confirmed, sub-components `Alert`/`AlertTitle`/`AlertDescription` confirmed, `role="alert"` baked in
- Codebase scan (verified) — `design-system/components/EmptyState/index.tsx`: `title`, `description`, `action` props confirmed
- Codebase scan (verified) — `design-system/components/Button/index.tsx`: `asChild` prop confirmed, uses `@radix-ui/react-slot`
- Codebase scan (verified) — `design-system/components/index.ts`: all required exports confirmed present
- Codebase scan (verified) — `test/unit/lib/platform/setActiveTenant.test.ts`: existing test cases, mock pattern
- Codebase scan (verified) — `test/unit/components/platform/TenantList.test.tsx`: mock pattern `mockResolvedValue(undefined)` confirmed
- Codebase scan (verified) — `vitest.config.mts`: Vitest 4.1.8, jsdom environment
- Codebase scan (verified) — `playwright.config.ts`: Playwright 1.60.0, `e2e/.auth/platform-admin.json` storage state exists
- Codebase scan (verified) — `e2e/helpers/auth.helpers.ts`: `platform_admin` user defined in `TEST_USERS`
- Codebase scan (verified) — middleware.ts: does NOT exist at project root

### Secondary (MEDIUM confidence)

- Next.js 16 App Router docs [ASSUMED] — `middleware.ts` pathname-forwarding pattern for RSC layouts; standard pattern documented at nextjs.org

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified in codebase source
- Architecture: HIGH — component tree relationships verified by reading actual files
- Pitfalls: HIGH — all pitfalls verified by reading actual call sites in codebase
- Pathname detection approach (middleware): MEDIUM — `[ASSUMED]` tag applied; standard Next.js pattern but not validated against 16.2.7 changelog

**Research date:** 2026-06-20
**Valid until:** 2026-07-20 (stable stack)
