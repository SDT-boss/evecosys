# Technology Stack

**Analysis Date:** 2026-06-13

## Languages

**Primary:**
- TypeScript 5.x - All application code (`app/`, `lib/`, `components/`, `e2e/`, `test/`)

**Secondary:**
- JavaScript - Config files (`postcss.config.mjs`, `eslint.config.mjs`, `design-system/style-dictionary.config.js`)

## Runtime

**Environment:**
- Node.js 22.15.0 (pinned via `.nvmrc`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present, committed)

## Frameworks

**Core:**
- Next.js ^16.2.7 (App Router) - Full-stack web framework; standalone output mode (`next.config.ts`)
- React 19.2.4 - UI rendering layer

**Testing:**
- Vitest ^4.1.8 - Unit test runner; config in `vitest.config.mts`; integration config in `vitest.integration.config.mts`
- Playwright ^1.60.0 - E2E browser tests; config in `playwright.config.ts`
- @testing-library/react ^14.3.1 - React component testing helpers
- @testing-library/user-event ^14.4.3 - User interaction simulation

**Build/Dev:**
- Tailwind CSS ^3.4.19 - Utility-first CSS; config in `tailwind.config.ts`
- PostCSS - CSS processing; config in `postcss.config.mjs`
- tailwindcss-animate ^1.0.7 - Animation plugin
- Storybook ^8.6.18 - Component development environment (`@storybook/nextjs`)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.105.1 - Supabase JS client (direct usage for service-role client)
- `@supabase/ssr` ^0.10.2 - Supabase SSR helpers for Next.js cookie-based session management (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- `server-only` ^0.0.1 - Prevents server-only modules from being imported in client bundles (enforced in `lib/supabase/service.ts`)

**UI Primitives:**
- `@radix-ui/*` (15 packages, ^1.x/^2.x) - Accessible, unstyled UI primitives (alert-dialog, avatar, checkbox, dialog, dropdown-menu, icons, label, popover, progress, radio-group, select, separator, slot, switch, tabs, tooltip)
- `lucide-react` ^1.14.0 - Icon library
- `class-variance-authority` ^0.7.1 - Variant-based component styling
- `clsx` ^2.1.1 - Conditional className utility
- `tailwind-merge` ^3.6.0 - Tailwind class merging utility
- `next-themes` ^0.4.6 - Dark mode / theme support

**Mapping:**
- `leaflet` ^1.9.4 - Interactive map rendering
- `react-leaflet` ^5.0.0 - React bindings for Leaflet
- `@types/leaflet` ^1.9.21 - TypeScript types

**Database Drivers (BYODB connectivity probing):**
- `pg` ^8.13.0 - PostgreSQL client; dynamically imported in `lib/tenant/probeDriver.ts`
- `mysql2` ^3.11.0 - MySQL client; dynamically imported in `lib/tenant/probeDriver.ts`

**External API:**
- `@linear/sdk` ^86.0.0 - Linear issue tracker SDK (`app/api/linear/me/route.ts`)

**Infrastructure:**
- `style-dictionary` ^3.9.2 - Design token pipeline; used inside `design-system/` workspace

## Design System

**Internal package:** `@evecosys/design-system` (workspace: `design-system/`)
- Entry point: `design-system/components/index.ts`
- Tokens source: `design-system/tokens/tokens.json`
- Build output: `dist/tokens/variables.css` and `dist/tokens/tokens.js`
- Pipeline: Style Dictionary ^3.9.2; config in `design-system/style-dictionary.config.js`
- CSS custom properties prefixed `--ds-*` consumed by the main app

**shadcn/ui:**
- Style: default; config in `components.json`
- Base color: neutral; CSS variable–driven theming
- Icon library: lucide

## Configuration

**Environment:**
- Variables defined in `.env.local` (not committed); template in `.env.example`
- Key vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- `NEXT_PUBLIC_*` vars are baked into the JS bundle at Docker build time via `ARG`/`ENV` in `Dockerfile`

**Build:**
- `next.config.ts` - Next.js config; `output: "standalone"` for Docker
- `tsconfig.json` - TypeScript strict mode; path alias `@/*` → project root
- `eslint.config.mjs` - ESLint with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`

## Workspaces

npm workspaces:
- `app` - (reserved workspace slot)
- `design-system` - `@evecosys/design-system` package

## Platform Requirements

**Development:**
- Node.js 22.15.0
- Docker (for local Supabase via `make db-start`)
- Supabase CLI (`supabase start`, `supabase db push`)

**Production:**
- Docker container; Node.js 20 Alpine (multi-stage `Dockerfile`)
- Deployed via SSH; images stored in GitHub Container Registry (`ghcr.io`)
- Container image scanned with Trivy (CRITICAL CVEs fail deploy)

---

*Stack analysis: 2026-06-13*
