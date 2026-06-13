# Codebase Structure
<!-- mapped: 2026-06-13 -->

**Analysis Date:** 2026-06-13

## Directory Layout

```
evecosys/
├── app/                        # Next.js 16 App Router root
│   ├── (auth)/                 # Unauthenticated route group
│   │   ├── login/page.tsx      # Sign-in form (Client Component)
│   │   ├── signup/page.tsx     # Self-registration form
│   │   ├── forgot-password/    # Email reset request
│   │   └── reset-password/     # Password reset with token
│   ├── (dashboard)/            # Authenticated role-gated route group
│   │   ├── manager/            # Manager role — full fleet management
│   │   │   ├── layout.tsx      # Auth guard + nav for manager
│   │   │   ├── page.tsx        # Fleet overview dashboard (Server Component)
│   │   │   ├── assets/         # Asset management (vehicles)
│   │   │   ├── drivers/        # Driver management
│   │   │   ├── trips/          # Trip history
│   │   │   ├── charging/       # Charging stations
│   │   │   ├── alerts/         # Alert management
│   │   │   └── users/          # User management
│   │   ├── board/              # Board member role — analytics & reports
│   │   │   ├── layout.tsx      # Auth guard + nav for board
│   │   │   ├── page.tsx        # Executive overview
│   │   │   ├── fleet/          # Fleet status view
│   │   │   ├── carbon/         # Carbon footprint reports
│   │   │   └── trips/          # Trip analytics
│   │   └── driver/             # Driver role — personal vehicle & trips
│   │       ├── layout.tsx      # Auth guard + nav for driver
│   │       ├── page.tsx        # My vehicle view
│   │       ├── trips/          # My trip history
│   │       └── alerts/         # My alerts
│   ├── (ds-preview)/           # Design system preview route (dev only)
│   │   └── ds-preview/         # Component gallery
│   ├── api/                    # Next.js Route Handlers (mutations)
│   │   ├── alerts/resolve/     # POST — resolve an alert
│   │   ├── charging/toggle/    # PATCH — toggle charging station active state
│   │   ├── linear/me/          # GET — Linear API proxy
│   │   ├── users/create/       # POST — admin user creation (manager only)
│   │   └── vehicles/assign/    # PATCH — assign vehicle to driver
│   ├── components/ui/          # App-local shadcn UI primitives (legacy, avoid)
│   ├── layout.tsx              # Root layout — ThemeProvider + fonts + token CSS
│   ├── page.tsx                # Root page — redirects to /login
│   └── globals.css             # Global CSS reset + CSS custom property themes
├── components/                 # Shared React components
│   ├── layout/                 # App shell components
│   │   ├── DashboardShell.tsx  # Topbar + horizontal nav + content wrapper
│   │   ├── AlertBellWrapper.tsx
│   │   └── ThemeProvider.tsx
│   ├── auth/                   # Auth-specific components
│   ├── manager/                # Manager-specific components
│   ├── board/                  # Board-specific components
│   ├── driver/                 # Driver-specific components
│   └── ui/                     # App-level UI primitives (Badge, ThemeToggle, Logo)
├── design-system/              # @evecosys/design-system package source
│   ├── components/             # Tokenised component primitives (PascalCase dirs)
│   │   ├── Alert/
│   │   ├── AlertDialog/
│   │   ├── Avatar/
│   │   ├── Badge/
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── Checkbox/
│   │   ├── Dialog/
│   │   ├── DropdownMenu/
│   │   ├── EmptyState/
│   │   ├── FormField/
│   │   ├── Input/
│   │   ├── Label/
│   │   ├── NavigationItem/
│   │   ├── OnboardingCard/
│   │   ├── Progress/
│   │   ├── RadioGroup/
│   │   ├── Select/
│   │   ├── Separator/
│   │   ├── Skeleton/
│   │   ├── Spinner/
│   │   ├── StatCard/
│   │   ├── Switch/
│   │   ├── Table/
│   │   ├── Tabs/
│   │   ├── Textarea/
│   │   └── Tooltip/
│   ├── tokens/                 # Style Dictionary source (tokens.json)
│   └── stories/                # Storybook stories
├── dist/                       # Build output — generated, committed
│   └── tokens/variables.css    # Compiled CSS custom properties
├── lib/                        # Framework-independent logic
│   ├── supabase/               # Supabase client factory functions
│   │   ├── client.ts           # Browser client (anon key + RLS)
│   │   ├── server.ts           # Server client (cookie session + RLS)
│   │   └── service.ts          # Service role client (bypasses RLS, server-only)
│   ├── tenant/                 # Tenant provisioning domain (ports & adapters)
│   │   ├── types.ts            # Domain types + error classes
│   │   ├── stateMachine.ts     # Pure state transition logic
│   │   ├── credentials.ts      # BYODB credential validation + normalisation
│   │   ├── probe.ts            # ConnectivityProbe interface
│   │   ├── probeDriver.ts      # RealConnectivityProbe (pg + mysql2)
│   │   ├── vault.ts            # VaultStore interface
│   │   ├── vaultStore.ts       # SupabaseVaultStore (Vault RPCs)
│   │   └── registrationService.ts  # BYODB registration orchestrator
│   ├── behaviorScore.ts        # Pure driver behavior score calculator
│   ├── fleetHealth.ts          # Pure fleet health score calculator
│   └── utils.ts                # cn() (clsx + tailwind-merge)
├── types/                      # Global TypeScript types
│   ├── index.ts                # AppUser, Vehicle, Driver, Trip, Alert, etc.
│   └── images.d.ts             # Image module declarations
├── supabase/                   # Supabase local dev config + migrations
│   ├── migrations/             # Sequential SQL migration files (never edit existing)
│   └── snippets/               # Reusable SQL snippets
├── test/                       # Vitest unit + integration tests
│   ├── unit/                   # Unit tests (mirror of source structure)
│   │   ├── api/                # API route handler tests
│   │   ├── auth/               # Auth flow tests
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   └── design-system/
│   │   └── lib/
│   │       └── tenant/         # Tenant domain unit tests
│   ├── integration/            # Integration tests (real DB via local Supabase)
│   ├── __mocks__/              # Manual Vitest mocks
│   └── utils/                  # Test utility helpers
├── e2e/                        # Playwright E2E tests
│   ├── tests/                  # Test suites by feature
│   │   ├── auth/
│   │   ├── auth-guards/
│   │   ├── design-system/
│   │   ├── driver/
│   │   └── manager/
│   ├── fixtures/               # Playwright fixtures (test.extend)
│   ├── helpers/                # E2E helper utilities
│   ├── page-objects/           # Page Object Model classes
│   ├── test-data/              # Factories and static test data
│   └── .auth/                  # Saved auth states (gitignored)
├── docs/                       # Project documentation
├── scripts/                    # Build / utility scripts
├── public/                     # Static assets
├── vscode-extension/           # VS Code extension (companion tooling)
├── .github/workflows/          # GitHub Actions CI pipeline
├── .storybook/                 # Storybook configuration
├── .planning/                  # GSD planning artifacts
│   └── codebase/               # Codebase map documents (this directory)
├── next.config.ts              # Next.js config — standalone output, CSP headers, redirects
├── tsconfig.json               # TypeScript config — strict mode, @/* path alias
├── tailwind.config.ts          # Tailwind CSS config
├── vitest.config.mts           # Vitest unit test config
├── playwright.config.ts        # Playwright E2E config
├── components.json             # shadcn/ui config
├── Makefile                    # Developer task runner
├── Dockerfile                  # Production container (standalone Next.js)
└── supabase-schema.sql         # Reference schema snapshot
```

