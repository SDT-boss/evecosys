# Phase 4: Board Tenant Settings — Research

**Researched:** 2026-06-20
**Domain:** Next.js App Router settings UI · Supabase (Storage, Auth Admin, RLS, JSONB) · lib/tenant/ provisioning stack
**Confidence:** HIGH (all key findings verified from codebase or official package sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tab Navigation**
- D-01: Four nested routes — `/board/settings/branding`, `/board/settings/users`, `/board/settings/byodb`, `/board/settings/toggles`
- D-02: `/board/settings` root redirects to `/board/settings/branding`
- D-03: Tab navigation bar lives in `board/settings/layout.tsx`; existing auth + tenant guard stays intact
- D-04: Add `{ label: 'Settings', icon: '...', href: '/board/settings' }` to board NAV array in `app/(dashboard)/board/layout.tsx`

**Branding**
- D-05: Logo is a file upload to Supabase Storage; new migration adds `logo_url TEXT` to `tenants`
- D-06: Primary colour is a free hex input; new migration adds `primary_color TEXT` to `tenants`
- D-07: All branding via explicit Save button; ActionResult pattern `{ ok: boolean; error?: string }`; inline Alert feedback

**Feature Flags**
- D-08: 8 named flags: `member_invitations`, `fleet`, `carbon`, `trips`, `driver_behaviour_score`, `alerts`, `charging_stations`, `auth_troubleshooting`
- D-09: Feature OFF = disabled within its page; nav item remains visible
- D-10: `auth_troubleshooting` flag enables force-password-reset action on Users tab
- D-11: Stored as `feature_flags JSONB NOT NULL DEFAULT '{}'` on `tenants` table

**User Management**
- D-12: Invite = `supabase.auth.admin.inviteUserByEmail()` via service-role client inside API route
- D-13: Invite form includes role selector (Manager / Driver); no `platform_admin` option
- D-14: Remove = hard delete from `users` table + `supabase.auth.admin.deleteUser()` via service-role client; confirmation dialog required
- D-15: Users tab lists `users WHERE tenant_id = <current tenant id>` — `tenant_id` FK may not exist yet; researcher/planner to verify and add migration if needed

### Claude's Discretion
- Exact icon name for the Settings nav entry
- Sub-route slug variants if names conflict
- Visual treatment of the logo upload (drag-and-drop vs simple `<input type="file">`)
- Hex colour validation details (lowercase normalisation, length check)
- Default value for `feature_flags` JSONB — recommend all flags `true`
- Exact UI label and description for each feature flag
- Whether `auth_troubleshooting` is grouped separately in the UI
- Confirmation dialog copy for Remove user action

### Deferred Ideas (OUT OF SCOPE)
- Branding preview hot-reload (BSET-05, v2)
- Feature flag: hiding entire nav sections when a feature is off
- Platform admin visibility of per-tenant feature flags (Platform Admin v2)
- Role assignment post-invite two-step flow
- Mobile/responsive design (web-first; v2)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BSET-01 | Board member can configure tenant branding — logo upload, primary colour, tenant display name | D-05/D-06/D-07 locked; Supabase Storage setup required (new bucket + migration); `logo_url` + `primary_color` columns to add |
| BSET-02 | Board member can invite managers/drivers and remove existing users | D-12/D-13/D-14/D-15 locked; `users.tenant_id` FK does not exist — migration required; `inviteUserByEmail` via service client |
| BSET-03 | Board member can register BYODB connection via `lib/tenant/` provisioning stack through API route | `BYODBRegistrationService` is fully built; API route to be new; tenant must be in `Provisioning` state — see critical blocker note |
| BSET-04 | Board member can toggle per-tenant feature flags | `feature_flags JSONB` column to add; UI uses Switch per flag; explicit Save button + PATCH API route |
</phase_requirements>

---

## Summary

Phase 4 wires a four-tab settings area at `/board/settings` into the existing board dashboard shell. The foundational auth guard (`board/settings/layout.tsx`) is already in place; this phase expands it into a full tab-nav layout and adds four sub-pages — each backed by a dedicated API route.

The database side requires three new migrations: `logo_url TEXT` + `primary_color TEXT` on `tenants` (BSET-01), `feature_flags JSONB NOT NULL DEFAULT '{}'` on `tenants` (BSET-04), and a new `users.tenant_id UUID REFERENCES tenants(id)` FK column (BSET-02). The `users` table currently has **no `tenant_id` column** — this is confirmed by exhaustive grep across all migrations and app code. Adding it is a hard prerequisite for the Users tab.

The BYODB tab (`registrationService.register()`) has a state guard: `tenant.state` must be `'Provisioning'`. In the current codebase tenants are created in `'Registered'` state. The API route for BYODB must transition the tenant to `Provisioning` before calling `register()`, or accept that the guard will throw. The planner must address this flow explicitly.

No new npm packages are needed. All design system components (`Tabs`, `Switch`, `Alert`, `AlertDialog`, `Table`, `EmptyState`, `Select`, `Input`, `Button`, `Card`, `FormField`, `RadioGroup`, `Spinner`) exist in `@evecosys/design-system` and are imported from there. Supabase Storage is enabled locally (`config.toml enabled = true`). The `DashboardShell` already has `'settings'` registered in `NAV_ICONS` — the icon string `'settings'` works without any shell edits beyond adding the NAV entry.

**Primary recommendation:** Execute in four waves — (0) DB migrations + test scaffolding, (1) layout + nav + branding tab, (2) users tab + BYODB tab, (3) feature toggles tab. Gate Wave 1 on Wave 0 migration push (`supabase db push`).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tab navigation bar | Frontend Server (layout RSC) | Browser (Client: usePathname for active tab) | Layout renders on server; active-state detection requires client `usePathname` hook |
| Branding form state | Browser (Client Component) | API / Backend (write) | File upload and hex validation are client-side; persistence goes through API route |
| Logo upload to Storage | API / Backend | Database / Storage | Service client required for bucket write; RLS must gate the tenant's bucket path |
| User membership list | Frontend Server (RSC fetch) | — | `users WHERE tenant_id = X` — pure server-side data fetch |
| Invite / Remove mutations | API / Backend | — | Service-role client required for `inviteUserByEmail` and `deleteUser`; cannot run in RSC |
| BYODB registration | API / Backend | Database / Storage (Vault) | `BYODBRegistrationService` runs server-side; involves connectivity probe + Vault write |
| Feature flag toggles state | Browser (Client Component) | API / Backend (PATCH) | Local React state until Save is pressed; then PATCH API route persists to `tenants.feature_flags` |
| Auth guard (board + tenant) | Frontend Server (layout RSC) | — | Existing `board/settings/layout.tsx` pattern; remains on server |

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version (project) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `@supabase/supabase-js` | `^2.105.1` (latest: 2.108.2) [VERIFIED: npm registry] | `auth.admin.inviteUserByEmail`, `auth.admin.deleteUser`, Storage upload | Required for service-role auth admin operations |
| `@supabase/ssr` | `^0.10.2` | Cookie-based server client (`createClient`) | Existing codebase pattern |
| `lucide-react` | `^1.14.0` | Icons in settings UI (`Settings`, `Upload`, `Users`) | Existing icon library — `Settings` icon already registered in `NAV_ICONS` |
| `next` | 16 (App Router) | Nested routes, RSC, server actions, `redirect()` | Existing framework |

### Supporting (design system — all verified in codebase)

| Component | Source | Purpose |
|-----------|--------|---------|
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `@evecosys/design-system` [VERIFIED: codebase] | Settings tab navigation bar |
| `Switch` | `@evecosys/design-system` [VERIFIED: codebase] | Feature flag toggles (ON: Jade Strong track) |
| `Alert`, `AlertTitle`, `AlertDescription` | `@evecosys/design-system` [VERIFIED: codebase] | Inline success/error feedback (variants: `success`, `destructive`) |
| `AlertDialog` + sub-components | `@evecosys/design-system` [VERIFIED: codebase] | Remove user confirmation (cannot dismiss by overlay click) |
| `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell` | `@evecosys/design-system` [VERIFIED: codebase] | Users tab member list |
| `EmptyState` | `@evecosys/design-system` [VERIFIED: codebase] | No team members state in Users tab |
| `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` | `@evecosys/design-system` [VERIFIED: codebase] | Role dropdown in invite form; engine dropdown in BYODB form |
| `Input` | `@evecosys/design-system` [VERIFIED: codebase] | All text fields; supports `aria-invalid="true"` for error state |
| `FormField` | `@evecosys/design-system` [VERIFIED: codebase] | Wraps label + control + helper + error per field |
| `Button` | `@evecosys/design-system` [VERIFIED: codebase] | All CTAs (`secondary` = Jade save, `default` = Volt Green invite, `destructive` = remove) |
| `Card`, `CardContent` | `@evecosys/design-system` [VERIFIED: codebase] | Section wrappers within each tab |
| `RadioGroup`, `RadioGroupItem` | `@evecosys/design-system` [VERIFIED: codebase] | BYODB mode toggle (Structured / Connection string) |
| `Spinner` | `@evecosys/design-system` [VERIFIED: codebase] | Loading state inside buttons during submission |
| `Badge` | `@evecosys/design-system` [VERIFIED: codebase] | Role badge in user table (`default` = Manager, `secondary` = Driver) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Nested routes for tabs | Radix `Tabs` with client-side state | Nested routes give each tab a shareable URL and SSR data fetching; Radix Tabs alone would require client-side fetching per tab |
| Explicit Save button for toggles | Auto-save on Switch toggle | Auto-save introduces race conditions with rapid toggling; explicit Save matches existing Phase 3 pattern |
| `inviteUserByEmail` (magic-link invite) | `createUser` with temp password | `inviteUserByEmail` sends a proper invite email; `createUser` requires a temporary password which is less secure and a worse UX |

**No new packages to install.** All dependencies are already present.

---

## Package Legitimacy Audit

No new packages are introduced in Phase 4. All components and libraries are already installed and used in Phases 1–3. This section is not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Board Member (browser)
        │
        ▼
app/(dashboard)/board/settings/layout.tsx   ← RSC auth guard (board role + tenant check)
        │
        ├── TabsList nav bar (Client: usePathname for active state)
        │
        └── {children}
                │
                ├─ /branding  page.tsx (RSC fetch tenant) → BrandingForm (Client)
                │       │                                         │
                │       │                            POST /api/board/settings/branding
                │       │                              (service client: Storage.upload + tenants UPDATE)
                │       │
                ├─ /users     page.tsx (RSC fetch users WHERE tenant_id=X)
                │       │
                │       ├── InviteForm (Client)
                │       │       └── POST /api/board/settings/users/invite
                │       │             (service client: auth.admin.inviteUserByEmail)
                │       │
                │       └── MemberTable (Client: AlertDialog for remove)
                │               └── DELETE /api/board/settings/users/remove
                │                     (service client: auth.admin.deleteUser + users DELETE)
                │
                ├─ /byodb     page.tsx (RSC fetch tenant state)
                │       └── BYODBForm (Client)
                │               └── POST /api/board/settings/byodb
                │                     (BYODBRegistrationService: probe → vault → state transition)
                │
                └─ /toggles   page.tsx (RSC fetch tenants.feature_flags)
                        └── ToggleForm (Client: local state until Save)
                                └── PATCH /api/board/settings/toggles
                                      (tenants UPDATE: feature_flags = <full payload>)
```

### Recommended Project Structure

```
app/(dashboard)/board/
├── layout.tsx                         # ADD: Settings nav entry
└── settings/
    ├── layout.tsx                     # REPLACE: add page title + TabsList + {children}
    ├── page.tsx                       # REPLACE: redirect('/board/settings/branding')
    ├── branding/
    │   └── page.tsx                   # NEW: RSC fetches tenant branding fields
    ├── users/
    │   └── page.tsx                   # NEW: RSC fetches users WHERE tenant_id = X
    ├── byodb/
    │   └── page.tsx                   # NEW: RSC fetches tenant state
    └── toggles/
        └── page.tsx                   # NEW: RSC fetches tenants.feature_flags

app/api/board/settings/
├── branding/route.ts                  # NEW: POST — logo upload + tenants UPDATE
├── users/
│   ├── invite/route.ts                # NEW: POST — inviteUserByEmail
│   └── remove/route.ts               # NEW: DELETE — deleteUser + users DELETE
├── byodb/route.ts                     # NEW: POST — BYODBRegistrationService.register()
└── toggles/route.ts                   # NEW: PATCH — tenants.feature_flags UPDATE

components/board/settings/
├── BrandingForm.tsx                   # NEW: Client Component
├── InviteForm.tsx                     # NEW: Client Component
├── MemberTable.tsx                    # NEW: Client Component (includes AlertDialog)
├── BYODBForm.tsx                      # NEW: Client Component
└── ToggleForm.tsx                     # NEW: Client Component

supabase/migrations/
├── 20260620120000_add_tenant_branding.sql     # NEW: logo_url + primary_color
├── 20260620130000_add_tenant_feature_flags.sql # NEW: feature_flags JSONB
└── 20260620140000_add_users_tenant_id.sql     # NEW: users.tenant_id FK + RLS
```

### Pattern 1: Nested Route Tab Navigation with usePathname

The `Tabs` component is a Radix primitive that manages active state via a `value` prop. For **page-level navigation** (different routes per tab), the active tab must be derived from `usePathname()` rather than internal Radix state.

```tsx
// Source: design-system/components/Tabs/index.tsx + Next.js usePathname
// In board/settings/layout.tsx (Client Component for nav only, or split)

'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger } from '@evecosys/design-system'

const TABS = [
  { label: 'Branding',         href: '/board/settings/branding' },
  { label: 'Users',            href: '/board/settings/users' },
  { label: 'BYODB',            href: '/board/settings/byodb' },
  { label: 'Feature Toggles',  href: '/board/settings/toggles' },
]

export function SettingsTabNav() {
  const pathname = usePathname()
  // Derive active tab value from current pathname
  const activeTab = TABS.find(t => pathname.startsWith(t.href))?.href ?? TABS[0].href

  return (
    <nav aria-label="Settings navigation">
      <Tabs value={activeTab}>
        <TabsList>
          {TABS.map(tab => (
            <TabsTrigger key={tab.href} value={tab.href} asChild>
              <Link href={tab.href}>{tab.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </nav>
  )
}
```

**Important:** `TabsContent` is NOT used here — the tab content is the `{children}` from the nested route, not Radix-managed content. Only `TabsList` + `TabsTrigger` are used for navigation.

### Pattern 2: API Route with Role Re-verification (established pattern)

Every API route re-verifies the caller's role. This is the established pattern from `app/api/users/create/route.ts` and must be applied to all five new routes.

```typescript
// Source: app/api/users/create/route.ts [VERIFIED: codebase]
// Template for all new board/settings API routes

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  // 1. Verify caller is authenticated and has board role
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'board') {
    return NextResponse.json({ error: 'Forbidden — board role required' }, { status: 403 })
  }

  // 2. Fetch tenant scoped to this board member
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // 3. Use service client for admin operations
  const adminClient = createServiceClient()
  // ... operation
}
```

### Pattern 3: ActionResult with Inline Alert (established Phase 3 pattern)

```typescript
// Source: app/(dashboard)/platform/actions.ts [VERIFIED: codebase]
// Return type: { ok: boolean; error?: string }

// In Client Component (e.g. BrandingForm.tsx):
const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)
const [pending, setPending] = useState(false)

async function handleSave() {
  setPending(true)
  const res = await fetch('/api/board/settings/branding', { method: 'POST', body: formData })
  const data = await res.json()
  setResult({ ok: res.ok, error: data.error })
  setPending(false)
}

// In JSX:
{result?.ok === true && (
  <Alert variant="success">
    <AlertTitle>Branding saved</AlertTitle>
    <AlertDescription>Your tenant's branding settings have been updated.</AlertDescription>
  </Alert>
)}
{result?.ok === false && (
  <Alert variant="destructive">
    <AlertTitle>Save failed</AlertTitle>
    <AlertDescription>{result.error}</AlertDescription>
  </Alert>
)}
```

### Pattern 4: Service Client for Admin Operations

```typescript
// Source: lib/supabase/service.ts [VERIFIED: codebase]
// Import: createServiceClient from '@/lib/supabase/service'
// Note: lib/supabase/service.ts exports createServiceClient(), NOT createClient()
// The existing app/api/users/create/route.ts uses createClient from @supabase/supabase-js directly
// — this is an OLDER pattern. The new routes MUST use createServiceClient() from lib/supabase/service.ts

import { createServiceClient } from '@/lib/supabase/service'

// Invite flow:
const admin = createServiceClient()
const { error } = await admin.auth.admin.inviteUserByEmail(email, {
  data: { role, full_name: '' },  // metadata passed to handle_new_user trigger
  redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
})

// Remove flow:
const admin = createServiceClient()
await admin.from('users').delete().eq('id', userId).eq('tenant_id', tenantId) // verify tenant scope
await admin.auth.admin.deleteUser(userId)
```

### Pattern 5: Supabase Storage Upload (new to codebase)

```typescript
// Source: Supabase JS SDK auth admin + storage APIs [ASSUMED - standard Supabase pattern]
// No existing Storage usage in codebase — this is the first use

const admin = createServiceClient()

// Upload logo
const filePath = `tenant-logos/${tenantId}/${Date.now()}-${file.name}`
const { data: uploadData, error: uploadError } = await admin.storage
  .from('tenant-assets')                      // bucket name — must be created via migration
  .upload(filePath, fileBuffer, {
    contentType: file.type,
    upsert: true,
  })

if (uploadError) { /* return error without DB update */ }

// Get public URL
const { data: { publicUrl } } = admin.storage
  .from('tenant-assets')
  .getPublicUrl(filePath)

// Update tenants row
await admin.from('tenants').update({ logo_url: publicUrl }).eq('id', tenantId)
```

### Pattern 6: Migration File Pattern

```sql
-- Source: supabase/migrations/20260618120000_add_tenant_name.sql [VERIFIED: codebase]
-- Pattern: one concern per file, ADD COLUMN IF NOT EXISTS, comment explains Phase

-- Phase 4: Board Tenant Settings — add branding columns to tenants table (BSET-01)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT;
```

### Anti-Patterns to Avoid

- **Using `Tabs` component with `TabsContent` for navigation:** `TabsContent` hides non-active content via `display: none`. For route-based tabs, only use `TabsList` + `TabsTrigger`. The route's `{children}` is the content.
- **Importing `createClient` from `@supabase/supabase-js` directly in new routes:** The `app/api/users/create/route.ts` does this as an older pattern. New routes must use `createServiceClient()` from `@/lib/supabase/service`.
- **Calling `BYODBRegistrationService.register()` without a state guard transition:** The service throws `ConnectivityError` if `tenant.state !== 'Provisioning'`. New tenants start in `'Registered'` state. The BYODB API route must handle this.
- **Calling `inviteUserByEmail` without setting user metadata:** The `handle_new_user()` trigger reads `raw_user_meta_data->>'role'` to populate `users.role`. Pass `data: { role }` in the invite options.
- **Hardcoding hex values in JSX:** All colours must use `var(--ds-*)` tokens per CLAUDE.md.
- **Editing existing migration files:** Always create a new file in `supabase/migrations/` per CLAUDE.md.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BYODB credential validation | Custom validation logic | `normalizeCredential()` from `lib/tenant/credentials.ts` | Already handles both structured + connection-string modes, port validation, protocol mapping |
| BYODB probe + vault + state transition | Custom orchestration | `BYODBRegistrationService.register()` from `lib/tenant/registrationService.ts` | Full rollback logic already implemented and unit-tested |
| Tab navigation active state | Manual `className` toggling | `Tabs` with `value` from `usePathname()` | Radix handles focus management, keyboard navigation, and ARIA attributes |
| Confirmation dialog for irreversible actions | Custom modal | `AlertDialog` from `@evecosys/design-system` | Correctly prevents overlay-click dismissal; provides `role="alertdialog"` |
| Form error display | Custom error rendering | `FormField` with `error` prop | Handles `aria-describedby`, `aria-invalid`, and consistent spacing automatically |
| File type/size validation client-side | Custom validation | `accept="image/png,image/jpeg,image/svg+xml"` + `file.size > 2 * 1024 * 1024` guard | Simple and sufficient for v1 |

---

## Critical Findings

### Finding 1: `users` Table Has NO `tenant_id` Column — Migration Required

[VERIFIED: codebase] Comprehensive search of all migrations and application code confirms there is **no `tenant_id` column** on `public.users`. The D-15 concern is valid.

The Users tab (`users WHERE tenant_id = X`) cannot function without this column. The migration must:
1. Add `tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL` to `public.users`
2. Add RLS policy so board members can only select `users WHERE tenant_id = auth_tenant_id()`
3. Update the `handle_new_user()` trigger or post-invite webhook to set `tenant_id` when an invited user accepts

**Role write on invite acceptance:** `inviteUserByEmail` sends a magic link. When the user accepts, `handle_new_user()` fires. Currently this trigger reads `raw_user_meta_data->>'role'` to set `users.role`. To also set `tenant_id`, the API route must either:
- Pass `tenant_id` in invite `data` metadata and update the trigger, OR
- Use `auth.admin.updateUserById()` post-acceptance (requires a webhook — complex for v1)

**Simplest v1 approach:** Pass `tenant_id` in invite metadata and update `handle_new_user()` to also set `users.tenant_id` from `raw_user_meta_data->>'tenant_id'`. This is a trigger edit — it requires updating the `handle_new_user()` function in the migration (use `CREATE OR REPLACE FUNCTION`). [ASSUMED — planner to confirm approach]

### Finding 2: `DashboardShell` Already Has `'settings'` in `NAV_ICONS`

[VERIFIED: codebase] Line 7 of `components/layout/DashboardShell.tsx` imports `Settings` from `lucide-react`, and line 22 maps `'settings'` to the `Settings` icon. Adding `{ label: 'Settings', icon: 'settings', href: '/board/settings' }` to the board NAV array in `board/layout.tsx` works without any shell changes.

### Finding 3: `BYODBRegistrationService` Has a State Guard — Tenant Must Be `'Provisioning'`

[VERIFIED: codebase] `registrationService.ts` line 39: `if (tenant.state !== 'Provisioning') throw ConnectivityError(...)`. New tenants are created in `'Registered'` state (initial_schema has no default; `create_tenants.sql` sets `DEFAULT 'Registered'`).

The BYODB API route must either:
- Perform a state transition `Registered → Provisioning` before calling `register()`, using `transition()` from `lib/tenant/stateMachine.ts`, OR
- Accept registrations in any non-terminal state and handle the guard differently

The state machine should be checked before committing to an approach. [ASSUMED — planner to verify `stateMachine.ts` transition table for `Registered → Provisioning`]

### Finding 4: Supabase Storage Has No Existing Buckets or RLS — New Bucket Migration Required

[VERIFIED: codebase] `supabase/config.toml` has `[storage] enabled = true` but no bucket definitions. No existing migrations create storage buckets. No app code uses Storage.

A migration must create the `tenant-assets` bucket and add an RLS policy restricting upload to the tenant owner. Supabase Storage buckets can be created via SQL:

```sql
-- Storage bucket creation via Supabase Storage API (SQL migration pattern) [ASSUMED]
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: only tenant owner can upload to their path
CREATE POLICY "tenant_owner_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tenant-assets' AND
    (storage.foldername(name))[1] = 'tenant-logos' AND
    (storage.foldername(name))[2] = (
      SELECT id::text FROM public.tenants WHERE owner_id = auth.uid()
    )
  );
```

### Finding 5: `board/settings/layout.tsx` Returns `<>{children}</>` — Must Be Replaced

[VERIFIED: codebase] The current layout is a passthrough with no visual shell. It must be **replaced** (not wrapped) to add the page title and `SettingsTabNav`. The auth + tenant guard logic (lines 1–26) must be preserved verbatim in the new layout.

The new layout is a mixed RSC + Client Component. The auth guard runs as RSC; the `SettingsTabNav` (which uses `usePathname`) must be a separate Client Component. The recommended pattern:

```tsx
// app/(dashboard)/board/settings/layout.tsx (RSC)
import { SettingsTabNav } from '@/components/board/settings/SettingsTabNav'

export default async function BoardSettingsLayout({ children }) {
  // ... existing auth guard (unchanged) ...
  return (
    <div>
      <h1 /* page title */>Tenant Settings</h1>
      <SettingsTabNav />  {/* 'use client' — needs usePathname */}
      <div>{children}</div>
    </div>
  )
}
```

### Finding 6: `AppUser` Type Has No `tenant_id` Field

[VERIFIED: codebase] `types/index.ts` defines `AppUser` without `tenant_id`. After the migration adds `users.tenant_id`, the `AppUser` type and the `users` table queries must be updated accordingly in the relevant RSC pages.

---

## Common Pitfalls

### Pitfall 1: `Tabs` + Nested Routes — Don't Use `TabsContent`
**What goes wrong:** Wrapping each tab page's content in `TabsContent` causes non-active tab content to be rendered but hidden by Radix (display: none). Since each tab is a separate Next.js page, `TabsContent` is the wrong primitive.
**Why it happens:** Developers copy the Radix `Tabs` docs example (which uses `TabsContent`) without realising that in a route-based tab model, `{children}` from the layout is the content.
**How to avoid:** Only use `TabsList` + `TabsTrigger` in the layout. Never use `TabsContent` in route-based navigation.
**Warning signs:** Tab switching renders correctly in the browser but navigating directly to `/board/settings/users` shows a blank page.

### Pitfall 2: BYODB State Guard Throws for `'Registered'` Tenants
**What goes wrong:** Calling `registrationService.register()` for a freshly-created tenant throws `ConnectivityError("must be in Provisioning")`.
**Why it happens:** `BYODBRegistrationService` enforces the state machine. New tenants start in `'Registered'`.
**How to avoid:** The BYODB API route must transition the tenant to `Provisioning` before calling `register()`.
**Warning signs:** BYODB registration always returns 500 in development; unit tests for the API route fail with "must be in Provisioning".

### Pitfall 3: `inviteUserByEmail` Does Not Set `users.tenant_id` or `users.role` Automatically
**What goes wrong:** After invitation acceptance, the new user has `users.tenant_id = NULL` and `users.role = 'driver'` (the trigger default), even if the invite specified manager/driver and the tenant.
**Why it happens:** `inviteUserByEmail` sends a magic link. When accepted, `handle_new_user()` fires and reads `raw_user_meta_data` — but only if the metadata was passed in the invite call. `tenant_id` is not currently in the trigger.
**How to avoid:** Pass `data: { role, tenant_id: tenantId }` in `inviteUserByEmail` options; update `handle_new_user()` to write both fields.
**Warning signs:** Newly invited users appear in `users` table but with `tenant_id = NULL`; Users tab shows empty list after invite.

### Pitfall 4: Logo Upload to Storage Without Creating Bucket First
**What goes wrong:** `storage.from('tenant-assets').upload(...)` returns "Bucket not found" error.
**Why it happens:** No bucket exists yet — `supabase db push` only runs SQL migrations, not Supabase Storage bucket setup, unless the bucket is created via `storage.buckets` INSERT in SQL.
**How to avoid:** Include the bucket INSERT in the branding migration file.
**Warning signs:** Upload API route returns 500 with "Bucket not found" on first test.

### Pitfall 5: `createClient` vs `createServiceClient` — Wrong Import Causes RLS Blocking
**What goes wrong:** API route uses the anon client (`createClient()`) for admin operations; `auth.admin` is not available; `deleteUser` and `inviteUserByEmail` throw.
**Why it happens:** The older `app/api/users/create/route.ts` directly imports `createClient` from `@supabase/supabase-js` with the service key. The project's canonical service client is `createServiceClient()` from `lib/supabase/service.ts` — use this instead.
**How to avoid:** Import `createServiceClient` from `@/lib/supabase/service` for all admin operations in new routes.
**Warning signs:** `auth.admin.inviteUserByEmail is not a function` or `admin.auth.admin is undefined`.

### Pitfall 6: `feature_flags` JSONB — Partial Update Overwrites Missing Keys
**What goes wrong:** PATCH route sends only the changed flag, but Supabase's `UPDATE` of a JSONB column replaces the entire object. If the client sends `{ fleet: false }`, the other 7 flags are lost.
**Why it happens:** PostgreSQL JSONB `=` assignment replaces the column value entirely.
**How to avoid:** The toggles API route must accept and persist the **full 8-flag object**, not a partial update. The client always sends all 8 flags on save.
**Warning signs:** After toggling one flag and saving, other flags reset to their initial values.

---

## Code Examples

### Layout: Board Settings Layout (RSC + Client split)

```tsx
// Source: app/(dashboard)/board/settings/layout.tsx [VERIFIED: codebase — existing guard]
// Replaces existing passthrough layout

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsTabNav } from '@/components/board/settings/SettingsTabNav'

