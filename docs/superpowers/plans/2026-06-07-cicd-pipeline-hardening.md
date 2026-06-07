# CI/CD Pipeline Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the security and reliability gaps in the existing GitHub Actions CI/CD pipeline: fix a wrong environment on E2E, add automated production rollback, add SAST/container/dependency scanning, and update docs to match reality.

**Architecture:** All changes are to `.github/workflows/` YAML files and `docs/DELIVERY.md`. No application code changes. The pipeline uses GitHub Environments for secret scoping, GHCR for image hosting, and SSH for deployment. Bugs found: (1) `e2e.yml` uses `environment: production` but should use `staging`; (2) the `smoke` job in `deploy-prod.yml` uses `secrets.PROD_URL` without declaring its environment, so the secret resolves to empty string and smoke tests silently pass on a bad deploy.

**Tech Stack:** GitHub Actions, Docker/GHCR, aquasecurity/trivy-action, github/codeql-action, actions/dependency-review-action, appleboy/ssh-action

---

## File Map

| File | Action | What changes |
|---|---|---|
| `.github/workflows/e2e.yml` | Modify line 16 | `environment: production` → `environment: staging` |
| `.github/workflows/deploy-prod.yml` | Modify smoke job | Add `environment: production` to smoke job |
| `.github/workflows/deploy-prod.yml` | Modify deploy + add rollback job | Save prev image in deploy; add rollback job that fires on smoke failure |
| `.github/workflows/codeql.yml` | Create | SAST scanning for JS/TS on PRs + weekly schedule |
| `.github/workflows/deploy-staging.yml` | Modify build-and-push | Add Trivy scan step after image push |
| `.github/workflows/deploy-prod.yml` | Modify build-and-push | Add Trivy scan step after image push |
| `.github/workflows/ci.yml` | Modify | Add dependency-review job |
| `docs/DELIVERY.md` | Modify | Update repo structure, CI table, rollback section, e2e note |

---

## Task 1: Fix E2E Workflow — Change `environment: production` to `environment: staging`

**Context:** `e2e.yml` runs Playwright against a locally-built app using Supabase staging credentials. The job incorrectly declares `environment: production`. This exposes production secrets (including `SUPABASE_SERVICE_ROLE_KEY`) to every PR runner, and contradicts `docs/DELIVERY.md` which says "The E2E job uses the `staging` GitHub Environment for secrets."

**Files:**
- Modify: `.github/workflows/e2e.yml:16`

- [ ] **Step 1: Validate current YAML parses cleanly**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/e2e.yml'))" && echo "OK"
```
Expected: `OK`

- [ ] **Step 2: Apply the fix**

In `.github/workflows/e2e.yml`, find the `e2e` job block that currently reads:

```yaml
  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    environment: production
    timeout-minutes: 25
```

Change `environment: production` to `environment: staging`:

```yaml
  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    environment: staging
    timeout-minutes: 25
```

- [ ] **Step 3: Validate YAML syntax after edit**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/e2e.yml'))" && echo "OK"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/e2e.yml
git commit -m "fix(ci): use staging environment for PR E2E tests

Production secrets were being exposed to all PR runners. E2E tests
run against a locally-built app with staging Supabase credentials —
they have no business touching the production environment.
"
```

---

## Task 2: Fix Production Smoke Test — Add Missing Environment Declaration

**Context:** The `smoke` job in `deploy-prod.yml` uses `secrets.PROD_URL` to find the production URL for health-checking. But the job has no `environment: production` declaration. GitHub only makes environment secrets available to jobs that declare the environment. Without it, `secrets.PROD_URL` resolves to empty string, the `curl` receives an empty URL, and smoke tests silently pass without checking anything.

**Files:**
- Modify: `.github/workflows/deploy-prod.yml` (smoke job, around line 118)

- [ ] **Step 1: Validate current YAML parses cleanly**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-prod.yml'))" && echo "OK"
```
Expected: `OK`

- [ ] **Step 2: Apply the fix**

Find the `smoke` job in `.github/workflows/deploy-prod.yml`:

```yaml
  smoke:
    name: Smoke test (production)
    runs-on: ubuntu-latest
    needs: deploy
    timeout-minutes: 5
```

Add `environment: production`:

```yaml
  smoke:
    name: Smoke test (production)
    runs-on: ubuntu-latest
    environment: production
    needs: deploy
    timeout-minutes: 5
