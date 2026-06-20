# Phase 3: Tenant Switcher States - Pattern Map

**Mapped:** 2026-06-20
**Files analyzed:** 9 (6 source files + 3 test files)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `components/platform/TenantList.tsx` | component (MODIFY) | request-response + event-driven | `components/platform/TenantList.tsx` (self) + `components/ui/ThemeToggle.tsx` (startTransition) | exact (self) |
| `app/(dashboard)/platform/actions.ts` | server-action (MODIFY) | request-response | `app/(dashboard)/platform/actions.ts` (self) | exact (self) |
| `app/(dashboard)/platform/layout.tsx` | layout/middleware (MODIFY) | request-response | `app/(dashboard)/platform/layout.tsx` (self) | exact (self) |
| `components/platform/BlockedScreen.tsx` | component (NEW) | — (pure display) | `components/platform/TenantList.tsx` (EmptyState usage, lines 29-45) | role-match |
| `components/platform/ActiveTenantIndicator.tsx` | component (MODIFY) | event-driven | `components/platform/ActiveTenantIndicator.tsx` (self) | exact (self) |
| `components/platform/TenantContext.tsx` | context/provider (NEW) | event-driven | `components/layout/PlatformShell.tsx` (client component with useState) | partial-match |
| `middleware.ts` | middleware (NEW) | request-response | none — see No Analog Found | no-match |
| `test/unit/components/platform/TenantList.test.tsx` | test (MODIFY) | — | `test/unit/components/platform/TenantList.test.tsx` (self) | exact (self) |
| `test/unit/lib/platform/setActiveTenant.test.ts` | test (MODIFY) | — | `test/unit/lib/platform/setActiveTenant.test.ts` (self) | exact (self) |
| `test/unit/components/platform/BlockedScreen.test.tsx` | test (NEW) | — | `test/unit/components/platform/ActiveTenantIndicator.test.tsx` | role-match |
| `test/unit/components/platform/TenantContext.test.tsx` | test (NEW) | — | `test/unit/components/platform/ActiveTenantIndicator.test.tsx` | role-match |
| `e2e/page-objects/PlatformPage.ts` | E2E page-object (NEW) | — | `e2e/page-objects/DashboardPage.ts` | role-match |
| `e2e/tests/platform/tenant-switcher.spec.ts` | E2E test (NEW) | — | `e2e/tests/auth-guards/role-isolation.spec.ts` | role-match |

---

## Pattern Assignments

### `components/platform/TenantList.tsx` (component, request-response + event-driven — MODIFY)

**Analog:** Self (`components/platform/TenantList.tsx`) + `components/ui/ThemeToggle.tsx` for `startTransition`

**Current file — full contents** (lines 1-80):
```tsx
'use client'

import {
  Table, TableHeader, TableBody, TableHead,
  TableRow, TableCell, Badge, EmptyState,
} from '@evecosys/design-system'
import { setActiveTenant } from '@/app/(dashboard)/platform/actions'
import { statusBadgeVariant } from '@/lib/platform/tenantStatus'

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

**startTransition pattern analog** — `components/ui/ThemeToggle.tsx` (lines 1-6):
```tsx
'use client'

import { useEffect, useState, startTransition } from 'react'
// ThemeToggle uses startTransition(() => setMounted(true)) for non-async state.
// Phase 3 needs useTransition (not bare startTransition) to get isPending:
// const [isPending, startTransition] = useTransition()
```

**What to ADD to TenantList imports** (expand from existing lines 1-14):
```tsx
'use client'

