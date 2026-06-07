# Engineering Delivery Model

> Covers IaC strategy, CI/CD pipeline, environment promotion, and secret injection for EVEcosys.
> Owner: Platform · Last updated: 2026-06-05

---

## 1. IaC Stack and Repository Boundaries

### Stack decision

| Layer | Tool | Rationale |
|---|---|---|
| Database schema & migrations | Supabase CLI (`supabase/migrations/`) | Declarative SQL files, versioned and diffable; CLI handles apply/repair |
| App packaging | Docker (multi-stage, standalone Next.js) | Self-contained image; no hosting vendor lock-in |
| Image registry | GitHub Container Registry (`ghcr.io`) | Free for public/private repos; GITHUB_TOKEN auth, no extra credentials |
| App hosting | Self-hosted server (SSH + Docker) | Full control; no per-seat or per-deployment cost |
| Secrets storage | GitHub Environments + server `.env` files | CI tokens in GitHub; runtime secrets stored on server, never in CI logs |
| Future infra expansion | Terraform (not yet adopted) | Add when managing multiple servers or cloud resources programmatically |

Vercel has been removed as a cost-saving measure (EVE-100). Build verification that was previously provided by Vercel preview deploys is now replicated by the CI pipeline: the built standalone app is started in CI and health-checked before a PR can merge.

Terraform is deliberately deferred. The current surface (one GHCR registry + two Supabase projects + one server per environment) does not justify the overhead.

### Repository structure

```
evecosys/                       ← monorepo root
├── app/                        ← Next.js application
├── design-system/              ← @evecosys/design-system package
├── supabase/
│   ├── config.toml             ← Supabase CLI project config
│   └── migrations/             ← Versioned SQL migration files
│       └── YYYYMMDDHHMMSS_description.sql
├── .github/workflows/
│   ├── ci.yml                  ← PR quality gate (6 parallel jobs)
│   ├── e2e.yml                 ← PR E2E test suite (Playwright, staging env)
│   ├── codeql.yml              ← SAST scanning (PRs + weekly)
│   ├── deploy-staging.yml      ← main → staging (Trivy scan + deploy)
│   └── deploy-prod.yml         ← release/dispatch → production (Trivy scan + rollback)
└── .env.example                ← Required env var reference (no values)
```

### Migration workflow

All schema changes must be a new file in `supabase/migrations/`. Never edit existing migration files after they have been applied to any environment.

```bash
# Create a new migration
supabase migration new <description>

# Apply locally
supabase db push --local

# Apply to a remote project
supabase db push --db-url "$SUPABASE_DB_URL"

# Mark an already-applied migration as applied (for existing projects bootstrapping CLI)
supabase migration repair --status applied <timestamp>
```

The initial migration (`20240101000000_initial_schema.sql`) represents the schema that was manually applied before CLI adoption. On any existing Supabase project, mark it as applied rather than re-running it.

---

## 2. CI/CD Pipeline

### Stage overview

```
PR opened / updated
        │
        ▼
┌────────────────────────────────────────────────────┐
│  Stage 1 — Quality Gate (CI)                       │  ← ci.yml + e2e.yml
│  lint │ typecheck │ unit tests │ build check │      │
│  token drift │ dep audit │ Playwright E2E           │
│  All 6 jobs must pass before merge                 │
└────────────────────────────────────────────────────┘
        │  merge to main
        ▼
┌────────────────────────────────────────────────────┐
│  Stage 2 — Staging Deploy                          │  ← deploy-staging.yml
│  migrate (staging DB)                              │
│  → Docker build & push (ghcr.io)                   │
│  → SSH deploy to staging server                    │
│  → E2E suite against live staging URL              │
└────────────────────────────────────────────────────┘
        │  GitHub Release published
        │  OR manual workflow_dispatch
        ▼
┌────────────────────────────────────────────────────┐
│  Stage 3 — Production Deploy                       │  ← deploy-prod.yml
│  [approval gate — 1 reviewer]                      │
│  migrate (production DB)                           │
│  → Docker build & push (ghcr.io)                   │
│  → SSH deploy to production server                 │
└────────────────────────────────────────────────────┘
```