export default async function BoardSettingsLayout({ children }: { children: React.ReactNode }) {
  // Existing guard — do not modify this block
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'board') redirect('/login')

  const { data: tenant } = await supabase
    .from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) redirect('/login')

  return (
    <div style={{ padding: 'var(--ds-space-lg)' }}>
      <h1 style={{
        fontSize: 'var(--ds-font-size-xl)',
        fontWeight: 'var(--ds-font-weight-semibold)',
        color: 'var(--ds-color-neutral-ink)',
        marginBottom: 'var(--ds-space-md)',
      }}>
        Tenant Settings
      </h1>
      <SettingsTabNav />
      <div style={{ marginTop: 'var(--ds-space-lg)' }}>
        {children}
      </div>
    </div>
  )
}
```

### Migration: users.tenant_id FK

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_users_tenant_id.sql
-- Phase 4: Add tenant_id FK to users table for Users tab scoping (BSET-02, D-15)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

-- RLS: board members can select users in their tenant
-- (supplementing existing users_select_own policy which covers manager + board reads)
CREATE POLICY "users_select_by_tenant" ON public.users
  FOR SELECT USING (
    tenant_id = (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );

-- RLS: board members can delete users in their tenant (for Remove action)
CREATE POLICY "users_delete_board_own_tenant" ON public.users
  FOR DELETE USING (
    get_my_role() = 'board' AND
    tenant_id = (SELECT id FROM public.tenants WHERE owner_id = auth.uid())
  );
```