import { useTransition, useState } from 'react'
import {
  Table, TableHeader, TableBody, TableHead,
  TableRow, TableCell, Badge, EmptyState,
  Spinner, Alert, AlertTitle, AlertDescription,
} from '@evecosys/design-system'
import { setActiveTenant } from '@/app/(dashboard)/platform/actions'
import { statusBadgeVariant } from '@/lib/platform/tenantStatus'
import { useTenantContext } from '@/components/platform/TenantContext'
```

**New state declarations to add inside the component function** (after `TenantListProps`):
```tsx
export function TenantList({ tenants, activeTenantId: initialActiveTenantId, error }: TenantListProps) {
  const [isPending, startTransition] = useTransition()
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null)
  const [activeTenantId, setActiveTenantId] = useState(initialActiveTenantId ?? null)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const { setActiveTenantName } = useTenantContext()
```

**handleRowClick pattern** (new function inside component):
```tsx
  function handleRowClick(tenant: TenantRow) {
    const previousId = activeTenantId
    setActiveTenantId(tenant.id)             // optimistic: highlight row immediately
    setActiveTenantName(tenant.name)         // optimistic: update header immediately
    setSwitchError(null)
    setPendingTenantId(tenant.id)

    startTransition(async () => {
      const result = await setActiveTenant(tenant.id)   // MUST await — returns ActionResult
      if (!result.ok) {
        setActiveTenantId(previousId)        // revert optimistic state
        setActiveTenantName(
          tenants.find((t) => t.id === previousId)?.name ?? null
        )
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

**Error Alert pattern** (render above `<Table>`, inside the component return):
```tsx
  return (
    <>
      {switchError && (
        <Alert variant="destructive" className="mb-[var(--ds-space-sm)]">
          <AlertTitle>Switch failed</AlertTitle>
          <AlertDescription>{switchError}</AlertDescription>
          <button
            aria-label="Dismiss error"
            className="absolute right-[var(--ds-space-md)] top-[var(--ds-space-md)] text-[var(--ds-color-status-error)] hover:opacity-70"
            onClick={() => setSwitchError(null)}
          >
            ×
          </button>
        </Alert>
      )}
      <Table
        aria-busy={isPending}
        style={{ cursor: isPending ? 'not-allowed' : undefined }}
      >
```

**Disabled rows + row-level Spinner pattern** (inside `<TableBody>`):
```tsx
      <TableBody style={{ opacity: isPending ? 0.5 : 1 }}>
        {tenants.map((tenant) => (
          <TableRow
            key={tenant.id}
            role="button"
            tabIndex={0}
            aria-label={`Set ${tenant.name} as active workspace`}
            className="cursor-pointer"
            data-state={activeTenantId === tenant.id ? 'selected' : undefined}
            style={{ pointerEvents: isPending ? 'none' : undefined }}
            onClick={() => handleRowClick(tenant)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleRowClick(tenant)
            }}
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
              <Badge variant={statusBadgeVariant(tenant.status)}>
                {tenant.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
```

---

### `app/(dashboard)/platform/actions.ts` (server-action, request-response — MODIFY)

**Analog:** Self (`app/(dashboard)/platform/actions.ts`)

**Current file — full contents** (lines 1-23):
```typescript
'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function setActiveTenant(tenantId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('platform_active_tenant', tenantId, {
    path: '/platform',
    httpOnly: false,
  })
  revalidatePath('/platform', 'layout')
}
```

**Modified file — ActionResult return type** (complete replacement):
```typescript
'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Sets the active tenant context for the platform admin session.
 * Returns ActionResult so the client can check ok/error without try/catch.
 *
 * Cookie options:
 *   - httpOnly: false  — client must be able to read for Phase 3 optimistic UI (D-07)
 *   - No maxAge       — session-duration cookie (D-07)
 */
export async function setActiveTenant(
  tenantId: string
): Promise<{ ok: boolean; error?: string }> {
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

**Key change:** `Promise<void>` → `Promise<{ ok: boolean; error?: string }>`, body wrapped in try/catch returning structured result.

---

### `app/(dashboard)/platform/layout.tsx` (layout, request-response — MODIFY)

**Analog:** Self (`app/(dashboard)/platform/layout.tsx`)

**Current file — full contents** (lines 1-43):
```typescript
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { PlatformShell } from '@/components/layout/PlatformShell'
import type { AppUser } from '@/types'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  // ... auth guard, profile check, cookie read, activeTenantName lookup ...
  return (
    <PlatformShell user={profile as AppUser} activeTenantName={activeTenantName}>
      {children}
    </PlatformShell>
  )
}
```

**What to ADD — import `headers` + `BlockedScreen`** (expand import block):
```typescript
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'   // ADD: headers
import { createClient } from '@/lib/supabase/server'
import { PlatformShell } from '@/components/layout/PlatformShell'
import { BlockedScreen } from '@/components/platform/BlockedScreen'   // ADD
import type { AppUser } from '@/types'
```

**Blocked-screen guard** (add after cookie read, before return — lines 22-43 area):
```typescript
  // Read x-pathname header forwarded by middleware.ts (Phase 3 — NEW)
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

**Pattern established by current layout** for the `await cookies()` call (line 22-23):
```typescript
  const cookieStore = await cookies()
  const tenantId = cookieStore.get('platform_active_tenant')?.value ?? null
  // Phase 3 follows exact same pattern for headers():
  const headerStore = await headers()
  const pathname = headerStore.get('x-pathname') ?? ''
```

---

### `components/platform/BlockedScreen.tsx` (component, display — NEW)

**Analog:** `components/platform/TenantList.tsx` (lines 29-45) — existing EmptyState usage in the same directory

**EmptyState usage pattern from analog** (TenantList.tsx lines 29-36):
```tsx
  if (error) {
    return (
      <EmptyState
        title="Could not load tenants"
        description="There was a problem fetching the tenant list. Refresh the page to try again."
      />
    )
  }
```

**New file pattern** (complete file):
```tsx
'use client'

import { EmptyState, Button } from '@evecosys/design-system'
import Link from 'next/link'

export function BlockedScreen() {
  return (
    <EmptyState
      title="Select a workspace to continue"
      description="This area requires an active workspace. Choose one from the tenant list to get started."
      action={
        <Button variant="secondary" asChild>
          <Link href="/platform">Go to tenant list</Link>
        </Button>
      }
    />
  )
}
```

**Notes:**
- `EmptyState` props verified: `title` (required string), `description` (optional string), `action` (optional ReactNode)
- `Button` with `asChild` prop uses `@radix-ui/react-slot` — renders `<Link>` instead of `<button>`
- `'use client'` directive needed because `Button` from design-system is a client component

---

### `components/platform/ActiveTenantIndicator.tsx` (component, event-driven — MODIFY)

**Analog:** Self (`components/platform/ActiveTenantIndicator.tsx`)

**Current file — full contents** (lines 1-29):
```tsx
import { Building2 } from 'lucide-react'

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

**What to ADD — context-based name + `'use client'` directive**:
```tsx
'use client'                                          // ADD: needed to call useTenantContext

import { Building2 } from 'lucide-react'
import { useTenantContext } from '@/components/platform/TenantContext'  // ADD

// Remove the `name` prop — read from context instead
export function ActiveTenantIndicator() {
  const { activeTenantName } = useTenantContext()    // ADD: replaces prop
  const isActive = Boolean(activeTenantName)
  // ... rest of JSX unchanged, replace `name` with `activeTenantName` ...
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
        {activeTenantName ?? 'No workspace selected'}
      </span>
    </div>
  )
}
```

**Downstream effect:** `PlatformShell.tsx` line 48 passes `name={activeTenantName}` to `ActiveTenantIndicator` — this prop must be removed once the component reads from context. `PlatformShell` will instead wrap its children in `<TenantProvider initialName={activeTenantName}>`.

---

### `components/platform/TenantContext.tsx` (context/provider, event-driven — NEW)

**Closest analog:** `components/layout/PlatformShell.tsx` (client component with `useState`, lines 1-21) — same architectural tier; no existing `createContext` usage found in codebase.

**PlatformShell pattern for useState in a client component** (analog, lines 1-21):
```tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
// ...
interface PlatformShellProps {
  children: React.ReactNode
  user: AppUser
  activeTenantName: string | null
}

export function PlatformShell({ children, user, activeTenantName }: PlatformShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  // ... uses props directly, no useState for activeTenantName currently
```

**New file pattern** (complete file — no existing createContext analog; pattern derived from React 19 + RESEARCH.md confirmed API):
```tsx
'use client'

import { createContext, useContext, useState } from 'react'

interface TenantContextValue {
  activeTenantName: string | null
  setActiveTenantName: (name: string | null) => void
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({
  children,
  initialName,
}: {
  children: React.ReactNode
  initialName: string | null
}) {
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

**Where `TenantProvider` is mounted:** Inside `PlatformShell` render, wrapping the entire shell output — `PlatformShell` receives `activeTenantName` from the layout and passes it as `initialName` to `TenantProvider`. The `<ActiveTenantIndicator name={...}>` call at PlatformShell line 48 is replaced by `<ActiveTenantIndicator />` (no prop — reads context).

---

### `middleware.ts` (middleware, request-response — NEW)

**No analog exists.** See `No Analog Found` section below.

---

## Test File Pattern Assignments

### `test/unit/components/platform/TenantList.test.tsx` (test — MODIFY)

**Analog:** Self (lines 1-47)

**Critical mock update** — change line 5 from `mockResolvedValue(undefined)` to `mockResolvedValue({ ok: true })`:
```typescript
// BEFORE (line 5):
setActiveTenant: vi.fn().mockResolvedValue(undefined),

// AFTER:
setActiveTenant: vi.fn().mockResolvedValue({ ok: true }),
```

**Mock pattern for TenantContext** (add alongside existing mock at top of file):
```typescript
vi.mock('@/components/platform/TenantContext', () => ({
  useTenantContext: vi.fn().mockReturnValue({
    activeTenantName: null,
    setActiveTenantName: vi.fn(),
  }),
}))
```

**Pattern for new useTransition tests** — use `@testing-library/react` `act` for async state:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// New describe block for loading state (SWIT-01)
describe('TenantList — loading state (SWIT-01)', () => {
  it('shows Spinner on clicked row when isPending', async () => {
    vi.mocked(setActiveTenant).mockImplementation(
      () => new Promise(() => {})  // never resolves — keeps isPending=true
    )
    render(<TenantList tenants={MOCK_TENANTS} />)
    const acmeRow = screen.getByRole('button', { name: /Set Acme Fleet as active workspace/i })
    await act(async () => { fireEvent.click(acmeRow) })
    // Spinner replaces tenant name text:
    expect(screen.queryByText('Acme Fleet')).not.toBeInTheDocument()
  })
})

// New describe block for error state (SWIT-03)
describe('TenantList — error state (SWIT-03)', () => {
  it('shows Alert on failed switch', async () => {
    vi.mocked(setActiveTenant).mockResolvedValue({ ok: false, error: 'DB error' })
    render(<TenantList tenants={MOCK_TENANTS} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Set Acme Fleet as active workspace/i }))
    })
    await waitFor(() =>
      expect(screen.getByText(/Failed to switch workspace/)).toBeInTheDocument()
    )
  })
})
```

---

### `test/unit/lib/platform/setActiveTenant.test.ts` (test — MODIFY)

**Analog:** Self (lines 1-65)

**Existing mock infrastructure** (lines 5-15) — reuse exactly, no changes:
```typescript
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
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
```

**Existing tests remain valid** — they test cookie write behaviour, which is unchanged. Add new `describe` block for ActionResult:
```typescript
describe('setActiveTenant — ActionResult return type (Phase 3)', () => {
  it('returns { ok: true } on successful cookie write', async () => {
    const result = await setActiveTenant('tenant-uuid-123')
    expect(result).toEqual({ ok: true })
  })

  it('returns { ok: false, error } when cookie write throws', async () => {
    const mockCookieStore = await vi.mocked(cookies)()
    vi.mocked(mockCookieStore.set).mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })
    const result = await setActiveTenant('tenant-uuid-123')
    expect(result).toEqual({ ok: false, error: 'Storage quota exceeded' })
  })

  it('returns { ok: false, error: "Cookie write failed" } for non-Error throws', async () => {
    const mockCookieStore = await vi.mocked(cookies)()
    vi.mocked(mockCookieStore.set).mockImplementation(() => { throw 'unexpected' })
    const result = await setActiveTenant('tenant-uuid-123')
    expect(result).toEqual({ ok: false, error: 'Cookie write failed' })
  })
})
```

---

### `test/unit/components/platform/BlockedScreen.test.tsx` (test — NEW)

**Analog:** `test/unit/components/platform/ActiveTenantIndicator.test.tsx` (lines 1-20)

**Full analog** (lines 1-20):
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActiveTenantIndicator } from '@/components/platform/ActiveTenantIndicator'

describe('ActiveTenantIndicator', () => {
  it('renders placeholder text when name is null', () => {
    render(<ActiveTenantIndicator name={null} />)
    expect(screen.getByText('No workspace selected')).toBeInTheDocument()
  })
  // ...
})
```

