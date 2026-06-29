# Phase 1: Auth & Role Foundation - Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 12
**Analogs found:** 11 / 12

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/20260613120000_platform_admin_role.sql` | migration | CRUD | `supabase/migrations/20260609120000_create_tenants.sql` | role-match |
| `supabase/seed.sql` | config | CRUD | `supabase/migrations/20240101000000_initial_schema.sql` (auth.users insert comments) | partial |
| `types/index.ts` | utility | transform | `types/index.ts` (self — additive edit) | exact |
| `lib/supabase/server.ts` | utility | request-response | `lib/supabase/server.ts` (self — additive export) | exact |
| `app/(dashboard)/platform/layout.tsx` | middleware | request-response | `app/(dashboard)/manager/layout.tsx` | exact |
| `app/(dashboard)/platform/page.tsx` | component | request-response | `app/(dashboard)/board/page.tsx` (stub pattern) | partial |
| `app/(dashboard)/board/settings/layout.tsx` | middleware | request-response | `app/(dashboard)/board/layout.tsx` | exact |
| `app/(dashboard)/board/settings/page.tsx` | component | request-response | `app/(dashboard)/board/page.tsx` (stub pattern) | partial |
| `test/unit/lib/platform/createPlatformClient.test.ts` | test | request-response | `test/unit/lib/tenant/tenantIsolation.test.ts` | role-match |
| `e2e/tests/auth-guards/role-isolation.spec.ts` | test | request-response | `e2e/tests/auth-guards/role-isolation.spec.ts` (self — additive edit) | exact |
| `e2e/helpers/auth.helpers.ts` | utility | request-response | `e2e/helpers/auth.helpers.ts` (self — additive edit) | exact |
| `e2e/global-setup.ts` | config | request-response | `e2e/global-setup.ts` (self — additive edit) | exact |

---

## Pattern Assignments

### `supabase/migrations/20260613120000_platform_admin_role.sql` (migration, CRUD)

**Analog:** `supabase/migrations/20260609120000_create_tenants.sql`

**Migration header convention** (lines 1-3 of create_tenants.sql):
```sql
-- Create tenants table for control-plane tenant lifecycle (Phase 1).
-- State values must stay in sync with TenantState in lib/tenant/types.ts.
```
Use the same one-line-per-purpose comment style. New migration should open with:
```sql
-- Phase 1: Add platform_admin role to users.role CHECK constraint.
-- Adds set_active_tenant() helper and platform_admin SELECT policy on tenants.
```

**CHECK constraint drop-and-recreate pattern** (new — no exact analog, use fallback block from RESEARCH.md):
```sql
DO $$ BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('manager', 'board', 'driver', 'platform_admin'));
```

**RLS policy pattern** (lines 30-39 of create_tenants.sql):
```sql
-- A tenant owner can read only their own row
CREATE POLICY tenants_select_own ON public.tenants
  FOR SELECT USING (auth.uid() = owner_id);

-- A tenant owner can update only their own row
CREATE POLICY tenants_update_own ON public.tenants
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
```
Copy this style for the new platform_admin SELECT policy:
```sql
-- Platform admin can read all tenant rows (needed for Phase 2 admin shell)
CREATE POLICY tenants_select_platform_admin ON public.tenants
  FOR SELECT USING (get_my_role() = 'platform_admin');
```

**SQL helper function pattern** (lines 22-24 of create_tenants.sql):
```sql
CREATE OR REPLACE FUNCTION public.set_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
```
Use `CREATE OR REPLACE FUNCTION` for the `set_active_tenant` helper:
```sql
CREATE OR REPLACE FUNCTION public.set_active_tenant(tenant_id TEXT)
RETURNS void AS $$
  SELECT set_config('app.active_tenant_id', tenant_id, true);