```

- [ ] **Step 3: Validate YAML syntax after edit**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-prod.yml'))" && echo "OK"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-prod.yml
git commit -m "fix(ci): add missing environment declaration to production smoke job

Without environment: production, secrets.PROD_URL resolves to empty
string, causing curl to silently pass smoke tests without hitting
the actual production URL.
"
```

---

## Task 3: Add Automated Rollback on Production Smoke Failure

**Context:** Currently, `docs/DELIVERY.md` documents rollback as a manual process. The goal is to automate it: when the production smoke test fails, the pipeline should automatically SSH in and restore the previous container image. 

The approach: at the start of the `deploy` job's SSH script, save the current running image tag to `/etc/evecosys/prev_image.txt` on the server before swapping containers. A new `rollback` job then reads that file if `smoke` fails.

**Files:**
- Modify: `.github/workflows/deploy-prod.yml` (deploy job SSH script + new rollback job at the end)

- [ ] **Step 1: Read the current deploy job SSH script**

The current `deploy` job SSH script in `deploy-prod.yml` is:

```bash
docker pull ghcr.io/${{ github.repository }}:${{ steps.tag.outputs.value }}
docker stop evecosys-prod 2>/dev/null || true
docker rm   evecosys-prod 2>/dev/null || true
docker run -d \
  --name evecosys-prod \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /etc/evecosys/prod.env \
  ghcr.io/${{ github.repository }}:${{ steps.tag.outputs.value }}
docker image prune -f
```

- [ ] **Step 2: Update the deploy job SSH script to save previous image before stopping**

Replace the `script:` block in the `deploy` job's SSH step with:

```yaml
          script: |
            PREV=$(docker inspect evecosys-prod --format='{{.Config.Image}}' 2>/dev/null || echo "")
            echo "$PREV" > /etc/evecosys/prev_image.txt
            docker pull ghcr.io/${{ github.repository }}:${{ steps.tag.outputs.value }}
            docker stop evecosys-prod 2>/dev/null || true
            docker rm   evecosys-prod 2>/dev/null || true
            docker run -d \
              --name evecosys-prod \
              --restart unless-stopped \
              -p 3000:3000 \
              --env-file /etc/evecosys/prod.env \
              ghcr.io/${{ github.repository }}:${{ steps.tag.outputs.value }}
            docker image prune -f
```

- [ ] **Step 3: Add rollback job at the end of `deploy-prod.yml`**

Append the following job after the `smoke` job at the end of `.github/workflows/deploy-prod.yml`:

```yaml
  rollback:
    name: Rollback (smoke failed)
    runs-on: ubuntu-latest
    environment: production
    needs: [deploy, smoke]
    if: needs.smoke.result == 'failure' && needs.deploy.result == 'success'
    timeout-minutes: 10

    steps:
      - name: Roll back to previous image
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            PREV=$(cat /etc/evecosys/prev_image.txt 2>/dev/null || echo "")
            if [ -z "$PREV" ]; then
              echo "No previous image recorded — manual rollback required"
              exit 1
            fi
            echo "Rolling back to: $PREV"
            docker stop evecosys-prod 2>/dev/null || true
            docker rm   evecosys-prod 2>/dev/null || true
            docker run -d \
              --name evecosys-prod \
              --restart unless-stopped \
              -p 3000:3000 \
              --env-file /etc/evecosys/prod.env \
              "$PREV"
            echo "Rollback complete"
```

- [ ] **Step 4: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-prod.yml'))" && echo "OK"
```
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy-prod.yml
git commit -m "feat(ci): add automated production rollback on smoke failure

When the production smoke test fails after a deploy, the pipeline now
SSHes in and restores the previous container image recorded in
/etc/evecosys/prev_image.txt. The rollback job only runs when deploy
succeeded (there is something to roll back to) and smoke failed.
"
```

---

## Task 4: Create CodeQL SAST Workflow

**Context:** The pipeline has no static analysis security testing. CodeQL can find security vulnerabilities in JavaScript/TypeScript (SQL injection, XSS, path traversal, insecure deserialization, etc.) before code merges. It runs on PRs and weekly to catch new CVEs in unchanged code.

**Files:**
- Create: `.github/workflows/codeql.yml`

- [ ] **Step 1: Create the CodeQL workflow**

Create `.github/workflows/codeql.yml` with this content:

```yaml
name: CodeQL

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday at midnight UTC

concurrency:
  group: codeql-${{ github.ref }}
  cancel-in-progress: true

jobs:
  analyze:
    name: Analyze (JavaScript / TypeScript)
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      actions: read
      contents: read
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-and-quality

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: /language:javascript-typescript
```

- [ ] **Step 2: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/codeql.yml'))" && echo "OK"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/codeql.yml
git commit -m "feat(ci): add CodeQL SAST scanning for JavaScript/TypeScript

Runs on every PR to main and weekly (Sunday UTC). Analyzes the
codebase for security vulnerabilities (XSS, injection, path
traversal) and quality issues using the security-and-quality query
suite. Findings are posted to GitHub's Security tab.
"
```

---

## Task 5: Add Trivy Container Image Scanning to Deploy Workflows

**Context:** After building and pushing Docker images, the pipeline should scan them for OS and library CVEs before deploying. Critical vulnerabilities block the deploy. Known unfixable findings in the base image can be suppressed using a `.trivyignore` file at the repo root.

**Files:**
- Modify: `.github/workflows/deploy-staging.yml` (build-and-push job)
- Modify: `.github/workflows/deploy-prod.yml` (build-and-push job)

- [ ] **Step 1: Add Trivy scan to staging `build-and-push` job**

In `.github/workflows/deploy-staging.yml`, find the `build-and-push` job. After the `Build and push image` step, add:

```yaml
      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:staging
          format: table
          exit-code: '1'
          vuln-type: os,library
          severity: CRITICAL
          trivyignores: .trivyignore
```

The full `build-and-push` job steps section after the change:

```yaml
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:staging
          build-args: |
            NEXT_PUBLIC_SUPABASE_URL=${{ secrets.SUPABASE_URL }}
            NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}

      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:staging
          format: table
          exit-code: '1'
          vuln-type: os,library
          severity: CRITICAL
          trivyignores: .trivyignore
```

- [ ] **Step 2: Validate staging YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-staging.yml'))" && echo "OK"
```
Expected: `OK`

- [ ] **Step 3: Add Trivy scan to production `build-and-push` job**

In `.github/workflows/deploy-prod.yml`, the `build-and-push` job already has a `Resolve image tag` step before pushing. Add the Trivy step after `Build and push image`:

```yaml
      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.tag.outputs.value }}
          format: table
          exit-code: '1'
          vuln-type: os,library
          severity: CRITICAL
          trivyignores: .trivyignore
```

- [ ] **Step 4: Create empty `.trivyignore` file**

Create `.trivyignore` at the repo root with a comment explaining its purpose:

```
# Trivy CVE suppressions
# Format: one CVE-ID per line
# Use this file to suppress known false positives or accepted risks.
# Document the reason in a comment above each entry.
# Example:
# CVE-2023-XXXXX  # Accepted: only affects feature X which we don't use
```

- [ ] **Step 5: Validate production YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-prod.yml'))" && echo "OK"
```
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/deploy-staging.yml .github/workflows/deploy-prod.yml .trivyignore
git commit -m "feat(ci): add Trivy container scanning to deploy workflows

Scans the built image for CRITICAL CVEs after push and before
deployment. Blocks staging and production deploys on critical
findings. Known accepted risks can be suppressed in .trivyignore.
"
```

---

## Task 6: Add Dependency Review Job to CI

**Context:** `npm audit` (already in CI) checks the installed lock file for known CVEs. The `actions/dependency-review-action` is complementary: it checks what NEW vulnerabilities are being INTRODUCED by changes to `package.json` / `package-lock.json` in a PR. This catches supply-chain risks before they land on main.

**Files:**
- Modify: `.github/workflows/ci.yml` (add new job at the end)

- [ ] **Step 1: Validate current CI YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "OK"
```
Expected: `OK`

- [ ] **Step 2: Add dependency-review job to `ci.yml`**

Append the following job at the end of `.github/workflows/ci.yml` (after the `audit` job):

```yaml

  # ── Job 6: Dependency vulnerability review (PR delta) ────────────────────
  dependency-review:
    name: Dependency review
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Dependency review
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
```

- [ ] **Step 3: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "OK"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat(ci): add dependency review to PR quality gate

Checks that PRs don't introduce new high-severity vulnerabilities
via package changes. Complements npm audit (which checks the full
lock file) by focusing on what the PR itself is adding.
"
```

---