**New file pattern** (copy structure, adapt for BlockedScreen):
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockedScreen } from '@/components/platform/BlockedScreen'

describe('BlockedScreen', () => {
  it('renders the EmptyState title', () => {
    render(<BlockedScreen />)
    expect(screen.getByText('Select a workspace to continue')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<BlockedScreen />)
    expect(screen.getByText(/requires an active workspace/i)).toBeInTheDocument()
  })

  it('renders a link pointing to /platform', () => {
    render(<BlockedScreen />)
    const link = screen.getByRole('link', { name: /go to tenant list/i })
    expect(link).toHaveAttribute('href', '/platform')
  })
})
```

---

### `test/unit/components/platform/TenantContext.test.tsx` (test — NEW)

**Analog:** `test/unit/components/platform/ActiveTenantIndicator.test.tsx`

**New file pattern**:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TenantProvider, useTenantContext } from '@/components/platform/TenantContext'

function TestConsumer() {
  const { activeTenantName, setActiveTenantName } = useTenantContext()
  return (
    <>
      <span data-testid="name">{activeTenantName ?? 'none'}</span>
      <button onClick={() => setActiveTenantName('New Corp')}>Switch</button>
    </>
  )
}

describe('TenantContext', () => {
  it('provides initialName to consumers', () => {
    render(
      <TenantProvider initialName="Acme Fleet">
        <TestConsumer />
      </TenantProvider>
    )
    expect(screen.getByTestId('name')).toHaveTextContent('Acme Fleet')
  })

  it('updates name when setActiveTenantName is called', () => {
    render(
      <TenantProvider initialName={null}>
        <TestConsumer />
      </TenantProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }))
    expect(screen.getByTestId('name')).toHaveTextContent('New Corp')
  })

  it('throws when useTenantContext is used outside TenantProvider', () => {
    expect(() => render(<TestConsumer />)).toThrow('useTenantContext must be used within TenantProvider')
  })
})
```