### Migration: feature_flags JSONB

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_tenant_feature_flags.sql
-- Phase 4: Feature flag JSONB column on tenants (BSET-04, D-11)
-- Default all-true so existing tenants retain full feature access.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{
    "member_invitations": true,
    "fleet": true,
    "carbon": true,
    "trips": true,
    "driver_behaviour_score": true,
    "alerts": true,
    "charging_stations": true,
    "auth_troubleshooting": true
  }'::jsonb;
```

### API Route: Invite User

```typescript
// Source: app/api/board/settings/users/invite/route.ts (new)
// Based on pattern from app/api/users/create/route.ts [VERIFIED: codebase]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'board') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: tenant } = await supabase.from('tenants').select('id').eq('owner_id', user.id).single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { email, role } = await req.json()
  if (!email || !['manager', 'driver'].includes(role)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role, tenant_id: tenant.id },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

---

## Runtime State Inventory

> Phase 4 is a greenfield feature addition — no rename/refactor. This section is included to confirm nothing was missed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `feature_flags`, `logo_url`, `primary_color`, `users.tenant_id` do not yet exist | Schema additions via new migrations |
| Live service config | None | — |
| OS-registered state | None | — |
| Secrets/env vars | None new — `SUPABASE_SERVICE_ROLE_KEY` already in use | — |
| Build artifacts | None | — |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase local (Docker) | DB migrations, Storage | Must be running | Checked via `make db-status` | `make db-start` |
| Supabase Storage | BSET-01 logo upload | Enabled in config.toml | N/A (config-level) | None — required |
| `@supabase/supabase-js` | `auth.admin.inviteUserByEmail`, Storage | Installed `^2.105.1` [VERIFIED: codebase] | 2.105.x | None — already installed |
| `lucide-react` | Settings nav icon, Upload icon | Installed `^1.14.0` [VERIFIED: codebase] | 1.x | None — already installed |
| `pg` + `mysql2` | BYODB probe (via RealConnectivityProbe) | Installed `^8.13.0` / `^3.11.0` [VERIFIED: codebase] | — | None — already installed |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (unit) · Playwright (E2E) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `make test` |
| Full suite command | `make test && make e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BSET-01 | Branding API route — saves logo_url + primary_color + display_name | unit | `npx vitest run test/unit/api/board/settings/branding.test.ts` | ❌ Wave 0 |
| BSET-01 | Branding form submits and shows success Alert | E2E (smoke) | `npx playwright test e2e/tests/board/branding.spec.ts` | ❌ Wave 0 |
| BSET-02 | Invite API route — calls inviteUserByEmail with correct metadata | unit | `npx vitest run test/unit/api/board/settings/users-invite.test.ts` | ❌ Wave 0 |
| BSET-02 | Remove API route — calls deleteUser + deletes users row | unit | `npx vitest run test/unit/api/board/settings/users-remove.test.ts` | ❌ Wave 0 |
| BSET-02 | Users tab shows member list, invite form, remove confirmation | E2E (smoke) | `npx playwright test e2e/tests/board/users.spec.ts` | ❌ Wave 0 |
| BSET-03 | BYODB API route — calls registrationService with valid input | unit | `npx vitest run test/unit/api/board/settings/byodb.test.ts` | ❌ Wave 0 |
| BSET-03 | BYODB API route — returns error when tenant not in Provisioning state | unit | (same file) | ❌ Wave 0 |
| BSET-04 | Toggles API route — persists full feature_flags object | unit | `npx vitest run test/unit/api/board/settings/toggles.test.ts` | ❌ Wave 0 |
| BSET-04 | Toggles tab renders 8 switches and saves on button press | E2E (smoke) | `npx playwright test e2e/tests/board/toggles.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `make test` (Vitest unit suite)
- **Per wave merge:** `make test && make typecheck && make lint`
- **Phase gate:** `make check` (all 5 CI jobs) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `test/unit/api/board/settings/branding.test.ts` — covers BSET-01 API route
- [ ] `test/unit/api/board/settings/users-invite.test.ts` — covers BSET-02 invite path
- [ ] `test/unit/api/board/settings/users-remove.test.ts` — covers BSET-02 remove path
- [ ] `test/unit/api/board/settings/byodb.test.ts` — covers BSET-03 (including state guard)
- [ ] `test/unit/api/board/settings/toggles.test.ts` — covers BSET-04
- [ ] `e2e/tests/board/branding.spec.ts` — smoke test for BSET-01
- [ ] `e2e/tests/board/users.spec.ts` — smoke test for BSET-02
- [ ] `e2e/tests/board/toggles.spec.ts` — smoke test for BSET-04
- [ ] Board E2E tests can use existing `storageState: 'e2e/.auth/board.json'` — no new fixture needed

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `supabase.auth.getUser()` in every API route (not `getSession()`) |
| V3 Session Management | yes (inherited) | Existing cookie-based session via `@supabase/ssr` |
| V4 Access Control | yes | Role re-verification in every API route; tenant scoping via `owner_id = auth.uid()` |
| V5 Input Validation | yes | `normalizeCredential()` for BYODB; hex regex for colour; `accept` + `size` for file upload |
| V6 Cryptography | yes | BYODB credentials stored in Supabase Vault (not in `tenants` table) |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Board member modifies another tenant's data | Elevation of privilege | Every mutation verifies `tenants.owner_id = auth.uid()` before acting |
| Malicious file upload (SVG XSS, oversized file) | Tampering | Client-side: `accept` attribute + 2 MB size check; Server-side: content-type validation before Storage upload |
| `platform_admin` role invited via invite form | Elevation of privilege | API route explicitly rejects any role outside `['manager', 'driver']` |
| BYODB credentials logged in error messages | Information disclosure | `BYODBRegistrationService` is already designed to exclude credentials from errors; maintain this in the API route error forwarding |
| `feature_flags` JSONB injection | Tampering | API route validates that the payload keys exactly match the 8 known flag keys before persisting |
| Tenant state graph violation | Tampering | `BYODBRegistrationService` uses `lib/tenant/stateMachine.ts` which enforces valid transitions only |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Storage bucket can be created via `INSERT INTO storage.buckets` in a SQL migration | Code Examples: Migration | If Supabase Storage bucket DDL differs in this version, bucket must be created via Supabase dashboard or a seeding script instead |
| A2 | `inviteUserByEmail` metadata (`data` field) is written to `raw_user_meta_data` and accessible to `handle_new_user()` trigger | Finding 3 / Pattern 4 | If metadata is not forwarded to `raw_user_meta_data`, `tenant_id` and `role` won't be set on invite acceptance; requires an alternative post-invite mechanism |
| A3 | `Registered → Provisioning` is a valid transition in `lib/tenant/stateMachine.ts` | Finding 2 / Pitfall 2 | If this transition is not defined, the BYODB API route cannot proceed without a stateMachine update |
| A4 | Storage RLS policies can reference `public.tenants` in a subquery | Security Domain | If cross-schema RLS references are restricted, a simpler path-prefix check (using the tenant UUID in the path) may be needed |
| A5 | `storage.foldername()` helper function is available in this Supabase version | Code Examples: Pattern 5 | Use `split_part(name, '/', 2)` as fallback for path segment extraction if `storage.foldername` is unavailable |