## Directory Purposes

| Directory | Purpose | Key constraint |
|-----------|---------|----------------|
| `app/` | All Next.js routes — pages, layouts, API handlers | Route groups enforce auth at layout level |
| `components/` | Shared React components used by multiple pages | Feature components are role-namespaced |
| `design-system/` | Source of `@evecosys/design-system` | Use `var(--ds-*)` tokens exclusively — no hardcoded hex |
| `lib/` | Framework-independent logic and Supabase client factories | `lib/tenant/` must not import from Next.js or app-level modules |
| `types/` | Canonical TypeScript domain types | Single source of truth; shared across app, API, and tests |
| `supabase/` | Local Supabase config and migration history | Never edit existing migration files |
| `test/` | Vitest unit and integration tests | Structure mirrors source |
| `e2e/` | Playwright E2E tests | Browser-requiring user journeys only — not RLS testing |
| `dist/` | Compiled design token CSS | Generated (make tokens), committed for import without build step |

## Naming Conventions

**Files:**
- Pages and layouts: `page.tsx`, `layout.tsx` (Next.js convention)
- API handlers: `route.ts` (Next.js convention)
- Design system components: `PascalCase/index.tsx` (e.g., `Button/index.tsx`)
- App components: camelCase file in PascalCase-named file (e.g., `Badge.tsx`)
- Library modules: camelCase (e.g., `stateMachine.ts`, `vaultStore.ts`)
- Tests: mirror source path with `.test.ts` / `.test.tsx` suffix

**Directories:**
- Route groups: lowercase with parentheses — `(auth)`, `(dashboard)`
- Role sections: lowercase — `manager/`, `board/`, `driver/`
- Design system components: PascalCase — `Button/`, `Badge/`
- Feature components: camelCase — `layout/`, `auth/`

## Where to Add New Code

**New dashboard page for an existing role (e.g., manager):**
```
app/(dashboard)/manager/{feature}/page.tsx   # Server Component page
components/manager/{FeatureName}.tsx         # Feature component
test/unit/components/{FeatureName}.test.tsx  # Unit test
```
Add nav item in `app/(dashboard)/manager/layout.tsx` (NAV array).

**New API mutation endpoint:**
```
app/api/{resource}/{action}/route.ts         # Route handler
test/unit/api/{resource}-{action}.test.ts    # Unit test
```
Pattern: verify session with `lib/supabase/server.ts`, check role, perform operation.

**New domain / business logic:**
```
lib/{moduleName}.ts                          # Pure logic
lib/tenant/{moduleName}.ts                   # Tenant-specific
test/unit/lib/{moduleName}.test.ts           # Unit test
```

**New design system component:**
```
design-system/components/{ComponentName}/index.tsx
design-system/stories/{ComponentName}.stories.tsx
```
Use `var(--ds-*)` tokens exclusively. Export from the package index.

**New database schema change:**
```
supabase/migrations/{timestamp}_{description}.sql
```
Never edit existing migration files.

## Special Directories

| Directory | Generated? | Committed? | Notes |
|-----------|-----------|-----------|-------|
| `dist/` | Yes (`make tokens`) | Yes | Required for `app/layout.tsx` import |
| `.next/` | Yes (Next.js) | No | Build cache |
| `e2e/.auth/` | Yes (Playwright setup) | No | Per-role auth states |
| `.planning/` | Partially | Yes | GSD artifacts |

---
*Structure analysis: 2026-06-13*
