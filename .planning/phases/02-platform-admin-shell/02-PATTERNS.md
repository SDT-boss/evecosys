# Phase 2: Platform Admin Shell - Pattern Map

**Mapped:** 2026-06-18
**Files analyzed:** 10
**Analogs found:** 9 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/20260618120000_add_tenant_name.sql` | migration | batch | `supabase/migrations/20260609120000_create_tenants.sql` | exact |
| `lib/tenant/types.ts` (modify) | model | transform | `lib/tenant/types.ts` itself | self-edit |
| `components/layout/PlatformShell.tsx` | component | request-response | `components/layout/DashboardShell.tsx` | exact |
| `components/platform/ActiveTenantIndicator.tsx` | component | request-response | `components/layout/DashboardShell.tsx` (topbar slot) | role-match |
| `components/platform/TenantList.tsx` | component | CRUD | `test/unit/components/design-system/Table.test.tsx` (usage pattern) | role-match |
| `lib/platform/tenantStatus.ts` | utility | transform | `lib/tenant/types.ts` (state mapping) | role-match |
| `app/(dashboard)/platform/actions.ts` | service | request-response | `lib/supabase/server.ts` (cookie/async pattern) | role-match |
| `app/(dashboard)/platform/layout.tsx` (modify) | middleware | request-response | `app/(dashboard)/manager/layout.tsx` | exact |
| `app/(dashboard)/platform/page.tsx` (replace) | controller | CRUD | `app/(dashboard)/manager/layout.tsx` (server component + supabase pattern) | role-match |
| `test/unit/lib/platform/tenantStatus.test.ts` | test | transform | `test/unit/lib/tenant/stateMachine.test.ts` | exact |
| `test/unit/lib/platform/setActiveTenant.test.ts` | test | request-response | `test/unit/lib/platform/createPlatformClient.test.ts` | exact |
| `test/unit/components/platform/TenantList.test.tsx` | test | CRUD | `test/unit/components/auth/SignupForm.test.tsx` | role-match |
| `test/unit/components/platform/ActiveTenantIndicator.test.tsx` | test | request-response | `test/unit/components/design-system/EmptyState.test.tsx` | role-match |

---

## Pattern Assignments

### `supabase/migrations/20260618120000_add_tenant_name.sql` (migration, batch)

**Analog:** `supabase/migrations/20260609120000_create_tenants.sql`

**Header/comment pattern** (lines 1-3 of existing migration):
```sql
-- Phase 1: Auth & Role Foundation — add platform_admin as a first-class role.
-- Concerns: (1) extend users.role CHECK constraint, (2) set_active_tenant() ...
```
Copy the `-- Phase N: <name> — <intent>` comment style as the first line.

**Core ALTER TABLE pattern** — drawn from `20260613120000_platform_admin_role.sql`:
```sql
-- Phase 2: Platform Admin Shell — add display name to tenants table.
-- The empty-string DEFAULT is intentional: existing rows need a valid name value
-- without a data-migration step. Phase 4 branding settings (BSET-01) allows
-- board members to set the canonical name. Platform admins see '' until then.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
```
Use `IF NOT EXISTS` guard to make the migration idempotent.

**No RLS changes** in this file — only the schema alteration above.

---

### `lib/tenant/types.ts` (model, modify)

**Analog:** `lib/tenant/types.ts` lines 13-19 (the `Tenant` interface):
```typescript
export interface Tenant {
  id: string
  owner_id: string
  state: TenantState
  created_at: string
  updated_at: string
}
```
Add `name: string` as a new field **after** `owner_id`, **before** `state`:
```typescript
export interface Tenant {
  id: string
  owner_id: string
  name: string        // added Phase 2 — display name from tenants.name
  state: TenantState
  created_at: string
  updated_at: string
}
```
No other changes to this file. `TenantState`, `TENANT_STATES`, and all error classes are unchanged.

---

### `components/layout/PlatformShell.tsx` (component, request-response)

**Analog:** `components/layout/DashboardShell.tsx`

**Imports pattern** (lines 1-14 of DashboardShell):
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, /* ... role-specific icons */ } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Logo } from '@/components/ui/Logo'
import type { AppUser } from '@/types'
```
For PlatformShell, also import `ActiveTenantIndicator`:
```typescript
import { ActiveTenantIndicator } from '@/components/platform/ActiveTenantIndicator'
```
Drop `NAV_ICONS` map — PlatformShell only has one nav tab ("Tenants") in Phase 2; no dynamic icon registry needed.