### Stage 1: Quality Gate

Runs on every PR targeting `main`. All jobs must pass before merge is allowed.

**`ci.yml` — 6 parallel jobs:**

| Job | Tool | Failure means |
|---|---|---|
| Lint & type check | ESLint + `tsc --noEmit` | Style violation or type error; fix and push |
| Unit tests | Vitest | Regression in component/logic layer |
| Design tokens | Style Dictionary + `git diff` | Token drift — run `make tokens` and commit output |
| Build & startup check | `next build` + `next start` | App would not compile or start; fix before merge |
| Dependency audit | `npm audit --audit-level=high` | High-severity vulnerability in dependency tree |
| Dependency review | `actions/dependency-review-action` | PR introduces a new high-severity CVE via package changes |

The build job uses placeholder Supabase credentials. It validates that the Next.js build graph is intact and the standalone server starts, not that the app connects to a real database.

**`e2e.yml` — Playwright E2E:**

| Step | What it does |
|---|---|
| Build app | `next build` with real staging Supabase credentials (baked into bundle) |
| Run Playwright | Full browser suite against `http://localhost:3000`; uses staging Supabase for data |
| Upload report | HTML report + traces uploaded as CI artifact on every run |

The E2E job uses the `staging` GitHub Environment for secrets. It runs against a locally built and started app, not the deployed staging server, which means it validates the code on the PR branch rather than what is already deployed.

**`codeql.yml` — SAST scanning:**

CodeQL runs on every PR to `main` and on a weekly schedule. It analyzes JavaScript/TypeScript for security vulnerabilities (XSS, injection, path traversal) and quality issues using the `security-and-quality` query suite. Findings appear in the GitHub Security tab.

### Stage 2: Staging Deploy

Runs automatically on every merge to `main`. Uses the `staging` GitHub Environment.

Jobs run sequentially: migrations must succeed before the image is built, and the image must be pushed before the server pulls it. A broken migration never leaves the app and database in a split state.

After the image is pushed to GHCR, Trivy scans it for CRITICAL CVEs before deployment. A critical finding blocks the deploy. Known accepted findings can be suppressed in `.trivyignore` at the repo root with a documented rationale.

### Stage 3: Production Deploy

Triggered by publishing a GitHub Release (the canonical promotion path) or via `workflow_dispatch` (for emergency fixes).

Uses the `production` GitHub Environment, which is configured with **required reviewers** in GitHub settings. The deployment will not start until at least one designated reviewer approves the run. This is the only manual gate in the pipeline.

After the image is pushed to GHCR, Trivy scans it for CRITICAL CVEs before deployment. A critical finding blocks the deploy. Known accepted findings can be suppressed in `.trivyignore` at the repo root with a documented rationale.

### Rollback

| What broke | Rollback path |
|---|---|
| App regression (no DB change) | **Automated:** if the production smoke test fails immediately after deploy, the `rollback` job in `deploy-prod.yml` fires automatically, SSHes in, and restores the previous container image from `/etc/evecosys/prev_image.txt`. **Manual fallback:** `docker stop evecosys-prod && docker run ... <previous-image>` on the server. |
| App + migration | Create a new forward migration that reverses the schema change, then redeploy. Never `DROP` without a migration file. |
| Bad staging deploy | Push a revert commit to `main`; staging redeploys automatically. |

The automated rollback fires when: (1) the `deploy` job succeeded, AND (2) the `smoke` job fails. It reads the previous image tag saved to `/etc/evecosys/prev_image.txt` by the deploy step before the container swap. If no previous tag is recorded (first-ever deploy), it exits with an error and requires manual intervention.

---

## 3. Environment Strategy

### Environments