$$ LANGUAGE SQL SECURITY INVOKER;
```

**`get_my_role()` usage pattern** (line 173 of initial_schema.sql):
```sql
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid() OR get_my_role() IN ('manager', 'board'));
```
The new policy follows exactly this pattern using `get_my_role() = 'platform_admin'`.

---

### `supabase/seed.sql` (config, CRUD)

**Analog:** `supabase/migrations/20240101000000_initial_schema.sql` (auth.users column list) + `e2e/helpers/auth.helpers.ts` (user shape)

**auth.users column list** (lines 11-20 of initial_schema.sql — the CREATE TABLE defines the columns to populate):
```sql
CREATE TABLE public.users (
  id                     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                  TEXT NOT NULL,
  google_id              TEXT,
  full_name              TEXT NOT NULL,
  role                   TEXT NOT NULL CHECK (role IN ('manager', 'board', 'driver')),
  avatar_url             TEXT,
  force_password_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at             TIMESTAMPTZ DEFAULT NOW()
);
```

**E2E user shape pattern** (lines 4-23 of auth.helpers.ts):
```typescript
manager: {
  email: process.env.E2E_MANAGER_EMAIL ?? 'e2e-manager@evecosys-test.com',
  password: process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!',
  name: 'E2E Manager',
  role: 'manager' as const,
},
```
The seed user should follow the same naming convention: `platform-admin@evecosys.local` (local dev, not a test domain).

**ON CONFLICT DO NOTHING pattern** (lines 45-53 of initial_schema.sql trigger body):
```sql
INSERT INTO public.users (id, email, google_id, full_name, role)
VALUES (...)
ON CONFLICT (id) DO NOTHING;
```
Both `auth.users` and `public.users` inserts must use `ON CONFLICT (id) DO NOTHING` to be idempotent on repeated `make db-reset` runs.

**pgcrypto requirement:** The seed must open with:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```
This matches the `uuid-ossp` extension pattern in line 6 of initial_schema.sql:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

### `types/index.ts` (utility, transform)

**Analog:** `types/index.ts` (self — additive edit, lines 1-13)

**Current exact state** (lines 1-13):
```typescript
export type UserRole = 'manager' | 'board' | 'driver'

export type Theme = 'light' | 'dark'

export interface AppUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  force_password_reset_at?: string
  created_at: string
}
```

**Change:** Line 1 only — replace the `UserRole` union:
```typescript
export type UserRole = 'manager' | 'board' | 'driver' | 'platform_admin'
```
No other lines change. `AppUser` picks up the new role value automatically via the `role: UserRole` field.

---

### `lib/supabase/server.ts` (utility, request-response)

**Analog:** `lib/supabase/server.ts` (self — additive export, lines 1-25)

**Full current file** (lines 1-25):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**New export to append** — appended after line 25, same file, no changes to `createClient`:
```typescript
export async function createPlatformClient(tenantId: string) {
  const client = await createClient()
  await client.rpc('set_active_tenant', { tenant_id: tenantId })
  return client
}
```

Key: `createPlatformClient` delegates to `createClient()` — it never duplicates the cookie logic. The `rpc` name `set_active_tenant` must match the SQL function name defined in the migration.

---

### `app/(dashboard)/platform/layout.tsx` (middleware, request-response)

**Analog:** `app/(dashboard)/manager/layout.tsx` (lines 1-36) — copy verbatim, two substitutions

**Full analog** (lines 1-36 of manager/layout.tsx):
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { AlertBellWrapper } from '@/components/layout/AlertBellWrapper'
import type { AppUser } from '@/types'

const NAV = [
  { label: 'Overview',          icon: 'layout-dashboard', href: '/manager' },
  { label: 'Asset Management',  icon: 'truck',            href: '/manager/assets' },
  ...
]

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'manager') redirect('/login')

  return (
    <DashboardShell navItems={NAV} user={profile as AppUser} alertBell={<AlertBellWrapper role="manager" />}>
      {children}
    </DashboardShell>
  )
}
```

**Substitutions for platform/layout.tsx:**
1. Remove NAV constant and `DashboardShell`/`AlertBellWrapper` imports — Phase 2 builds the platform shell; Phase 1 stub uses minimal HTML.
2. Change `profile.role !== 'manager'` to `profile.role !== 'platform_admin'`.
3. Return `<>{children}</>` or a bare `<main>` instead of `DashboardShell`.

**Result imports block:**
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
```

**Result guard body** (identical four-step skeleton):
```typescript
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'platform_admin') redirect('/login')

  return <>{children}</>
}
```

---

### `app/(dashboard)/platform/page.tsx` (component, request-response)

**Analog:** No full-page analog — existing pages (`board/page.tsx`, `driver/page.tsx`) are feature-rich data pages, not stubs. CONTEXT.md explicitly states a minimal HTML stub is correct here.

**Pattern from CONTEXT.md:** "minimal HTML stub is fine" — "Platform Admin — coming in Phase 2"

**CSS token pattern** (from any existing page, e.g. driver/page.tsx line 8):
```typescript
style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
```
Even the stub must use `var(--ds-*)` / `var(--*)` CSS custom properties — no hardcoded hex. See CLAUDE.md: "Use `var(--ds-*)` CSS custom properties for all colours, spacing, and radii."