**Props interface pattern** (lines 30-35 of DashboardShell):
```typescript
interface DashboardShellProps {
  children: React.ReactNode
  navItems: { label: string; icon: string; href: string }[]
  user: AppUser
  alertBell?: React.ReactNode
}
```
PlatformShell interface (adapted):
```typescript
interface PlatformShellProps {
  children: React.ReactNode
  user: AppUser
  activeTenantName: string | null
}
```
No `navItems` prop — nav tabs are hardcoded inside PlatformShell for Phase 2.

**Topbar pattern** (lines 66-116 of DashboardShell):
```typescript
<div
  className="h-[62px] flex items-center justify-between px-7 sticky top-0 z-30 flex-shrink-0"
  style={{ background: 'var(--topbar-bg)', borderBottom: '1px solid var(--topbar-border)' }}
>
  <div className="flex items-center gap-4">
    <Logo width={110} />
    <div style={{ width: 1, height: 28, background: '#333' }} />
    <span className="text-xs" style={{ color: '#888' }}>Fleet Management System</span>
  </div>
  <div className="flex items-center gap-4">
    {/* ... ThemeToggle, user avatar, logout button */}
  </div>
</div>
```
Copy structure verbatim. Replace the "Fleet Management System" label with `"Platform Admin"` and `var(--ds-color-neutral-grey-40)`. Insert `<ActiveTenantIndicator name={activeTenantName} />` in the right slot, **before** `<ThemeToggle />`.

**Nav strip / horizontal tab pattern** (lines 119-142 of DashboardShell):
```typescript
<div
  className="flex px-7 gap-1 flex-shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden"
  style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--topbar-border)', scrollbarWidth: 'none' }}
>
  {navItems.map(item => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <button
        key={item.href}
        onClick={() => router.push(item.href)}
        className="flex items-center gap-2 px-5 py-3.5 text-xs font-500 transition-all duration-150 flex-shrink-0"
        style={{
          color: isActive ? '#7cc242' : '#777',
          borderBottom: isActive ? '2.5px solid #7cc242' : '2.5px solid transparent',
          fontWeight: 500,
          marginBottom: -1,
        }}
      >
        {/* icon + label */}
      </button>
    )
  })}
</div>
```
Copy this `<button>` pattern verbatim for the "Tenants" tab. Replace hardcoded `#7cc242` with `var(--ds-color-brand-primary)`. Replace `#777` with `var(--ds-color-neutral-grey-60)`. Hardcode a single tab:
```typescript
const NAV_TABS = [
  { label: 'Tenants', href: '/platform' },
]
```

**Logout handler pattern** (lines 49-54 of DashboardShell):
```typescript
async function handleLogout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  router.push('/login')
  router.refresh()
}
```
Copy verbatim. This uses the client-side Supabase client (correct for `'use client'` component).

**Page content wrapper** (lines 144-150 of DashboardShell):
```typescript
<main className="flex-1 overflow-auto">
  <div className="max-w-[1280px] mx-auto px-7 py-7 pb-12">
    {children}
  </div>
</main>
```
Copy verbatim.

---

### `components/platform/ActiveTenantIndicator.tsx` (component, request-response)

**Analog:** `components/layout/DashboardShell.tsx` topbar right-slot (lines 76-114 style pattern) + `test/unit/components/design-system/EmptyState.test.tsx` (pure display component test shape)

**Imports pattern:**
```typescript
import { Building2 } from 'lucide-react'
```
Note: RESEARCH.md flags `BuildingOffice2` as [ASSUMED] for this lucide-react version. Prefer `Building2` which is confirmed stable; verify `BuildingOffice2` exists in `lucide-react ^1.14.0` before using it. Fall back to `Building2` if not found.