| Environment | Purpose | Supabase project | App server | Who accesses |
|---|---|---|---|---|
| `local` | Developer workstation | `supabase start` (Docker) | `next dev` on localhost | Individual engineers |
| `staging` | Integration testing; QA; design review | Dedicated staging project | Docker container on staging server | Team + stakeholders |
| `production` | Live system | Dedicated production project | Docker container on production server | End users |

### Local development

```bash
# Start Supabase locally (requires Docker)
npx supabase start

# Apply migrations to local DB
npx supabase db push --local

# Start the Next.js dev server
npm run dev
```

Copy `.env.example` to `.env.local` and fill in values from `supabase start` output.

### Staging

Staging is a permanent shared environment, not ephemeral. It receives every merge to `main` automatically. This means:

- Staging always reflects what `main` looked like after the last successful deploy.
- Staging DB schema is always ahead of or equal to production.
- Do not use staging DB for production data; seed it with test fixtures.

### Production

Production is promoted explicitly via GitHub Release. The intent is that releases are cut on a cadence (e.g., weekly), not on every commit. Emergency fixes use `workflow_dispatch`.

### Tenant isolation

EVEcosys uses **RLS-based multi-tenancy** within a single Supabase project. Each fleet organisation is isolated at the data layer via Row Level Security policies (see `supabase/migrations/20240101000000_initial_schema.sql`). Separate Supabase projects per tenant are not used at current scale.

If enterprise tenants require full data isolation (regulatory or contractual), the path is:
1. Provision a dedicated Supabase project per tenant.
2. Use the Supabase Terraform provider to replicate the schema automatically.
3. Store the per-tenant `SUPABASE_DB_URL` in a secrets manager (e.g., Vault or AWS Secrets Manager) keyed by tenant ID.
4. Add a tenant-routing layer to the app that selects the correct Supabase client at request time.

This is not built yet. It is the documented escalation path.

---

## 4. Secret Injection and Runtime Configuration

### Principle: secrets never touch source control

`.env.local` is gitignored. `.env.example` documents required variables with no values. Secrets flow from GitHub → CI runtime → Vercel/Supabase, never the other way.

### Secret inventory

| Secret | Where stored | Used by | Scope |
|---|---|---|---|
| `SUPABASE_DB_URL` | GitHub Environment (staging / production) | Migration job in CI | Short-lived CI runner only |
| `SUPABASE_URL` | GitHub Environment (staging / production) | Docker build args + E2E job | Baked into JS bundle at image build time |
| `SUPABASE_ANON_KEY` | GitHub Environment (staging / production) | Docker build args + E2E job | Baked into JS bundle at image build time |
| `SUPABASE_SERVICE_ROLE_KEY` | Server env file (`/etc/evecosys/*.env`) + staging GitHub Environment | Next.js server at runtime; E2E admin operations | Never baked into image |
| `NEXT_PUBLIC_SUPABASE_URL` | Server env file | Runtime env (redundant with build-arg; kept for SSR path) | Same value as build arg |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Server env file | Runtime env | Same value as build arg |
| `DEPLOY_HOST` | GitHub Environment (staging / production) | SSH deploy job | IP or hostname of target server |
| `DEPLOY_USER` | GitHub Environment (staging / production) | SSH deploy job | SSH user on target server |
| `DEPLOY_SSH_KEY` | GitHub Environment (staging / production) | SSH deploy job | Private key; rotated quarterly |
| `STAGING_URL` / `PROD_URL` | GitHub Environment | Post-deploy E2E job in `deploy-staging.yml` | Base URL of the deployed environment |
| `E2E_MANAGER_EMAIL` | GitHub Environment (staging) | Playwright E2E suite | Test account; no production data access |
| `E2E_DRIVER_EMAIL` | GitHub Environment (staging) | Playwright E2E suite | Test account |
| `E2E_BOARD_EMAIL` | GitHub Environment (staging) | Playwright E2E suite | Test account |
| `E2E_TEST_PASSWORD` | GitHub Environment (staging) | Playwright E2E suite | Shared password for all three test accounts |