---

### `e2e/page-objects/PlatformPage.ts` (E2E page-object — NEW)

**Analog:** `e2e/page-objects/DashboardPage.ts` (lines 1-44)

**Full analog — structure to copy**:
```typescript
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly logoutButton: Locator

  constructor(page: Page) {
    this.page = page
    this.logoutButton = page.getByRole('button', { name: /sign out/i })
  }

  async navTo(label: string) {
    await this.page.getByRole('link', { name: label }).click()
  }

  async logout() {
    await this.logoutButton.click()
    await expect(this.page).toHaveURL('/login', { timeout: 10_000 })
  }
}
```

**New file pattern**:
```typescript
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export class PlatformPage {
  readonly page: Page
  readonly activeTenantIndicator: Locator
  readonly tenantListHeading: Locator

  constructor(page: Page) {
    this.page = page
    this.activeTenantIndicator = page.locator('[data-testid="active-tenant-indicator"]')
    this.tenantListHeading = page.getByRole('heading', { name: /tenant list/i })
  }

  async goto() {
    await this.page.goto('/platform')
    await expect(this.tenantListHeading).toBeVisible({ timeout: 10_000 })
  }

  async clickTenantRow(tenantName: string) {
    await this.page.getByRole('button', { name: new RegExp(`Set ${tenantName} as active workspace`, 'i') }).click()
  }

  async expectActiveTenantName(name: string) {
    await expect(this.activeTenantIndicator).toContainText(name, { timeout: 5_000 })
  }

  async expectBlockedScreen() {
    await expect(this.page.getByText('Select a workspace to continue')).toBeVisible({ timeout: 5_000 })
  }

  async expectSwitchError() {
    await expect(this.page.getByText(/Failed to switch workspace/i)).toBeVisible({ timeout: 5_000 })
  }
}
```