**Minimal stub template:**
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
This is a Server Component (no `'use client'`) since it has no interactivity.

---

### `app/(dashboard)/board/settings/layout.tsx` (middleware, request-response)

**Analog:** `app/(dashboard)/board/layout.tsx` (lines 1-33) — copy verbatim, one extension

**Full analog** (lines 1-33 of board/layout.tsx):
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { AlertBellWrapper } from '@/components/layout/AlertBellWrapper'
import type { AppUser } from '@/types'

const NAV = [
  { label: 'Overview', icon: 'layout-dashboard', href: '/board' },
  { label: 'Fleet',    icon: 'layout-grid',       href: '/board/fleet' },
  ...
]

export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'board') redirect('/login')

  return (
    <DashboardShell navItems={NAV} user={profile as AppUser} alertBell={<AlertBellWrapper role="board" />}>
      {children}
    </DashboardShell>
  )
}
```

**Substitutions for board/settings/layout.tsx:**
1. Remove NAV, `DashboardShell`, `AlertBellWrapper` imports (settings layout is nested inside `board/layout.tsx` which already provides the shell — the settings layout only needs to enforce the tenant ownership check).
2. After the role check (`profile.role !== 'board'`), add the secondary tenant ownership query.
3. Return `<>{children}</>` — the parent `board/layout.tsx` already wraps with `DashboardShell`.

**Result:**
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function BoardSettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'board') redirect('/login')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!tenant) redirect('/login')

  return <>{children}</>
}
```

**Note on layout nesting:** `app/(dashboard)/board/layout.tsx` is the parent. A non-board user never reaches this settings layout — the parent guard catches them first. The role re-check in the settings layout is defense-in-depth (matches the existing pattern where every layout fetches profile independently).

---

### `app/(dashboard)/board/settings/page.tsx` (component, request-response)

**Analog:** Same as `platform/page.tsx` — minimal HTML stub, no data fetching.

**Pattern:** Identical minimal stub shape; swap content for board settings context.

```typescript
export default function BoardSettingsPage() {
  return (
    <main style={{ padding: 'var(--ds-spacing-6)' }}>
      <h1 style={{ color: 'var(--text)' }}>Tenant Settings</h1>
      <p style={{ color: 'var(--text3)' }}>Board settings tabs coming in Phase 4.</p>
    </main>
  )
}
```

---

### `test/unit/lib/platform/createPlatformClient.test.ts` (test, request-response)

**Analog:** `test/unit/lib/tenant/tenantIsolation.test.ts` (lines 1-67) and `test/unit/lib/tenant/authGuard.test.ts` (lines 1-110)