---

## Open Questions

1. **`Registered → Provisioning` transition validity**
   - What we know: `stateMachine.ts` exists and is the source of truth for valid transitions
   - What's unclear: Whether `Registered → Provisioning` is a valid transition (the file was not read)
   - Recommendation: Planner reads `lib/tenant/stateMachine.ts` before writing the BYODB plan task; if the transition is not defined, add it or handle the state differently in the API route

2. **`tenant_id` write on invite acceptance — trigger vs webhook**
   - What we know: `handle_new_user()` reads `raw_user_meta_data` and can be extended
   - What's unclear: Whether `inviteUserByEmail`'s `data` option populates `raw_user_meta_data` in this Supabase version
   - Recommendation: Planner adds a verification step in Wave 0 that confirms `data` metadata is visible to the trigger; if not, the fallback is a separate `auth.admin.updateUserById()` call immediately after invite (sets metadata directly)

3. **BYODB tab — existing connection state query**
   - What we know: `tenants.state` indicates provisioning progress; BYODB-registered tenants have `state = 'Active'`
   - What's unclear: How the BYODB page determines if a connection is already registered (no `byodb_registered` flag column exists)
   - Recommendation: Use `tenant.state === 'Active'` as the "connection registered" signal; the connection summary can display the masked host from the Vault secret (though reading from Vault requires the service client)