---

### `e2e/tests/platform/tenant-switcher.spec.ts` (E2E test — NEW)

**Analog:** `e2e/tests/auth-guards/role-isolation.spec.ts` for structure + `e2e/tests/auth/login.spec.ts` for happy/failure path pattern

**Import pattern from analog** (role-isolation.spec.ts line 6):
```typescript
import { test, expect } from '../../fixtures/index'
```

**storageState pattern from analog** (role-isolation.spec.ts lines 12-13):
```typescript
test.describe('Platform admin — tenant switcher', () => {
  test.use({ storageState: 'e2e/.auth/platform-admin.json' })
```

**New file pattern**:
```typescript
import { test, expect } from '../../fixtures/index'
import { PlatformPage } from '../../page-objects/PlatformPage'

test.describe('Tenant Switcher — SWIT-01/02/03 loading, success, error', () => {
  test.use({ storageState: 'e2e/.auth/platform-admin.json' })

  let platformPage: PlatformPage

  test.beforeEach(async ({ page }) => {
    platformPage = new PlatformPage(page)
    await platformPage.goto()
  })

  test('row click shows Spinner and locks other rows (SWIT-01)', async ({ page }) => {
    // ... verify aria-busy on Table and Spinner visibility
  })

  test('successful switch updates ActiveTenantIndicator header (SWIT-02)', async ({ page }) => {
    // ... click row, wait for header to show tenant name
  })
})

test.describe('Tenant Switcher — SWIT-04 blocked screen', () => {
  test.use({ storageState: 'e2e/.auth/platform-admin.json' })

  test('navigating to /platform sub-route without active tenant shows BlockedScreen', async ({ page }) => {
    // Clear the cookie first, then navigate
    await page.context().clearCookies()
    // Re-authenticate without setting the tenant cookie
    // Navigate to a sub-route
    await page.goto('/platform/reports')  // hypothetical sub-route
    const platformPage = new PlatformPage(page)
    await platformPage.expectBlockedScreen()
  })
})
```