**Component pattern** (pure display, no hooks):
```typescript
interface ActiveTenantIndicatorProps {
  name: string | null
}

export function ActiveTenantIndicator({ name }: ActiveTenantIndicatorProps) {
  const isActive = Boolean(name)
  return (
    <div className="flex items-center gap-[var(--ds-space-xs)]">
      <Building2
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
No `'use client'` directive needed — this component is pure display (no hooks, no events). It is consumed inside PlatformShell which is already `'use client'`, so it renders correctly in the client tree.

**Token compliance:** All colors use `var(--ds-*)` tokens. No hardcoded hex values.

---

### `components/platform/TenantList.tsx` (component, CRUD)

**Analog:** `test/unit/components/design-system/Table.test.tsx` (Table API pattern) + `test/unit/components/auth/SignupForm.test.tsx` (client component with async action pattern)

**Imports pattern:**
```typescript
'use client'

import {
  Table, TableHeader, TableBody, TableHead,
  TableRow, TableCell,
} from '@evecosys/design-system'
import { Badge } from '@evecosys/design-system'
import { EmptyState } from '@evecosys/design-system'
import { setActiveTenant } from '@/app/(dashboard)/platform/actions'
```

**Props interface:**
```typescript
interface TenantRow {
  id: string
  name: string
  status: 'Active' | 'Pending' | 'Suspended'
}

