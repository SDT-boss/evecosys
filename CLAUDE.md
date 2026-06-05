# CLAUDE.md

## Project Overview

EVEcosys — EV fleet management platform. Roles: manager, board member, driver. Stack: Next.js 16 + Supabase (auth + DB) + a shared design system (`@evecosys/design-system`).

## Tech Stack

- **App**: Next.js 16 (App Router), React 19, TypeScript
- **Auth & DB**: Supabase (PostgreSQL + RLS)
- **Design system**: Style Dictionary tokens → `design-system/tokens/variables.css`
- **Tests**: Vitest (unit) · Playwright (E2E)
- **Infra**: Docker · GitHub Container Registry · GitHub Actions

## Local Development

### First-time setup (requires Docker)

```bash
make setup          # installs deps, copies .env.example → .env.local, starts Supabase
# Fill in .env.local with the API URL + anon key printed by supabase start
make migrate        # apply DB migrations to local Supabase
make dev            # start Next.js dev server at http://localhost:3000
```

### Daily commands

```bash
make dev            # Next.js dev server
make test           # Vitest unit tests (run once)
make test-watch     # Vitest in watch mode
make lint           # ESLint
make typecheck      # tsc --noEmit
make tokens         # rebuild design tokens (run after editing tokens.json)
make e2e            # Playwright E2E (requires running app + staging Supabase)
make e2e-ui         # Playwright UI mode
make check          # run all CI checks locally before pushing
```

### Database

```bash
make db-start       # start local Supabase (Docker)
make db-stop        # stop local Supabase
make db-reset       # wipe and re-apply all migrations
make db-status      # print local Supabase URLs and keys
make migrate        # push pending migrations to local DB
```

### Docker (local production build)

```bash
make docker-build   # build the production Docker image using values from .env.local
make docker-run     # run it on port 3000
make docker-stop    # stop and remove the container
```

## Code Standards

- Use `var(--ds-*)` CSS custom properties for all colours, spacing, and radii — no hardcoded hex values or Tailwind hex utilities.
- Import components from `@evecosys/design-system`, never directly from their file paths.
- Write tests for new features. Unit tests in `test/`, E2E in `e2e/`.
- Every schema change must be a new file in `supabase/migrations/` — never edit existing migration files.
- Design token changes require updating both `DESIGN.md` (human record) and `design-system/tokens/tokens.json` (machine record) in the same commit. Run `make tokens` and commit the output.

## CI checks on every PR

Five parallel jobs — all must pass before merge:

| Job | What it checks |
|---|---|
| `lint` | ESLint + TypeScript |
| `test` | Vitest unit tests |
| `tokens` | Token pipeline builds + output matches committed files |
| `build` | `next build` compiles + standalone server starts and responds |
| `audit` | No high-severity npm vulnerabilities |