---

## Shared Patterns

### CSS Token Pattern
**Source:** All existing platform components (TenantList.tsx, ActiveTenantIndicator.tsx, PlatformShell.tsx)
**Apply to:** All new/modified component files
```tsx
// All spacing, colors, radii via CSS custom properties:
gap-[var(--ds-space-xs)]          // spacing
color: 'var(--ds-color-brand-primary)'  // color
mb-[var(--ds-space-sm)]           // margin
// NO hardcoded hex values or Tailwind color utilities
```

### Design System Import Pattern
**Source:** `components/platform/TenantList.tsx` (lines 3-12)
**Apply to:** All component files in `components/platform/`
```tsx
import { ComponentName } from '@evecosys/design-system'
// Never import directly from file paths like:
// import { Spinner } from '../../design-system/components/Spinner'
```

### `'use client'` Directive Pattern
**Source:** `components/platform/TenantList.tsx` (line 1), `components/layout/PlatformShell.tsx` (line 1)
**Apply to:** `TenantContext.tsx`, `BlockedScreen.tsx`, `ActiveTenantIndicator.tsx` (after modification)
```tsx
'use client'
// Must be the first line — before any imports
```

### Vitest Mock Hoisting Pattern
**Source:** `test/unit/components/platform/TenantList.test.tsx` (lines 3-6), `test/unit/lib/platform/setActiveTenant.test.ts` (lines 5-19)
**Apply to:** All new unit test files that mock modules
```typescript
// vi.mock calls are hoisted automatically — place at top before imports
vi.mock('@/path/to/module', () => ({
  exportedFn: vi.fn().mockReturnValue(defaultValue),
}))

// Then import (Vitest hoists vi.mock above these):
import { exportedFn } from '@/path/to/module'
```