**Import pattern** (lines 1-4 of tenantIsolation.test.ts):
```typescript
import { describe, it, expect, vi } from 'vitest'
import { TenantAuthGuard } from '@/lib/tenant/authGuard'
import { AuthSessionError, TenantAccessError } from '@/lib/tenant/types'
import type { DatabaseClient, Tenant } from '@/lib/tenant/types'
```
New test imports:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
```
Module under test is `createPlatformClient` from `@/lib/supabase/server`.

**vi.mock pattern** — since `createPlatformClient` calls `createClient()` internally, mock the `createClient` export:
```typescript
vi.mock('@/lib/supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/server')>()
  return {
    ...actual,
    createClient: vi.fn(),
  }
})
```

**Fake client builder pattern** (lines 6-21 of tenantIsolation.test.ts):
```typescript
function makeDbClient(overrides: {
  user?: { id: string } | null
  ...
} = {}): DatabaseClient {
  return {
    getUser: vi.fn().mockResolvedValue({ ... }),
    getTenantRow: vi.fn().mockResolvedValue({ ... }),
  }
}
```
New test uses same factory pattern for the Supabase client fake:
```typescript
function makeClientMock() {
  return {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}
```

**describe/it structure** (lines 40-67 of tenantIsolation.test.ts):
```typescript
describe('Cross-tenant isolation (TEST-03)', () => {
  it('rejects when RLS filters Tenant B from user-a session (zero-row path)', async () => {
    ...
    await expect(guard.requireSession('tenant-b')).rejects.toThrow(AuthSessionError)
  })
  it('resolves when Tenant A session queries Tenant A (positive control)', async () => {
    ...
    expect(result.tenant.owner_id).toBe('user-a')
  })
})
```
New test follows same describe-then-it nesting:
```typescript
describe('createPlatformClient', () => {
  it('calls set_active_tenant rpc with the provided tenantId', async () => { ... })
  it('returns the supabase client', async () => { ... })
  it('calls createClient() exactly once', async () => { ... })
})
```

**File location:** `test/unit/lib/platform/createPlatformClient.test.ts` — the `platform/` subdirectory must be created (it does not exist yet). The directory naming convention mirrors `test/unit/lib/tenant/`.

---

### `e2e/tests/auth-guards/role-isolation.spec.ts` (test, request-response)

**Analog:** `e2e/tests/auth-guards/role-isolation.spec.ts` (self — additive edit, lines 1-108)

**Test block structure** (lines 10-27 — unauthenticated block):
```typescript
test.describe('Unauthenticated — protected routes redirect to /login', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('GET /manager → /login', async ({ page }) => {
    await page.goto('/manager')
    await expect(page).toHaveURL('/login', { timeout: 10_000 })
  })
  ...
})
```

**Role-access-own-route block** (lines 78-107):
```typescript
test.describe('Manager — can access /manager', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' })

  test('manager can access /manager', async ({ page }) => {
    await page.goto('/manager')
    await expect(page).not.toHaveURL('/login')
    await expect(page).toHaveURL(/\/manager/)
  })
})
```

**Cross-role denial block** (lines 31-43):
```typescript
test.describe('Driver — cannot access /manager or /board', () => {
  test.use({ storageState: 'e2e/.auth/driver.json' })

  test('Driver GET /manager → /driver', async ({ page }) => {
    await page.goto('/manager')
    await expect(page).toHaveURL(/\/driver/, { timeout: 10_000 })
  })
})
```

**New blocks to append** — follow the identical pattern. For AUTH-02 (`/platform`):
```typescript
test.describe('Platform admin — can access /platform', () => {
  test.use({ storageState: 'e2e/.auth/platform-admin.json' })

  test('platform_admin can access /platform', async ({ page }) => {
    await page.goto('/platform')
    await expect(page).not.toHaveURL('/login')
    await expect(page).toHaveURL(/\/platform/)
  })
})