### How to set up GitHub Environments

1. Go to **Settings → Environments** in the GitHub repository.
2. Create `staging` environment: no protection rules.
3. Create `production` environment: add required reviewers (suggest 1 senior engineer or tech lead).
4. Add the secrets from the table above to each environment.

### Server env files

Each server needs two files created once by an operator:

**`/etc/evecosys/staging.env`** and **`/etc/evecosys/prod.env`**:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

These files are owned by root, mode `0600`. The deploy user does not need read access — Docker mounts them at container start via `--env-file`. Never commit these files or log their contents.

Never use `NEXT_PUBLIC_` prefix for secrets. Any variable with that prefix is embedded in the JavaScript bundle and visible to all users.

---

## 5. Required Policy Checks

The following checks are enforced and block merge or deployment if they fail.

### Code quality (enforced at PR via CI)

| Check | Tool | Config |
|---|---|---|
| Linting | ESLint | `eslint.config.mjs` |
| Type safety | TypeScript strict | `tsconfig.json` |
| Unit tests | Vitest | `vitest.config.mts` — all tests must pass; `e2e/**` excluded |
| Build integrity | `next build` | Must exit 0 with placeholder credentials |

### Infrastructure (enforced at deploy time)

| Check | When | Failure action |
|---|---|---|
| Migration dry-run | Before `supabase db push` (future: add `--dry-run` flag) | Block deploy |
| Container scan (Trivy) | After image push, before SSH deploy (staging + production) | Block deploy on CRITICAL CVEs |
| Staging smoke test | After staging deploy | Block production promotion |
| Production smoke test | After production deploy | Triggers automated rollback; alerts on-call |

### Branch protection (configure in GitHub)

- `main` requires: passing CI + at least 1 approving review.
- Direct pushes to `main` are blocked.
- Force-pushes to `main` are blocked.

### Deployment identity

- The `DEPLOY_SSH_KEY` must belong to a **dedicated deploy keypair** (not a personal key), with the public key authorised only on the deploy user's account on the server.
- The `SUPABASE_DB_URL` should use a **least-privilege database user** that can only run migrations (not SELECT/INSERT on application tables).
- Rotate the deploy key and database URL quarterly. Use GitHub's secret scanning to detect accidental exposure.

---

## 6. Dependencies and Risk Notes

### Dependencies

- Deployment target: this model assumes a self-hosted server reachable via SSH. If the target changes to a managed platform (AWS ECS, GCP Cloud Run, etc.), only the deploy job in `deploy-staging.yml` and `deploy-prod.yml` changes — the build, migration, and CI layers remain unchanged.
- Domain/DNS: production URL must be configured in Supabase Auth (Site URL + Redirect URLs) and in `supabase/config.toml` `site_url` before going live.
- OIDC federation (future): replace long-lived `DEPLOY_SSH_KEY` with ephemeral OIDC-based credentials for keyless, time-bounded deployments.

### Risk: ad hoc deployments

Any deployment made outside this pipeline (e.g., direct `docker run` on the server) bypasses the migration gate and quality checks. Mitigate by:
1. Restricting server SSH access to the CI deploy key only — no interactive logins to the deploy user.
2. Using a dedicated machine account as the sole GHCR push identity (`GITHUB_TOKEN` is sufficient; no personal access tokens).
3. Auditing the server's Docker history periodically: `docker ps -a --format "{{.Names}} {{.Image}} {{.CreatedAt}}"` to detect out-of-band deploys.

### Risk: migration conflicts

Two branches modifying the same table concurrently will produce migration files with different timestamps that cannot be merged automatically. Mitigate by:
1. Coordinating schema changes in sprint planning.
2. Using sequential (not parallel) migration application in staging.
3. Requiring a migration review in the PR if a migration file is changed.