interface TenantListProps {
  tenants: TenantRow[]
  activeTenantId?: string | null
  error?: string
}
```

**Table structure pattern** (from `Table.test.tsx` lines 7-37 and `Table/index.tsx` conventions):
```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Tenant</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {tenants.map(tenant => (
      <TableRow
        key={tenant.id}
        role="button"
        tabIndex={0}
        aria-label={`Set ${tenant.name} as active workspace`}
        data-state={activeTenantId === tenant.id ? 'selected' : undefined}
        className="cursor-pointer"
        onClick={() => setActiveTenant(tenant.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setActiveTenant(tenant.id)
        }}
      >
        <TableCell>{tenant.name}</TableCell>
        <TableCell>
          <Badge variant={statusBadgeVariant(tenant.status)}>
            {tenant.status}
          </Badge>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Selected row state** — confirmed by `Table.test.tsx` lines 94-107:
```typescript
// data-state="selected" applies: data-[state=selected]:bg-[var(--ds-color-neutral-grey-10)]
data-state={activeTenantId === tenant.id ? 'selected' : undefined}
```

**Empty state pattern** — from `EmptyState.test.tsx` lines 9-12:
```typescript
if (tenants.length === 0) {
  return (
    <EmptyState
      title="No tenants found"
      description="No tenants have been registered yet. New tenants will appear here once provisioning begins."
    />
  )
}
```

**Error state pattern:**
```typescript
if (error) {
  return (
    <EmptyState
      title="Could not load tenants"
      description="There was a problem fetching the tenant list. Refresh the page to try again."
    />
  )
}
```

---

### `lib/platform/tenantStatus.ts` (utility, transform)

**Analog:** `lib/tenant/types.ts` (TenantState enum + TENANT_STATES constant as input source)

**Imports:**
```typescript
import type { TenantState } from '@/lib/tenant/types'
```

**Core mapping pattern** — mirrors the switch-case style in `lib/tenant/stateMachine.ts`:
```typescript
export type DisplayStatus = 'Active' | 'Pending' | 'Suspended'

export function mapTenantState(state: TenantState): DisplayStatus | null {
  switch (state) {
    case 'Active':          return 'Active'
    case 'Registered':      return 'Pending'
    case 'Provisioning':    return 'Pending'
    case 'Suspended':       return 'Suspended'
    case 'Decommissioned':  return null  // filtered out per UI-SPEC decision
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
Both functions exhaustively cover all cases (TypeScript switch exhaustiveness enforced by return type).

---

### `app/(dashboard)/platform/actions.ts` (service, request-response)

**Analog:** `lib/supabase/server.ts` (async `cookies()` usage pattern, lines 4-5)

**Pattern** — new file, no existing analog for Server Actions in this codebase. Draws from RESEARCH.md Pattern 1 + `lib/supabase/server.ts` cookie pattern:

**Imports and directive:**
```typescript
'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
```

**Core action pattern:**
```typescript
export async function setActiveTenant(tenantId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('platform_active_tenant', tenantId, {
    path: '/platform',
    httpOnly: false,  // D-07: client must read for Phase 3 optimistic UI
    // No maxAge = session-duration cookie (D-07)
  })
  revalidatePath('/platform', 'layout')  // 'layout' type required — see RESEARCH.md Pitfall 1
}
```

**Critical:** `await cookies()` — synchronous cookies() is deprecated in Next.js 16. Pattern confirmed by `lib/supabase/server.ts` line 5: `const cookieStore = await cookies()`.

---

### `app/(dashboard)/platform/layout.tsx` (middleware, request-response — modify)

**Analog:** `app/(dashboard)/manager/layout.tsx` (exact match — same role guard + shell wiring pattern)

**Current file** (`app/(dashboard)/platform/layout.tsx` lines 1-19):
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'platform_admin') redirect('/login')
  return <>{children}</>
}
```

**Imports to add** (modeled on `manager/layout.tsx` lines 1-5):
```typescript
import { cookies } from 'next/headers'
import { PlatformShell } from '@/components/layout/PlatformShell'
import type { AppUser } from '@/types'
```

**Cookie read + tenant name fetch** — extend after the role guard (RESEARCH.md Pattern 2):
```typescript
// Read active tenant from cookie
const cookieStore = await cookies()
const tenantId = cookieStore.get('platform_active_tenant')?.value ?? null

let activeTenantName: string | null = null
let activeTenantId: string | null = tenantId
if (tenantId) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single()
  activeTenantName = tenant?.name ?? null
}
```

**Shell wiring** (modeled on `manager/layout.tsx` line 32):
```typescript
return (
  <PlatformShell
    user={profile as AppUser}
    activeTenantName={activeTenantName}
  >
    {children}
  </PlatformShell>
)
```
Note: pass `activeTenantId` through if TenantList needs it for row highlight (see RESEARCH.md Pitfall 5). Layout reads cookie for the ID; page passes it down via props or a separate cookie read in `page.tsx`.

---

### `app/(dashboard)/platform/page.tsx` (controller, CRUD — replace stub)

**Analog:** `app/(dashboard)/manager/layout.tsx` (Server Component + `createClient()` + Supabase query pattern)

**Current stub** (lines 1-8 — replace entirely):
```typescript
export default function PlatformPage() {
  return (
    <main style={{ padding: 'var(--ds-spacing-6)' }}>
      <h1 style={{ color: 'var(--text)' }}>Platform Admin</h1>
      <p style={{ color: 'var(--text3)' }}>Platform shell coming in Phase 2.</p>
    </main>
  )
}
```

**Imports for replacement:**
```typescript
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { TenantList } from '@/components/platform/TenantList'
import { mapTenantState } from '@/lib/platform/tenantStatus'
import type { TenantState } from '@/lib/tenant/types'
```

**Server Component data fetch pattern** (modeled on `manager/layout.tsx` lines 18-29):
```typescript
export default async function PlatformPage() {
  const supabase = await createClient()

  // Read active tenant ID from cookie for row highlight
  const cookieStore = await cookies()
  const activeTenantId = cookieStore.get('platform_active_tenant')?.value ?? null

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, state')
    .neq('state', 'Decommissioned')
    .order('created_at', { ascending: true })

  if (error) {
    return <TenantList tenants={[]} activeTenantId={activeTenantId} error="Could not load tenants" />
  }

  const mapped = (tenants ?? [])
    .map(t => ({
      id: t.id,
      name: t.name as string,
      status: mapTenantState(t.state as TenantState),
    }))
    .filter((t): t is { id: string; name: string; status: 'Active' | 'Pending' | 'Suspended' } =>
      t.status !== null
    )

  return <TenantList tenants={mapped} activeTenantId={activeTenantId} />
}
```

**Page heading structure** — add above TenantList:
```typescript
<div style={{ padding: 'var(--ds-space-xl)' }}>
  <h1 style={{ fontSize: 'var(--ds-font-size-xl)', fontWeight: 'var(--ds-font-weight-semibold)', color: 'var(--text)' }}>
    Tenant List
  </h1>
  <p style={{ color: 'var(--text3)', marginTop: 'var(--ds-space-xs)' }}>
    All registered tenants on this platform
  </p>
  <TenantList tenants={mapped} activeTenantId={activeTenantId} />
</div>
```

---

## Test Pattern Assignments

### `test/unit/lib/platform/tenantStatus.test.ts` (test, transform)

**Analog:** `test/unit/lib/tenant/stateMachine.test.ts` (pure function tests, no mocking needed)

**Imports pattern** (from `stateMachine.test.ts` lines 1-13):
```typescript
import { describe, it, expect } from 'vitest'
import { mapTenantState, statusBadgeVariant } from '@/lib/platform/tenantStatus'
import type { TenantState } from '@/lib/tenant/types'
```
No mocks needed — pure functions.

**Test structure pattern** (from `stateMachine.test.ts` lines 14-22):
```typescript
const STATE_MAP: [TenantState, 'Active' | 'Pending' | 'Suspended' | null][] = [
  ['Active',          'Active'],
  ['Registered',      'Pending'],
  ['Provisioning',    'Pending'],
  ['Suspended',       'Suspended'],
  ['Decommissioned',  null],
]

describe('mapTenantState', () => {
  it.each(STATE_MAP)('%s → %s', (state, expected) => {
    expect(mapTenantState(state)).toBe(expected)
  })
})
```

---

### `test/unit/lib/platform/setActiveTenant.test.ts` (test, request-response)

**Analog:** `test/unit/lib/platform/createPlatformClient.test.ts` (exact — Server module mocking with hoisted `vi.mock`)

**vi.mock hoisting pattern** (from `createPlatformClient.test.ts` lines 15-33):
```typescript
// Must mock BEFORE importing the module under test
vi.mock('next/headers', () => {
  const mockSet = vi.fn()
  const mockGet = vi.fn()
  const mockCookieStore = { set: mockSet, get: mockGet }
  return {
    cookies: vi.fn().mockResolvedValue(mockCookieStore),
    __mockSet: mockSet,
    __mockGet: mockGet,
    __mockCookieStore: mockCookieStore,
  }
})

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
```

**beforeEach reset pattern** (from `createPlatformClient.test.ts` lines 39-44):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActiveTenant } from '@/app/(dashboard)/platform/actions'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

beforeEach(() => {
  vi.clearAllMocks()
})
```

**Test assertions pattern:**
```typescript
it('sets platform_active_tenant cookie with correct name and value', async () => {
  const mockCookieStore = await (cookies as ReturnType<typeof vi.fn>)()
  await setActiveTenant('tenant-uuid-123')
  expect(mockCookieStore.set).toHaveBeenCalledWith(
    'platform_active_tenant',
    'tenant-uuid-123',
    expect.objectContaining({ path: '/platform', httpOnly: false })
  )
})

it('calls revalidatePath with layout type', async () => {
  await setActiveTenant('tenant-uuid-123')
  expect(revalidatePath).toHaveBeenCalledWith('/platform', 'layout')
})
```

---

### `test/unit/components/platform/TenantList.test.tsx` (test, CRUD)

**Analog:** `test/unit/components/auth/SignupForm.test.tsx` (client component + async action mocking)

**Mock pattern** (from `SignupForm.test.tsx` lines 4-13):
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { TenantList } from '@/components/platform/TenantList'

vi.mock('@/app/(dashboard)/platform/actions', () => ({
  setActiveTenant: vi.fn().mockResolvedValue(undefined),
}))

import { setActiveTenant } from '@/app/(dashboard)/platform/actions'
```

**Test structure pattern** (from `SignupForm.test.tsx` + `EmptyState.test.tsx`):
```typescript
const MOCK_TENANTS = [
  { id: 'tid-1', name: 'Acme Fleet', status: 'Active' as const },
  { id: 'tid-2', name: 'Beta Corp', status: 'Pending' as const },
]

describe('TenantList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders tenant names', () => { ... })
  it('renders status badges', () => { ... })
  it('renders EmptyState when tenants array is empty', () => { ... })
  it('renders error state when error prop is set', () => { ... })
  it('calls setActiveTenant with tenant id on row click', async () => { ... })
})
```

---

### `test/unit/components/platform/ActiveTenantIndicator.test.tsx` (test, request-response)

**Analog:** `test/unit/components/design-system/EmptyState.test.tsx` (pure display component tests)

**Imports pattern** (from `EmptyState.test.tsx` lines 1-4):
```typescript
import { render, screen } from '@testing-library/react'
import { ActiveTenantIndicator } from '@/components/platform/ActiveTenantIndicator'
```
No mocks needed — pure display component with no hooks or actions.

**Test structure pattern** (from `EmptyState.test.tsx`):
```typescript
describe('ActiveTenantIndicator', () => {
  it('renders placeholder text when name is null', () => {
    render(<ActiveTenantIndicator name={null} />)
    expect(screen.getByText('No workspace selected')).toBeInTheDocument()
  })

  it('renders tenant name when name is provided', () => {
    render(<ActiveTenantIndicator name="Acme Fleet" />)
    expect(screen.getByText('Acme Fleet')).toBeInTheDocument()
  })

  it('does not render placeholder when name is provided', () => {
    render(<ActiveTenantIndicator name="Acme Fleet" />)
    expect(screen.queryByText('No workspace selected')).not.toBeInTheDocument()
  })
})
```

---

## Shared Patterns

### Authentication / Role Guard
**Source:** `app/(dashboard)/manager/layout.tsx` lines 17-29 + `app/(dashboard)/platform/layout.tsx` lines 4-17
**Apply to:** `app/(dashboard)/platform/layout.tsx` (extend, not replace)
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
const { data: profile } = await supabase
  .from('users').select('*').eq('id', user.id).single()
if (!profile || profile.role !== 'platform_admin') redirect('/login')
```
Role guard must run BEFORE cookie read and tenant name fetch.

### async cookies() Pattern
**Source:** `lib/supabase/server.ts` line 5
**Apply to:** `app/(dashboard)/platform/layout.tsx`, `app/(dashboard)/platform/page.tsx`, `app/(dashboard)/platform/actions.ts`
```typescript
const cookieStore = await cookies()
// read:  cookieStore.get('key')?.value
// write: cookieStore.set('key', value, options)   <-- only in Server Actions
```
`await` is mandatory — synchronous `cookies()` is deprecated in Next.js 16.

### CSS Token Compliance
**Source:** `components/layout/DashboardShell.tsx` (all inline styles use `var(--*)`)
**Apply to:** `components/layout/PlatformShell.tsx`, `components/platform/ActiveTenantIndicator.tsx`, `components/platform/TenantList.tsx`, `app/(dashboard)/platform/page.tsx`
- All colors: `var(--ds-color-*)` tokens
- Topbar/nav surfaces: `var(--topbar-bg)`, `var(--nav-bg)`, `var(--topbar-border)`, `var(--bg)`
- Active brand color: `var(--ds-color-brand-primary)` — never hardcoded `#7cc242` or `#008684`
- Spacing: `var(--ds-space-*)` tokens

### Design System Imports
**Source:** `test/unit/components/design-system/Badge.test.tsx` line 2, `Table.test.tsx` line 2
**Apply to:** `components/platform/TenantList.tsx`
```typescript
import { Badge } from '@evecosys/design-system'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@evecosys/design-system'
import { EmptyState } from '@evecosys/design-system'
```
Always import from `@evecosys/design-system` barrel, never from internal file paths.

### vi.mock Hoisting for Server Modules
**Source:** `test/unit/lib/platform/createPlatformClient.test.ts` lines 15-33
**Apply to:** `test/unit/lib/platform/setActiveTenant.test.ts`
```typescript
// vi.mock calls are hoisted to top of file — place them before imports
vi.mock('next/headers', () => { ... })
vi.mock('next/cache', () => { ... })
// THEN import the module under test
import { setActiveTenant } from '@/app/(dashboard)/platform/actions'
```
Mock the `'server-only'` shim is already handled by `vitest.config.mts` alias at the `@` path resolver level.

### Server Component Data Fetch Structure
**Source:** `app/(dashboard)/manager/layout.tsx` lines 18-29
**Apply to:** `app/(dashboard)/platform/page.tsx`
```typescript
// Pattern: createClient() → query → handle error → map → render client component
const supabase = await createClient()
const { data, error } = await supabase.from('table').select('cols').filter()
if (error) return <ClientComponent data={[]} error="message" />
return <ClientComponent data={mapped} />
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/(dashboard)/platform/actions.ts` | service | request-response | No existing Server Action file in this codebase. Pattern sourced from RESEARCH.md Pattern 1 + Next.js docs. The `lib/supabase/server.ts` `cookies()` usage is the closest structural match for the `await cookies()` pattern. |

---

## Metadata

**Analog search scope:** `components/layout/`, `app/(dashboard)/`, `lib/`, `test/unit/`, `supabase/migrations/`, `types/`
**Files scanned:** 15 source files read directly
**Pattern extraction date:** 2026-06-18