test.describe('Manager — cannot access /platform', () => {
  test.use({ storageState: 'e2e/.auth/manager.json' })

  test('Manager GET /platform → /login', async ({ page }) => {
    await page.goto('/platform')
    await expect(page).toHaveURL('/login', { timeout: 10_000 })
  })
})
```

Also add `/platform` to the unauthenticated block (lines 10-27) and add `/board/settings` tests for AUTH-03.

---

### `e2e/helpers/auth.helpers.ts` (utility, request-response)

**Analog:** `e2e/helpers/auth.helpers.ts` (self — additive edit, lines 1-134)

**TEST_USERS object** (lines 4-23):
```typescript
export const TEST_USERS = {
  manager: {
    email: process.env.E2E_MANAGER_EMAIL ?? 'e2e-manager@evecosys-test.com',
    password: process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!',
    name: 'E2E Manager',
    role: 'manager' as const,
  },
  ...
} as const
```
Add `platform_admin` entry following the exact same shape:
```typescript
platform_admin: {
  email: process.env.E2E_PLATFORM_ADMIN_EMAIL ?? 'e2e-platform-admin@evecosys-test.com',
  password: process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!',
  name: 'E2E Platform Admin',
  role: 'platform_admin' as const,
},
```

**AUTH_STATE_PATH record** (lines 40-44):
```typescript
export const AUTH_STATE_PATH: Record<RoleKey, string> = {
  manager: 'e2e/.auth/manager.json',
  driver: 'e2e/.auth/driver.json',
  board: 'e2e/.auth/board.json',
}
```
Add entry:
```typescript
platform_admin: 'e2e/.auth/platform-admin.json',
```

**loginViaUI destinations record** (lines 67-71):
```typescript
const destinations: Record<RoleKey, string> = {
  manager: '/manager',
  driver: '/driver',
  board: '/board',
}
```
Add:
```typescript
platform_admin: '/platform',
```

**loginViaAPI destinations record** (lines 117-121) — same pattern, same addition.

**`UserSpec` type in global-setup.ts** (line 19 — must also be widened):
```typescript
type UserSpec = { email: string; password: string; name: string; role: 'manager' | 'driver' | 'board' }
```
Change to:
```typescript
type UserSpec = { email: string; password: string; name: string; role: 'manager' | 'driver' | 'board' | 'platform_admin' }
```

---

### `e2e/global-setup.ts` (config, request-response)

**Analog:** `e2e/global-setup.ts` (self — additive edit, lines 1-91)

**ensureTestUser call pattern** (lines 63-69):
```typescript
await Promise.all([
  ensureTestUser('manager'),
  ensureTestUser('driver'),
  ensureTestUser('board'),
  ensureUser(FORCED_RESET_USER),
])
```
Add `ensureTestUser('platform_admin')` to the array:
```typescript
await Promise.all([
  ensureTestUser('manager'),
  ensureTestUser('driver'),
  ensureTestUser('board'),
  ensureTestUser('platform_admin'),
  ensureUser(FORCED_RESET_USER),
])
```

**Auth state generation loop** (lines 72-84):
```typescript
await Promise.all(
  (['manager', 'driver', 'board'] as const).map(async (role) => {
    const ctx = await browser.newContext({ baseURL })
    const page = await ctx.newPage()
    try {
      await loginViaAPI(page, role)
      const statePath = path.resolve(__dirname, '..', AUTH_STATE_PATH[role])
      await ctx.storageState({ path: statePath })
      console.log(`  ✓ Auth state saved: ${AUTH_STATE_PATH[role]}`)
    } finally {
      await ctx.close()
    }
  })
)
```
Change the tuple to include `'platform_admin'`:
```typescript
(['manager', 'driver', 'board', 'platform_admin'] as const).map(async (role) => {
```

---

## Shared Patterns

### Role Guard — Four-Step Skeleton
**Source:** `app/(dashboard)/manager/layout.tsx` (lines 17-29), confirmed by `app/(dashboard)/board/layout.tsx` (lines 14-26) and `app/(dashboard)/driver/layout.tsx`
**Apply to:** `platform/layout.tsx`, `board/settings/layout.tsx`
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) redirect('/login')

const { data: profile } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)
  .single()

if (!profile || profile.role !== '<ROLE>') redirect('/login')
```
IMPORTANT: No middleware.ts exists in this project. Guards live exclusively in layout.tsx files.

### CSS Custom Properties — No Hardcoded Colors
**Source:** `app/(dashboard)/driver/page.tsx` (line 8 et al.)
**Apply to:** `platform/page.tsx`, `board/settings/page.tsx`
```typescript
style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
style={{ color: 'var(--text)' }}
style={{ color: 'var(--text3)' }}
```
Per CLAUDE.md: use `var(--ds-*)` CSS custom properties — no hardcoded hex values.

### Supabase RLS Policy Naming Convention
**Source:** `supabase/migrations/20260609120000_create_tenants.sql` (lines 30-39)
**Apply to:** `20260613120000_platform_admin_role.sql`
```sql
CREATE POLICY tenants_select_own ON public.tenants
  FOR SELECT USING (auth.uid() = owner_id);
```
Naming: `<table>_<operation>_<qualifier>`. New policy: `tenants_select_platform_admin`.

### Vitest Test Structure
**Source:** `test/unit/lib/tenant/tenantIsolation.test.ts` (lines 1-4, 40-67)
**Apply to:** `test/unit/lib/platform/createPlatformClient.test.ts`
```typescript
import { describe, it, expect, vi } from 'vitest'
describe('<subject> (<req-id>)', () => {
  it('<behavior description>', async () => {
    // arrange
    // act
    // assert
  })
})
```

### E2E AUTH_STATE_PATH / storageState Convention
**Source:** `e2e/tests/auth-guards/role-isolation.spec.ts` (lines 32-33)
**Apply to:** All new E2E test blocks for platform_admin
```typescript
test.use({ storageState: 'e2e/.auth/board.json' })
```
New: `test.use({ storageState: 'e2e/.auth/platform-admin.json' })` — file generated by global-setup.

### Migration File Naming
**Source:** Filesystem — four existing migrations confirm convention
**Apply to:** `20260613120000_platform_admin_role.sql`
Pattern: `YYYYMMDDHHMMSS_<lowercase-hyphen-slug>.sql`. Never edit existing files.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/(dashboard)/platform/page.tsx` | component | request-response | No existing stub-only page pages exist — all current pages are feature-rich. CONTEXT.md explicitly authorizes minimal HTML stub. |
| `app/(dashboard)/board/settings/page.tsx` | component | request-response | Same as above. |

Both stub pages should follow the CSS token pattern (shared pattern above) and return a minimal Server Component with no data fetching.

---

## Metadata

**Analog search scope:** `app/(dashboard)/`, `lib/supabase/`, `types/`, `test/unit/lib/tenant/`, `test/utils/`, `e2e/tests/`, `e2e/helpers/`, `e2e/`, `supabase/migrations/`
**Files scanned:** 18
**Pattern extraction date:** 2026-06-13