### Vitest `beforeEach` Clear Pattern
**Source:** `test/unit/components/platform/TenantList.test.tsx` (line 17)
**Apply to:** All new test files with mocks
```typescript
beforeEach(() => vi.clearAllMocks())
```

### E2E Storage State Pattern
**Source:** `e2e/tests/auth-guards/role-isolation.spec.ts` (line 122)
**Apply to:** `e2e/tests/platform/tenant-switcher.spec.ts`
```typescript
test.use({ storageState: 'e2e/.auth/platform-admin.json' })
// File path is relative to project root — matches AUTH_STATE_PATH in auth.helpers.ts
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `middleware.ts` (project root) | middleware | request-response | No `middleware.ts` exists in the project. Standard Next.js 16 pattern. Copy from RESEARCH.md Pattern 3 exactly. |

**middleware.ts pattern** (from RESEARCH.md Pattern 3 — assumed standard, not verified against 16.2.7 changelog):
```typescript
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

---

## Critical Implementation Notes for Planner

1. **`await` is mandatory inside `startTransition`** — current `TenantList.tsx` line 64 calls `setActiveTenant(tenant.id)` without `await`. Phase 3 MUST add `await` inside an async transition callback or `result.ok` is always `undefined`.

2. **Mock update is a Wave 0 prerequisite** — `TenantList.test.tsx` line 5 mocks `setActiveTenant` as `mockResolvedValue(undefined)`. This must change to `mockResolvedValue({ ok: true })` before new tests are written, or existing tests pass against a broken implementation.

3. **TenantContext bridges a Server Component boundary** — `TenantList` (rendered from `platform/page.tsx`, an RSC) cannot receive props from `PlatformShell`. `TenantProvider` mounted inside `PlatformShell` is the only way to share optimistic state between `TenantList` and `ActiveTenantIndicator` without a full server re-render.

4. **`middleware.ts` must exist before the layout guard is tested** — the `x-pathname` header will be `null` in the layout if middleware hasn't been created. Wave ordering: middleware.ts first, then layout guard.

5. **`ActiveTenantIndicator` loses its `name` prop** — `PlatformShell` currently calls `<ActiveTenantIndicator name={activeTenantName} />` (line 48). After Phase 3, the prop is removed and the component reads from context. The `PlatformShell` call site must be updated at the same time.

---

## Metadata

**Analog search scope:** `components/platform/`, `components/layout/`, `components/ui/`, `app/(dashboard)/platform/`, `test/unit/components/platform/`, `test/unit/lib/platform/`, `e2e/page-objects/`, `e2e/tests/`, `e2e/helpers/`
**Files read:** 13
**Pattern extraction date:** 2026-06-20
