# External Integrations

**Analysis Date:** 2026-06-13

## APIs & External Services

**Issue Tracking:**
- Linear - Internal developer tooling integration; fetches authenticated viewer info
  - SDK/Client: `@linear/sdk` ^86.0.0
  - Auth: `LINEAR_API_KEY` (env var; checked but not in `.env.example` — development/internal only)
  - Route: `app/api/linear/me/route.ts`

**Mapping:**
- Leaflet / OpenStreetMap (tile server) - Interactive map rendering for fleet vehicle locations
  - SDK/Client: `leaflet` ^1.9.4 + `react-leaflet` ^5.0.0
  - Auth: None (public tile CDN)
  - Usage: EV fleet map views

## Data Storage

**Databases:**
- Supabase (PostgreSQL 15) - Primary application database + auth + realtime
  - Local connection: `SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres`
  - Production connection: `SUPABASE_DB_URL` (GitHub Actions secret)
  - Client (browser): `createBrowserClient` from `@supabase/ssr` → `lib/supabase/client.ts`
  - Client (server): `createServerClient` from `@supabase/ssr` → `lib/supabase/server.ts`
  - Client (service-role): `createClient` from `@supabase/supabase-js` → `lib/supabase/service.ts`
  - RLS enforced; service-role client (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS — server-only
  - Schema managed via `supabase/migrations/` (4 migration files as of analysis date)
  - Local project ID: `jbwihixeierkitccbntm` (see `supabase/config.toml`)

**Tenant BYODB (Bring Your Own Database) — probed external databases:**
- PostgreSQL (arbitrary tenant-hosted) - Probed for reachability and schema ownership
  - Client: `pg` ^8.13.0 (dynamically imported in `lib/tenant/probeDriver.ts`)
  - Auth: per-tenant credentials stored in Supabase Vault
- MySQL (arbitrary tenant-hosted) - Probed for reachability and schema ownership
  - Client: `mysql2` ^3.11.0 (dynamically imported in `lib/tenant/probeDriver.ts`)
  - Auth: per-tenant credentials stored in Supabase Vault

**File Storage:**
- Supabase Storage - Enabled in local config (`supabase/config.toml`); no direct app-level usage detected in current codebase

**Caching:**
- None — no Redis, Memcached, or in-process cache layer detected

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Email/password authentication with JWT sessions
  - JWT expiry: 3600s (1 hour)
  - Session managed via HTTP-only cookies (SSR pattern using `@supabase/ssr`)
  - Auth guard: `lib/tenant/authGuard.ts`
  - Signup enabled; email confirmations disabled in local dev
  - Redirect URLs: `http://localhost:3000`, `https://localhost:3000`

**Role-Based Access:**
- Three application roles: `manager`, `driver`, `board`
- Route groups mirror roles: `app/(dashboard)/manager/`, `app/(dashboard)/driver/`, `app/(dashboard)/board/`
- RLS policies enforced at Postgres level (see migrations)

## Secret Storage

**Supabase Vault:**
- Tenant BYODB credentials (database passwords) stored via Supabase Vault
  - Store RPC: `store_byodb_secret(p_name, p_secret)` → returns `uuid`
  - Delete RPC: `delete_byodb_secret(p_secret_id)`
  - Implementation: `lib/tenant/vaultStore.ts` (`SupabaseVaultStore`)
  - Migration defining RPCs: `supabase/migrations/20260609130000_byodb_vault_rpc.sql`
  - Passwords are never included in logs or error messages

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, or similar)

**Logs:**
- Console logging only; no structured logging framework detected

**Security Scanning:**
- Trivy - Container image vulnerability scanning on every deploy (CRITICAL severity = deploy failure)
  - Used in `deploy-prod.yml` and `deploy-staging.yml` workflows

**Static Analysis:**
- GitHub CodeQL - Weekly + on every PR to `main`; scans JavaScript/TypeScript for security and quality issues
  - Config: `.github/workflows/codeql.yml`

## CI/CD & Deployment

**Hosting:**
- Self-hosted server(s) via SSH deploy (host/user/SSH key stored as GitHub Actions secrets)
- Two environments: `staging` and `production`
- Container registry: GitHub Container Registry (`ghcr.io`)

**CI Pipeline:**
- GitHub Actions
  - `ci.yml` - Triggered on PRs to `main`; 6 jobs: lint, test, tokens, build, audit, dependency-review
  - `e2e.yml` - Playwright E2E on PRs to `main` against staging Supabase
  - `codeql.yml` - Security analysis on PRs + weekly schedule
  - `deploy-staging.yml` - Triggered on push to `main`; migrate → build → push → deploy → E2E
  - `deploy-prod.yml` - Triggered on GitHub release publish or manual dispatch; migrate → build → push → deploy → smoke test → auto-rollback on failure
  - `design-tokens.yml` - Token pipeline CI
  - `claude.yml` - Claude AI integration (Linear connect extension)

**Dependency Auditing:**
- `npm audit --audit-level=high` on every PR (`ci.yml` audit job)
- `actions/dependency-review-action@v4` — fails on CRITICAL new dependencies in PRs

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Environment Configuration

**Required env vars (from `.env.example`):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project API URL (baked into bundle at build)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key (baked into bundle at build)
- `SUPABASE_SERVICE_ROLE_KEY` - Service-role key; server-only; bypasses RLS
- `SUPABASE_DB_URL` - Direct PostgreSQL connection for migrations

**E2E test vars (staging only):**
- `E2E_MANAGER_EMAIL`, `E2E_DRIVER_EMAIL`, `E2E_BOARD_EMAIL`, `E2E_TEST_PASSWORD`
- `PLAYWRIGHT_BASE_URL` - Override base URL for Playwright

**Secrets location:**
- Local: `.env.local` (gitignored)
- CI/Production: GitHub Actions environment secrets (`staging` and `production` environments)
- Production runtime: `/etc/evecosys/prod.env` on deploy host (referenced in deploy SSH script)
- Staging runtime: `/etc/evecosys/staging.env` on deploy host

---

*Integration audit: 2026-06-13*