## Task 7: Update `docs/DELIVERY.md` to Reflect All Changes

**Context:** `DELIVERY.md` is the authoritative reference for the pipeline. It currently has one inaccuracy (says e2e.yml uses staging but the file said production — now fixed) and several omissions (CodeQL, Trivy, dependency review, automated rollback, `.trivyignore`). Update it to match the pipeline as it now exists.

**Files:**
- Modify: `docs/DELIVERY.md`

- [ ] **Step 1: Update the repository structure section (section 1)**

Find the current `.github/workflows/` tree in the "Repository structure" code block:

```
├── .github/workflows/
│   ├── ci.yml                  ← PR quality gate (5 parallel jobs)
│   ├── e2e.yml                 ← PR E2E test suite (Playwright)
│   ├── deploy-staging.yml      ← main → staging
│   └── deploy-prod.yml         ← release/dispatch → production
```

Replace with:

```
├── .github/workflows/
│   ├── ci.yml                  ← PR quality gate (6 parallel jobs)
│   ├── e2e.yml                 ← PR E2E test suite (Playwright, staging env)
│   ├── codeql.yml              ← SAST scanning (PRs + weekly)
│   ├── deploy-staging.yml      ← main → staging (with Trivy scan)
│   └── deploy-prod.yml         ← release/dispatch → production (with Trivy scan + rollback)
```

- [ ] **Step 2: Update the Stage 1 quality gate table (section 2)**

Find the CI jobs table:

```markdown
| Job | Tool | Failure means |
|---|---|---|
| Lint & type check | ESLint + `tsc --noEmit` | Style violation or type error; fix and push |
| Unit tests | Vitest | Regression in component/logic layer |
| Design tokens | Style Dictionary + `git diff` | Token drift — run `make tokens` and commit output |
| Build & startup check | `next build` + `next start` | App would not compile or start; fix before merge |
| Dependency audit | `npm audit --audit-level=high` | High-severity vulnerability in dependency tree |
```

Replace with:

```markdown
| Job | Tool | Failure means |
|---|---|---|
| Lint & type check | ESLint + `tsc --noEmit` | Style violation or type error; fix and push |
| Unit tests | Vitest | Regression in component/logic layer |
| Design tokens | Style Dictionary + `git diff` | Token drift — run `make tokens` and commit output |
| Build & startup check | `next build` + `next start` | App would not compile or start; fix before merge |
| Dependency audit | `npm audit --audit-level=high` | High-severity vulnerability in dependency tree |
| Dependency review | `actions/dependency-review-action` | PR introduces a new high-severity CVE via package changes |
```

- [ ] **Step 3: Add SAST description after the Stage 1 E2E table**

Find the paragraph starting with "The E2E job uses the `staging` GitHub Environment" and ensure it reads:

```markdown
The E2E job uses the `staging` GitHub Environment for secrets. It runs against a locally built and started app, not the deployed staging server, which means it validates the code on the PR branch rather than what is already deployed.

**`codeql.yml` — SAST scanning:**

CodeQL runs on every PR to `main` and on a weekly schedule. It analyzes JavaScript/TypeScript for security vulnerabilities (XSS, injection, path traversal) and quality issues using the `security-and-quality` query suite. Findings appear in the GitHub Security tab. A new finding does not block CI directly but is surfaced to reviewers before merge.
```

- [ ] **Step 4: Update Stage 2 and Stage 3 descriptions to mention Trivy**

Find the Stage 2 description:

```markdown
Jobs run sequentially: migrations must succeed before the image is built, and the image must be pushed before the server pulls it. A broken migration never leaves the app and database in a split state.
```

Replace with:

```markdown
Jobs run sequentially: migrations must succeed before the image is built, and the image must be pushed before the server pulls it. A broken migration never leaves the app and database in a split state.

After the image is pushed to GHCR, Trivy scans it for CRITICAL CVEs. A critical finding blocks the deploy job. Known accepted findings can be suppressed in `.trivyignore` at the repo root with a documented rationale.
```

Apply the same paragraph about Trivy to Stage 3:

Find the Stage 3 description after the approval gate paragraph and add the same Trivy note.

- [ ] **Step 5: Update the rollback section**

Find the rollback table:

```markdown
| What broke | Rollback path |
|---|---|
| App regression (no DB change) | On the server: `docker stop evecosys-prod && docker run ... ghcr.io/OWNER/evecosys:<previous-tag>`. The previous image is still in GHCR — find the tag in the Actions run history. |
| App + migration | Create a new forward migration that reverses the schema change, then redeploy. Never `DROP` without a migration file. |
| Bad staging deploy | Push a revert commit to `main`; staging redeploys automatically. |
```

And the paragraph after it:

```markdown
There is no automated rollback. Automated rollback on a failed smoke test is a future improvement once E2E coverage is sufficient to trust it.
```

Replace the entire rollback section with:

```markdown
| What broke | Rollback path |
|---|---|
| App regression (no DB change) | **Automated:** if the production smoke test fails immediately after deploy, the `rollback` job in `deploy-prod.yml` fires automatically, SSHes in, and restores the previous container image from `/etc/evecosys/prev_image.txt`. **Manual fallback:** `docker stop evecosys-prod && docker run ... <previous-image>` on the server. |
| App + migration | Create a new forward migration that reverses the schema change, then redeploy. Never `DROP` without a migration file. |
| Bad staging deploy | Push a revert commit to `main`; staging redeploys automatically. |

The automated rollback fires when: (1) the `deploy` job succeeded (something was deployed), AND (2) the `smoke` job fails. It reads the previous image tag saved to `/etc/evecosys/prev_image.txt` by the deploy step before the container swap. If no previous tag is recorded (first-ever deploy), it exits with an error and requires manual intervention.
```

- [ ] **Step 6: Update policy checks section — add container scanning row**

Find the "Infrastructure (enforced at deploy time)" table:

```markdown
| Check | When | Failure action |
|---|---|---|
| Migration dry-run | Before `supabase db push` (future: add `--dry-run` flag) | Block deploy |
| Staging smoke test | After staging deploy | Block production promotion |
| Production smoke test | After production deploy | Alert on-call; consider rollback |
```

Replace with:

```markdown
| Check | When | Failure action |
|---|---|---|
| Migration dry-run | Before `supabase db push` (future: add `--dry-run` flag) | Block deploy |
| Container scan (Trivy) | After image push, before SSH deploy (staging + production) | Block deploy on CRITICAL CVEs |
| Staging smoke test | After staging deploy | Block production promotion |
| Production smoke test | After production deploy | Triggers automated rollback; alerts on-call |
```

- [ ] **Step 7: Validate DELIVERY.md is valid Markdown (no broken headers)**

```bash
python3 -c "
text = open('docs/DELIVERY.md').read()
headers = [l for l in text.split('\n') if l.startswith('#')]
for h in headers: print(h)
"
```
Expected: All section headers printed cleanly, no duplicates.

- [ ] **Step 8: Commit**

```bash
git add docs/DELIVERY.md
git commit -m "docs: update DELIVERY.md to reflect hardened pipeline

- Fix e2e.yml environment description (was wrong: said staging, file had production)
- Add CodeQL SAST section
- Add Trivy container scanning to Stage 2 and Stage 3 descriptions
- Update rollback section: automated rollback is now implemented
- Update policy checks table: add container scanning row
- Update repo structure tree: add codeql.yml, note Trivy
"
```

---

## Self-Review

### Spec coverage

| EVE-58 acceptance criterion | Covered by |
|---|---|
| Target CI/CD workflow defined from code change to production | Existing workflows + DELIVERY.md Task 7 |
| Environment stages and promotion rules defined | Existing DELIVERY.md (unchanged structure) |
| Build, test, security, deployment gates identified | Tasks 4, 5, 6 add missing security gates |
| Secret management, access control, audit requirements defined | Tasks 1, 2 fix secret scoping bugs; DELIVERY.md already covers audit |
| E2E validation requirements defined | Task 1 fixes e2e.yml; deploy-staging.yml already has post-deploy E2E |
| Rollback/failed-deployment handling defined | Task 3 implements automated rollback |
| Specific enough to guide implementation | DELIVERY.md updates in Task 7 |

### Placeholder scan

No TBD, TODO, "implement later", "add appropriate", "similar to", or empty code blocks found.

### Type/name consistency

- `evecosys-prod` container name used consistently in Tasks 3 and rollback job
- `/etc/evecosys/prev_image.txt` used consistently between deploy save step and rollback read step
- `aquasecurity/trivy-action@0.28.0` version pinned identically in Tasks 5 staging and production
- `steps.tag.outputs.value` referenced correctly in production Trivy step (matches existing pattern in deploy-prod.yml)