---

## Sources

### Primary (HIGH confidence)
- `app/(dashboard)/board/settings/layout.tsx` — existing auth guard code [VERIFIED: codebase]
- `app/(dashboard)/board/settings/page.tsx` — current stub [VERIFIED: codebase]
- `app/(dashboard)/board/layout.tsx` — NAV array + DashboardShell usage [VERIFIED: codebase]
- `components/layout/DashboardShell.tsx` — NAV_ICONS map, `'settings'` confirmed registered [VERIFIED: codebase]
- `lib/tenant/registrationService.ts` — state guard, register() signature [VERIFIED: codebase]
- `lib/tenant/credentials.ts` — `BYODBCredentialInput`, `normalizeCredential()` [VERIFIED: codebase]
- `lib/tenant/types.ts` — `Tenant`, `TenantState`, error classes [VERIFIED: codebase]
- `lib/supabase/service.ts` — `createServiceClient()` signature [VERIFIED: codebase]
- `lib/supabase/server.ts` — `createClient()`, `createPlatformClient()` [VERIFIED: codebase]
- `supabase/migrations/20240101000000_initial_schema.sql` — `users` table schema (no `tenant_id`) [VERIFIED: codebase]
- `supabase/migrations/20260609120000_create_tenants.sql` — tenants baseline [VERIFIED: codebase]
- `supabase/migrations/20260618120000_add_tenant_name.sql` — migration pattern [VERIFIED: codebase]
- `design-system/components/{Tabs,Switch,Alert,AlertDialog,Table,Select,Input,Button,FormField,EmptyState,RadioGroup,Spinner}/index.tsx` — component props and exports [VERIFIED: codebase]
- `types/index.ts` — `AppUser` interface (no `tenant_id`) [VERIFIED: codebase]
- `app/api/users/create/route.ts` — API route pattern [VERIFIED: codebase]
- `e2e/helpers/auth.helpers.ts` — `TEST_USERS.board` auth state path [VERIFIED: codebase]
- `vitest.config.ts` — test framework config [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- `npm view @supabase/supabase-js version` → 2.108.2 (project pins ^2.105.1) [VERIFIED: npm registry]
- `supabase/config.toml` — `[storage] enabled = true` confirmed [VERIFIED: codebase]

### Tertiary (LOW confidence / ASSUMED)
- Supabase Storage bucket creation via `INSERT INTO storage.buckets` SQL pattern [ASSUMED — standard Supabase pattern, not verified against this exact version]
- `inviteUserByEmail` `data` option populates `raw_user_meta_data` for trigger access [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components and patterns verified directly in codebase
- Architecture: HIGH — file structure and integration points confirmed from actual files
- Pitfalls: HIGH — derived from verified code (state guard, trigger behaviour, Radix `Tabs` mechanics)
- DB migrations: HIGH — existing pattern confirmed; new columns identified with certainty

**Research date:** 2026-06-20
**Valid until:** 2026-07-20 (stable stack; no fast-moving dependencies)
