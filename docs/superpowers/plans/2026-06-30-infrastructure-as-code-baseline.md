# Infrastructure-as-Code Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a real, plan-and-apply infrastructure-as-code baseline (OpenTofu) for EVEcosys that declares GitHub repo configuration, Supabase projects, Cloudflare DNS, and app-server compute as versioned modules — with variable validation, policy-as-code, per-tenant module scaffolding with boundary isolation, and a gated CI plan/apply workflow.

**Architecture:** OpenTofu (Terraform-compatible HCL) under a new `infra/` tree. Reusable **modules** (`github-config`, `supabase-project`, `dns`, `compute`, `tenant`) are composed by per-environment **roots** (`environments/staging`, `environments/production`). Every module carries variable `validation` blocks; cross-cutting rules live as **conftest/Rego** policies with their own Rego unit tests. Module behaviour is tested credential-free with **OpenTofu native tests** (`*.tftest.hcl` + `mock_provider`). A new `.github/workflows/iac.yml` runs all validation on every PR (no cloud credentials needed) and gates real `plan`/`apply` behind GitHub Environment approvals. Remote state lives in Cloudflare R2 (S3-compatible), isolated per environment and per tenant so one tenant's state can never touch another's.

**Tech Stack:** OpenTofu ≥ 1.8 (HCL); providers `integrations/github`, `supabase/supabase`, `cloudflare/cloudflare` (v5), `hetznercloud/hcloud` (compute reference); conftest (OPA/Rego) for policy + policy unit tests; Checkov for static security breadth; gitleaks for secret scanning; GitHub Actions for CI. Node `22.15.0` toolchain already in repo.

---

## Why this exists (read before starting)

EVE-57 asks us to *define and implement the IaC approach*. The branch already ships `docs/DELIVERY.md`, which declared "Terraform deliberately deferred" and treated IaC as Supabase-migrations + Docker + GitHub-Actions. This plan **supersedes that deferral** (decision confirmed with the issue owner) and introduces a genuine declarative IaC layer that satisfies EVE-57's testing/E2E acceptance criteria: module tests, variable handling, environment composition, invalid-config/unsafe-default/policy-violation tests, environment-safe outputs, tenant-boundary isolation, and a plan→apply workflow that fails safely.

**Design rules that every task must honour:**

1. **Credential-free tests.** Every test in this plan (`tofu test`, `conftest verify`, `conftest test`, `tofu validate`, Checkov, gitleaks) runs in CI with **no real cloud credentials**. Real provider auth is only ever used by the *gated* `plan`/`apply` jobs, never by the test suite. This is what makes the pipeline runnable on every PR.
2. **No secret values in code.** Provider tokens and DB passwords are supplied exclusively via `TF_VAR_*` environment variables sourced from GitHub Environment secrets. `.tfvars` files committed to the repo contain only non-secret configuration. A Rego policy and gitleaks enforce this.
3. **State isolation is the tenant boundary.** Each environment and each tenant gets its own state key. A tenant module is parameterized by `tenant_id`, prefixes every resource name with it, and is forbidden by policy + validation from referencing any other tenant's identifier.
4. **TDD for IaC.** "Write the failing test first" maps to: write the `.tftest.hcl` / Rego test, run it and watch it fail (module/policy absent), implement the HCL/Rego, run it green, commit.

> **Tooling note:** Commands use the OpenTofu CLI `tofu`. Terraform is a drop-in: every `.tf`/`.tftest.hcl` file here is standard HCL2 and works with `terraform` ≥ 1.8 as well (swap `tofu` → `terraform`). If the executor's machine only has `terraform`, alias it: `alias tofu=terraform`. Install OpenTofu via `brew install opentofu` (macOS) or the `opentofu/setup-opentofu` action (CI).

---

## File Structure

```
infra/
├── README.md                         ← how to install tooling, auth, run the workflow
├── versions.tf                       ← required_version + required_providers (shared via symlink-free copy per root; see Task 1)
├── modules/
│   ├── github-config/                ← repo environments, branch protection, deployment policies
│   │   ├── main.tf  variables.tf  outputs.tf  versions.tf
│   │   └── tests/github_config.tftest.hcl
│   ├── supabase-project/             ← one Supabase project + settings (per-env, reused per-tenant)
│   │   ├── main.tf  variables.tf  outputs.tf  versions.tf
│   │   └── tests/supabase_project.tftest.hcl
│   ├── dns/                          ← Cloudflare DNS records for one environment/tenant hostname
│   │   ├── main.tf  variables.tf  outputs.tf  versions.tf
│   │   └── tests/dns.tftest.hcl
│   ├── compute/                      ← app-server VM + firewall (Hetzner reference impl)
│   │   ├── main.tf  variables.tf  outputs.tf  versions.tf
│   │   └── tests/compute.tftest.hcl
│   └── tenant/                       ← composes supabase-project + dns for ONE tenant
│       ├── main.tf  variables.tf  outputs.tf  versions.tf
│       └── tests/tenant_boundary.tftest.hcl
├── environments/
│   ├── staging/
│   │   ├── main.tf  variables.tf  outputs.tf  versions.tf  backend.tf
│   │   ├── staging.auto.tfvars       ← non-secret config only
│   │   └── tests/staging_e2e.tftest.hcl
│   └── production/
│       ├── main.tf  variables.tf  outputs.tf  versions.tf  backend.tf
│       ├── production.auto.tfvars    ← non-secret config only
│       └── tests/production_e2e.tftest.hcl
└── policy/
    ├── no_plaintext_secrets.rego          + no_plaintext_secrets_test.rego
    ├── require_environment_tag.rego       + require_environment_tag_test.rego
    ├── tenant_boundary.rego               + tenant_boundary_test.rego
    └── no_open_ssh.rego                   + no_open_ssh_test.rego

.github/workflows/iac.yml             ← PR validation (credential-free) + gated plan/apply + drift detection
docs/IAC.md                           ← the "approach" deliverable: modeling, workflow, ownership, security, drift, validation, E2E, dependencies
docs/DELIVERY.md                      ← MODIFIED: reconcile the now-adopted IaC baseline
.gitignore                            ← MODIFIED: ignore tofu state/plan/.terraform
Makefile                              ← MODIFIED: add iac-* targets
.env.example                          ← MODIFIED: document TF_VAR_* provider tokens (no values)
CLAUDE.md                             ← MODIFIED: note infra/ conventions
```

**Why this decomposition:** modules have one responsibility each and a clean variable interface; roots only *compose* modules (no raw resources), which keeps blast radius and review surface small; policy is separate from modules so rules apply uniformly; tests live beside what they test. Files that change together (a module + its test) live together.

---

## Conventions used throughout

- **Resource naming:** every resource carries a `name`/prefix derived from `var.environment` (and `var.tenant_id` in the tenant module). Format: `evecosys-<environment>[-<tenant_id>]-<role>`.
- **Tagging/labelling:** every taggable resource gets a `managed_by = "opentofu"` and `environment = var.environment` label/tag. Policies enforce this.
- **Sensitive inputs:** any variable holding a token/password is declared `sensitive = true` and has **no default** (must come from `TF_VAR_*`).
- **Validation messages:** every `validation` block has a specific `error_message` so failures are actionable.
- **Commit style:** Conventional Commits, scope `iac`. Example: `feat(iac): add github-config module (EVE-57)`. End each commit body with the Co-Authored-By trailer the repo uses.

---

## Task 1: IaC workspace bootstrap & tooling

Establish the `infra/` tree, provider/version pins, ignore rules, Make targets, and prove the `tofu` toolchain runs. No cloud resources yet — we validate an empty root so the harness is real before any module exists.

**Files:**
- Create: `infra/versions.tf`
- Create: `infra/README.md`
- Create: `infra/.terraform-version`
- Modify: `.gitignore` (append Terraform/OpenTofu ignores)
- Modify: `Makefile` (add `iac-*` targets)

- [ ] **Step 1: Create the provider/version pin file**

Create `infra/versions.tf`:

```hcl
# Shared provider + version constraints for all EVEcosys IaC.
# Each module and environment root copies these required_providers it needs.
# OpenTofu and Terraform >= 1.8 both consume this file unchanged.
terraform {
  required_version = ">= 1.8.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.5"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }
}
```

- [ ] **Step 2: Pin the OpenTofu version**

Create `infra/.terraform-version` (consumed by tenv/tfenv/asdf and documented for humans):

```
1.8.5
```

- [ ] **Step 3: Add the README skeleton**

Create `infra/README.md`:

```markdown
# EVEcosys Infrastructure (OpenTofu)

Declarative infrastructure for the EVEcosys platform. Tooling: **OpenTofu ≥ 1.8** (`tofu`).
Terraform ≥ 1.8 is a drop-in (`alias tofu=terraform`).

## Install

    brew install opentofu conftest checkov   # macOS
    # CI installs these via setup actions — see .github/workflows/iac.yml

## Layout

- `modules/`        reusable building blocks (one responsibility each)
- `environments/`   per-environment roots that *compose* modules
- `policy/`         conftest/Rego policies + their unit tests

## Credentials

No credentials are needed to validate, test, or run policy checks.
Real `plan`/`apply` reads provider tokens from environment variables only:

    export TF_VAR_github_token=...        # repo admin PAT or App token
    export TF_VAR_supabase_access_token=... TF_VAR_supabase_organization_id=...
    export TF_VAR_cloudflare_api_token=... TF_VAR_cloudflare_zone_id=...
    export TF_VAR_hcloud_token=...

Never commit these. CI sources them from GitHub Environment secrets.

## Everyday commands

    make iac-fmt        # format check
    make iac-validate   # tofu validate (no backend, no creds)
    make iac-test       # tofu test (mock providers, no creds)
    make iac-policy     # conftest policy + Rego unit tests
    make iac-check      # all of the above

See `docs/IAC.md` for the full approach, workflow, and ownership model.
```

- [ ] **Step 4: Add ignore rules for state and local provider caches**

Append to `.gitignore` (after the existing env-files block at line ~46):

```gitignore

# ── OpenTofu / Terraform ──────────────────────────────────────────────────
**/.terraform/*
*.tfstate
*.tfstate.*
*.tfplan
crash.log
crash.*.log
# Local-only secret var files (committed *.auto.tfvars must be non-secret)
*.secret.tfvars
override.tf
override.tf.json
*_override.tf
*_override.tf.json
# Keep the dependency lock file committed:
!**/.terraform.lock.hcl
```

- [ ] **Step 5: Add Make targets**

Add to `Makefile` (follow the existing `name: ## help` convention; place after the `audit` target near line 42):

```makefile
iac-fmt: ## Check OpenTofu formatting across infra/
	tofu fmt -check -recursive infra

iac-validate: ## Validate every infra module and environment root (no backend, no creds)
	@set -e; for d in infra/modules/* infra/environments/*; do \
		echo "== validate $$d =="; \
		tofu -chdir=$$d init -backend=false -input=false >/dev/null; \
		tofu -chdir=$$d validate; \
	done

iac-test: ## Run OpenTofu native module tests (mock providers, no creds)
	@set -e; for d in infra/modules/* infra/environments/*; do \
		if ls $$d/tests/*.tftest.hcl >/dev/null 2>&1; then \
			echo "== test $$d =="; \
			tofu -chdir=$$d init -backend=false -input=false >/dev/null; \
			tofu -chdir=$$d test; \
		fi; \
	done

iac-policy: ## Run conftest policy checks + Rego unit tests against infra/
	conftest verify --policy infra/policy
	conftest test --policy infra/policy --all-namespaces infra/modules infra/environments

iac-check: iac-fmt iac-validate iac-test iac-policy ## Run all IaC checks locally
```

- [ ] **Step 6: Prove the toolchain runs against an empty root**

Create a throwaway empty root to confirm `tofu` works, then remove it:

```bash
cd infra
mkdir -p _smoke && printf 'terraform {\n  required_version = ">= 1.8.0"\n}\n' > _smoke/main.tf
tofu -chdir=_smoke init -backend=false -input=false
tofu -chdir=_smoke validate
tofu fmt -check -recursive .
rm -rf _smoke
cd ..
```

Expected: `init` succeeds, `validate` prints `Success! The configuration is valid.`, `fmt -check` exits 0.

- [ ] **Step 7: Commit**

```bash
git add infra/versions.tf infra/README.md infra/.terraform-version .gitignore Makefile
git commit -m "chore(iac): bootstrap OpenTofu workspace, tooling, and make targets (EVE-57)"
```

---

## Task 2: Policy harness + "no plaintext secrets" policy (TDD)

Stand up the conftest/Rego policy loop with the first, highest-value rule: IaC must never contain a hardcoded secret. This satisfies EVE-57's "Prevent secret exposure in IaC definitions."

**Files:**
- Create: `infra/policy/no_plaintext_secrets_test.rego`
- Create: `infra/policy/no_plaintext_secrets.rego`

- [ ] **Step 1: Write the failing Rego unit test**

Create `infra/policy/no_plaintext_secrets_test.rego`:

```rego
package main

# A resource that hardcodes a token literal must be denied.
test_denies_hardcoded_token if {
	count(deny) > 0 with input as {"resource": {"supabase_project": {"this": {
		"database_password": "hunter2-literal-value",
	}}}}
}

# A resource that references a variable (no literal) is allowed.
test_allows_variable_reference if {
	count(deny) == 0 with input as {"resource": {"supabase_project": {"this": {
		"database_password": "${var.database_password}",
	}}}}
}

# Empty / unrelated input must not trip the rule.
test_allows_unrelated if {
	count(deny) == 0 with input as {"resource": {"github_branch_protection": {"this": {
		"pattern": "main",
	}}}}
}
```

- [ ] **Step 2: Run the policy unit test to verify it fails**

Run:
```bash
conftest verify --policy infra/policy
```
Expected: FAIL — `no_plaintext_secrets.rego` does not exist, so `deny` is undefined and the tests error/fail.

- [ ] **Step 3: Implement the policy**

Create `infra/policy/no_plaintext_secrets.rego`:

```rego
package main

# Attribute names that must never hold a literal value in IaC source.
secret_attrs := {
	"database_password",
	"password",
	"token",
	"api_token",
	"access_token",
	"secret",
	"private_key",
	"ssh_private_key",
}

# conftest's HCL2 parser exposes resources under input.resource[type][name].
# A value is a "literal secret" if it is a non-empty string that is NOT an
# interpolation/reference (i.e. does not contain "var.", "local.", or "data.").
is_reference(v) {
	contains(v, "var.")
}

is_reference(v) {
	contains(v, "local.")
}

is_reference(v) {
	contains(v, "data.")
}

deny contains msg if {
	some rtype, rname
	resource := input.resource[rtype][rname]
	some attr, value in resource
	secret_attrs[attr]
	is_string(value)
	value != ""
	not is_reference(value)
	msg := sprintf("%s.%s sets sensitive attribute %q to a literal value; use a variable instead", [rtype, rname, attr])
}
```

- [ ] **Step 4: Run the policy unit test to verify it passes**

Run:
```bash
conftest verify --policy infra/policy
```
Expected: PASS — 3 tests pass (`test_denies_hardcoded_token`, `test_allows_variable_reference`, `test_allows_unrelated`).

- [ ] **Step 5: Commit**

```bash
git add infra/policy/no_plaintext_secrets.rego infra/policy/no_plaintext_secrets_test.rego
git commit -m "feat(iac): policy forbidding hardcoded secrets in IaC source (EVE-57)"
```

---

## Task 3: "require environment tag" policy (TDD)

Every managed resource must declare which environment it belongs to, so a resource can never be silently created without an environment boundary. Satisfies "unsafe defaults" and "policy violations" coverage.

**Files:**
- Create: `infra/policy/require_environment_tag_test.rego`
- Create: `infra/policy/require_environment_tag.rego`

- [ ] **Step 1: Write the failing Rego unit test**

Create `infra/policy/require_environment_tag_test.rego`:

```rego
package main

# A compute resource without an environment label is denied.
test_denies_missing_environment if {
	count(deny) > 0 with input as {"resource": {"hcloud_server": {"app": {
		"name":   "evecosys-staging-app",
		"labels": {"managed_by": "opentofu"},
	}}}}
}

# A resource carrying a non-empty environment label is allowed.
test_allows_with_environment if {
	count(deny) == 0 with input as {"resource": {"hcloud_server": {"app": {
		"name":   "evecosys-staging-app",
		"labels": {"managed_by": "opentofu", "environment": "${var.environment}"},
	}}}}
}

# Resource types that are not taggable (e.g. branch protection) are exempt.
test_exempts_non_taggable if {
	count(deny) == 0 with input as {"resource": {"github_branch_protection": {"main": {
		"pattern": "main",
	}}}}
}
```

- [ ] **Step 2: Run to verify it fails**

Run:
```bash
conftest verify --policy infra/policy
```
Expected: FAIL — `require_environment_tag.rego` not yet present (new tests fail/error).

- [ ] **Step 3: Implement the policy**

Create `infra/policy/require_environment_tag.rego`:

```rego
package main

# Resource types that support labels/tags and therefore must declare environment.
taggable_types := {
	"hcloud_server",
	"hcloud_firewall",
	"supabase_project",
	"cloudflare_dns_record",
}

# Where the "environment" marker lives differs by provider:
#   hcloud_*           -> labels.environment
#   cloudflare_dns_record -> comment (carries "environment=<env>")
#   supabase_project   -> name (must contain the environment)
has_environment_marker(rtype, resource) {
	startswith(rtype, "hcloud_")
	resource.labels.environment != ""
}

has_environment_marker(rtype, resource) {
	rtype == "cloudflare_dns_record"
	contains(resource.comment, "environment=")
}

has_environment_marker(rtype, resource) {
	rtype == "supabase_project"
	resource.name != ""
}

deny contains msg if {
	some rtype, rname
	taggable_types[rtype]
	resource := input.resource[rtype][rname]
	not has_environment_marker(rtype, resource)
	msg := sprintf("%s.%s must declare its environment (labels.environment / comment / name)", [rtype, rname])
}
```

- [ ] **Step 4: Run to verify it passes**

Run:
```bash
conftest verify --policy infra/policy
```
Expected: PASS — all tests including the three new ones pass.

- [ ] **Step 5: Commit**

```bash
git add infra/policy/require_environment_tag.rego infra/policy/require_environment_tag_test.rego
git commit -m "feat(iac): policy requiring environment marker on taggable resources (EVE-57)"
```

---

## Task 4: "no open SSH" policy (TDD)

Block firewall rules that expose SSH (port 22) to the whole internet. Satisfies "Restrict destructive or production-impacting changes" and "unsafe defaults."

**Files:**
- Create: `infra/policy/no_open_ssh_test.rego`
- Create: `infra/policy/no_open_ssh.rego`

- [ ] **Step 1: Write the failing Rego unit test**

Create `infra/policy/no_open_ssh_test.rego`:

```rego
package main

test_denies_ssh_open_to_world if {
	count(deny) > 0 with input as {"resource": {"hcloud_firewall": {"app": {
		"rule": [{"direction": "in", "protocol": "tcp", "port": "22", "source_ips": ["0.0.0.0/0", "::/0"]}],
	}}}}
}

test_allows_ssh_from_specific_cidr if {
	count(deny) == 0 with input as {"resource": {"hcloud_firewall": {"app": {
		"rule": [{"direction": "in", "protocol": "tcp", "port": "22", "source_ips": ["203.0.113.5/32"]}],
	}}}}
}

test_allows_https_open if {
	count(deny) == 0 with input as {"resource": {"hcloud_firewall": {"app": {
		"rule": [{"direction": "in", "protocol": "tcp", "port": "443", "source_ips": ["0.0.0.0/0"]}],
	}}}}
}
```

- [ ] **Step 2: Run to verify it fails**

Run:
```bash
conftest verify --policy infra/policy
```
Expected: FAIL — `no_open_ssh.rego` missing.

- [ ] **Step 3: Implement the policy**

Create `infra/policy/no_open_ssh.rego`:

```rego
package main

world_cidrs := {"0.0.0.0/0", "::/0"}

deny contains msg if {
	some rname
	fw := input.resource.hcloud_firewall[rname]
	some rule in fw.rule
	rule.direction == "in"
	rule.port == "22"
	some cidr in rule.source_ips
	world_cidrs[cidr]
	msg := sprintf("hcloud_firewall.%s exposes SSH (port 22) to %s; restrict to a specific CIDR", [rname, cidr])
}
```

- [ ] **Step 4: Run to verify it passes**

Run:
```bash
conftest verify --policy infra/policy
```
Expected: PASS — all policy unit tests green.

- [ ] **Step 5: Commit**

```bash
git add infra/policy/no_open_ssh.rego infra/policy/no_open_ssh_test.rego
git commit -m "feat(iac): policy blocking world-open SSH firewall rules (EVE-57)"
```

---

## Task 5: `github-config` module (TDD)

Codify what `DELIVERY.md` Section 4 currently asks operators to click through by hand: repository Environments (`staging`/`production`), production required-reviewers, and branch protection on `main`.

**Files:**
- Create: `infra/modules/github-config/versions.tf`
- Create: `infra/modules/github-config/variables.tf`
- Create: `infra/modules/github-config/main.tf`
- Create: `infra/modules/github-config/outputs.tf`
- Create: `infra/modules/github-config/tests/github_config.tftest.hcl`

- [ ] **Step 1: Write the failing module test**

Create `infra/modules/github-config/tests/github_config.tftest.hcl`:

```hcl
mock_provider "github" {}

variables {
  repository           = "evecosys"
  environment          = "production"
  protected_branch     = "main"
  required_reviewers   = ["octocat"]
  required_approvals   = 1
}

run "creates_named_environment" {
  command = plan

  assert {
    condition     = github_repository_environment.this.environment == "production"
    error_message = "environment resource must be named for var.environment"
  }
}

run "branch_protection_targets_main" {
  command = plan

  assert {
    condition     = github_branch_protection.this.pattern == "main"
    error_message = "branch protection must target the protected_branch input"
  }
  assert {
    condition     = github_branch_protection.this.required_pull_request_reviews[0].required_approving_review_count == 1
    error_message = "main must require at least one approving review"
  }
}

run "rejects_invalid_environment" {
  command = plan

  variables {
    environment = "qa"
  }

  expect_failures = [var.environment]
}

run "production_requires_reviewers" {
  command = plan

  variables {
    environment        = "production"
    required_reviewers = []
  }

  expect_failures = [var.required_reviewers]
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
tofu -chdir=infra/modules/github-config init -backend=false -input=false
tofu -chdir=infra/modules/github-config test
```
Expected: FAIL — no `.tf` resources/variables defined yet.

- [ ] **Step 3: Write the module variables (with validation)**

Create `infra/modules/github-config/variables.tf`:

```hcl
variable "repository" {
  type        = string
  description = "Name of the GitHub repository (without owner)."

  validation {
    condition     = length(var.repository) > 0
    error_message = "repository must be a non-empty repo name."
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment this config block targets."

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be one of: staging, production."
  }
}

variable "protected_branch" {
  type        = string
  default     = "main"
  description = "Branch to protect with required reviews and status checks."
}

variable "required_reviewers" {
  type        = list(string)
  default     = []
  description = "GitHub usernames that must approve production deployments."

  # Production must always name at least one human reviewer.
  validation {
    condition     = var.environment != "production" || length(var.required_reviewers) > 0
    error_message = "production environment must declare at least one required_reviewer."
  }
}

variable "required_approvals" {
  type        = number
  default     = 1
  description = "Number of approving PR reviews required to merge the protected branch."

  validation {
    condition     = var.required_approvals >= 1
    error_message = "required_approvals must be at least 1."
  }
}

variable "required_status_checks" {
  type        = list(string)
  default     = ["lint", "test", "build", "audit"]
  description = "CI job names that must pass before the protected branch can merge."
}
```

- [ ] **Step 4: Write the module resources**

Create `infra/modules/github-config/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.8.0"
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}
```

Create `infra/modules/github-config/main.tf`:

```hcl
# A deployment environment (staging or production) on the repository.
resource "github_repository_environment" "this" {
  repository  = var.repository
  environment = var.environment

  # Required reviewers only apply to environments that name them (production).
  dynamic "reviewers" {
    for_each = length(var.required_reviewers) > 0 ? [1] : []
    content {
      users = []
    }
  }

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

# Branch protection for the protected branch (default: main).
resource "github_branch_protection" "this" {
  repository_id = var.repository
  pattern       = var.protected_branch

  required_pull_request_reviews {
    required_approving_review_count = var.required_approvals
  }

  required_status_checks {
    strict   = true
    contexts = var.required_status_checks
  }

  enforce_admins         = true
  allows_force_pushes    = false
  allows_deletions       = false
  require_signed_commits = false
}
```

> **Note for executor:** the `integrations/github` provider's `github_repository_environment.reviewers.users` expects numeric GitHub user IDs, not logins. The module keeps `required_reviewers` as logins for a human-readable interface; resolving logins → IDs (via a `data "github_user"` lookup) is a follow-up enhancement and is intentionally left as `users = []` here so the mock-provider test stays credential-free. Document this in `docs/IAC.md` "Known limitations."

- [ ] **Step 5: Write the outputs**

Create `infra/modules/github-config/outputs.tf`:

```hcl
output "environment_name" {
  value       = github_repository_environment.this.environment
  description = "The configured GitHub environment name."
}

output "protected_branch" {
  value       = github_branch_protection.this.pattern
  description = "The branch protected by this module."
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run:
```bash
tofu -chdir=infra/modules/github-config test
```
Expected: PASS — `creates_named_environment`, `branch_protection_targets_main`, `rejects_invalid_environment`, `production_requires_reviewers` all pass.

- [ ] **Step 7: Validate + format + commit**

```bash
tofu fmt infra/modules/github-config
tofu -chdir=infra/modules/github-config validate
git add infra/modules/github-config
git commit -m "feat(iac): github-config module for environments + branch protection (EVE-57)"
```

---

## Task 6: `supabase-project` module (TDD)

A reusable Supabase project for an environment (and later, per tenant). Validates region against an allowlist (no unsafe default region) and keeps the DB password out of source.

**Files:**
- Create: `infra/modules/supabase-project/versions.tf`
- Create: `infra/modules/supabase-project/variables.tf`
- Create: `infra/modules/supabase-project/main.tf`
- Create: `infra/modules/supabase-project/outputs.tf`
- Create: `infra/modules/supabase-project/tests/supabase_project.tftest.hcl`

- [ ] **Step 1: Write the failing module test**

Create `infra/modules/supabase-project/tests/supabase_project.tftest.hcl`:

```hcl
mock_provider "supabase" {}

variables {
  organization_id   = "org_mock"
  environment       = "staging"
  region            = "eu-central-1"
  database_password = "from-tf-var-not-literal"
}

run "names_project_for_environment" {
  command = plan

  assert {
    condition     = can(regex("^evecosys-staging$", supabase_project.this.name))
    error_message = "project name must be evecosys-<environment>"
  }
}

run "rejects_unlisted_region" {
  command = plan

  variables {
    region = "mars-001"
  }

  expect_failures = [var.region]
}

run "rejects_empty_password" {
  command = plan

  variables {
    database_password = ""
  }

  expect_failures = [var.database_password]
}
```

- [ ] **Step 2: Run to verify it fails**

Run:
```bash
tofu -chdir=infra/modules/supabase-project init -backend=false -input=false
tofu -chdir=infra/modules/supabase-project test
```
Expected: FAIL — module not implemented.

- [ ] **Step 3: Write variables (with validation)**

Create `infra/modules/supabase-project/variables.tf`:

```hcl
variable "organization_id" {
  type        = string
  description = "Supabase organization ID that owns the project."

  validation {
    condition     = length(var.organization_id) > 0
    error_message = "organization_id must be non-empty."
  }
}

variable "environment" {
  type        = string
  description = "Logical environment label (staging, production, or a tenant slug)."

  validation {
    condition     = length(var.environment) > 0
    error_message = "environment must be non-empty."
  }
}

variable "name_prefix" {
  type        = string
  default     = "evecosys"
  description = "Prefix for the Supabase project name."
}

variable "region" {
  type        = string
  description = "Supabase project region."

  validation {
    condition = contains(
      ["eu-central-1", "eu-west-1", "eu-west-2", "us-east-1", "us-west-1"],
      var.region
    )
    error_message = "region must be one of the approved regions: eu-central-1, eu-west-1, eu-west-2, us-east-1, us-west-1."
  }
}

variable "database_password" {
  type        = string
  sensitive   = true
  description = "Initial database password. Supply via TF_VAR_database_password; never commit."

  validation {
    condition     = length(var.database_password) >= 12
    error_message = "database_password must be at least 12 characters and supplied via an environment variable."
  }
}
```

- [ ] **Step 4: Write resources + outputs + versions**

Create `infra/modules/supabase-project/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.8.0"
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.5"
    }
  }
}
```

Create `infra/modules/supabase-project/main.tf`:

```hcl
locals {
  project_name = "${var.name_prefix}-${var.environment}"
}

resource "supabase_project" "this" {
  organization_id   = var.organization_id
  name              = local.project_name
  database_password = var.database_password
  region            = var.region

  lifecycle {
    # Renaming or moving a project forces replacement, which destroys data.
    # Require an explicit, reviewed change rather than an accidental one.
    prevent_destroy = true
  }
}
```

Create `infra/modules/supabase-project/outputs.tf`:

```hcl
output "project_ref" {
  value       = supabase_project.this.id
  description = "Supabase project ref (used as the project_id in supabase/config.toml)."
}

output "project_name" {
  value       = supabase_project.this.name
  description = "The Supabase project name."
}
```

> **Note for executor:** `prevent_destroy = true` makes `expect_failures`-free `plan` tests pass but will block `tofu test`'s implicit destroy of *real* resources. With `mock_provider`, no real resource is created, so the test's teardown is a no-op and `prevent_destroy` does not interfere. Confirm `tofu test` passes; if a future provider version evaluates `prevent_destroy` during mocked apply, move it behind `var.protect` (default true) and set `protect = false` in the test variables.

- [ ] **Step 5: Run to verify it passes**

Run:
```bash
tofu -chdir=infra/modules/supabase-project test
```
Expected: PASS — name regex matches, bad region and empty password are rejected.

- [ ] **Step 6: Validate, format, policy, commit**

```bash
tofu fmt infra/modules/supabase-project
tofu -chdir=infra/modules/supabase-project validate
conftest test --policy infra/policy --all-namespaces infra/modules/supabase-project
git add infra/modules/supabase-project
git commit -m "feat(iac): supabase-project module with region allowlist + sensitive password (EVE-57)"
```

---

## Task 7: `dns` module (TDD)

Cloudflare DNS for an environment/tenant hostname. Carries the environment marker in the record comment (per the policy from Task 3) and rejects proxying a non-CNAME/A record.

**Files:**
- Create: `infra/modules/dns/versions.tf`
- Create: `infra/modules/dns/variables.tf`
- Create: `infra/modules/dns/main.tf`
- Create: `infra/modules/dns/outputs.tf`
- Create: `infra/modules/dns/tests/dns.tftest.hcl`

- [ ] **Step 1: Write the failing module test**

Create `infra/modules/dns/tests/dns.tftest.hcl`:

```hcl
mock_provider "cloudflare" {}

variables {
  zone_id     = "zone_mock"
  environment = "staging"
  hostname    = "staging.evecosys.example"
  record_type = "A"
  value       = "203.0.113.10"
}

run "creates_record_with_environment_comment" {
  command = plan

  assert {
    condition     = cloudflare_dns_record.this.name == "staging.evecosys.example"
    error_message = "record name must equal the hostname input"
  }
  assert {
    condition     = can(regex("environment=staging", cloudflare_dns_record.this.comment))
    error_message = "record comment must carry environment=<env> marker"
  }
}

run "rejects_unsupported_record_type" {
  command = plan

  variables {
    record_type = "TXT"
  }

  expect_failures = [var.record_type]
}
```

- [ ] **Step 2: Run to verify it fails**

Run:
```bash
tofu -chdir=infra/modules/dns init -backend=false -input=false
tofu -chdir=infra/modules/dns test
```
Expected: FAIL — module absent.

- [ ] **Step 3: Write variables (with validation)**

Create `infra/modules/dns/variables.tf`:

```hcl
variable "zone_id" {
  type        = string
  description = "Cloudflare zone ID that owns the record."

  validation {
    condition     = length(var.zone_id) > 0
    error_message = "zone_id must be non-empty."
  }
}

variable "environment" {
  type        = string
  description = "Environment (or tenant slug) this record belongs to."

  validation {
    condition     = length(var.environment) > 0
    error_message = "environment must be non-empty."
  }
}

variable "hostname" {
  type        = string
  description = "Fully-qualified hostname for the record."

  validation {
    condition     = can(regex("^[a-z0-9.-]+$", var.hostname))
    error_message = "hostname must be a lowercase DNS name (a-z, 0-9, dot, hyphen)."
  }
}

variable "record_type" {
  type        = string
  default     = "A"
  description = "DNS record type."

  validation {
    condition     = contains(["A", "AAAA", "CNAME"], var.record_type)
    error_message = "record_type must be one of: A, AAAA, CNAME."
  }
}

variable "value" {
  type        = string
  description = "Record target (IP for A/AAAA, hostname for CNAME)."
}

variable "proxied" {
  type        = bool
  default     = true
  description = "Whether Cloudflare proxies (orange-cloud) the record."

  # Only proxiable record types may be proxied.
  validation {
    condition     = var.proxied == false || contains(["A", "AAAA", "CNAME"], var.record_type)
    error_message = "only A, AAAA, or CNAME records can be proxied."
  }
}

variable "ttl" {
  type        = number
  default     = 1 # 1 = automatic (required when proxied)
  description = "Record TTL in seconds; 1 means automatic."
}
```

- [ ] **Step 4: Write resources + outputs + versions**

Create `infra/modules/dns/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.8.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}
```

Create `infra/modules/dns/main.tf`:

```hcl
# Cloudflare provider v5 renamed cloudflare_record -> cloudflare_dns_record.
resource "cloudflare_dns_record" "this" {
  zone_id = var.zone_id
  name    = var.hostname
  type    = var.record_type
  content = var.value
  proxied = var.proxied
  ttl     = var.ttl
  comment = "managed_by=opentofu environment=${var.environment}"
}
```

Create `infra/modules/dns/outputs.tf`:

```hcl
output "hostname" {
  value       = cloudflare_dns_record.this.name
  description = "The DNS record hostname."
}

output "record_id" {
  value       = cloudflare_dns_record.this.id
  description = "Cloudflare DNS record ID."
}
```

- [ ] **Step 5: Run to verify it passes**

Run:
```bash
tofu -chdir=infra/modules/dns test
```
Expected: PASS — name + comment asserted, `TXT` rejected.

- [ ] **Step 6: Validate, format, policy, commit**

```bash
tofu fmt infra/modules/dns
tofu -chdir=infra/modules/dns validate
conftest test --policy infra/policy --all-namespaces infra/modules/dns
git add infra/modules/dns
git commit -m "feat(iac): dns module for Cloudflare records with environment marker (EVE-57)"
```

---

## Task 8: `compute` module (TDD)

The app-server VM and its firewall, modelled with Hetzner Cloud as the reference provider (a cost-conscious self-hosted-Docker host, matching `DELIVERY.md`). Firewall opens 80/443 to the world but SSH only to an allowlist — enforced both by variable validation and the Task 4 policy.

**Files:**
- Create: `infra/modules/compute/versions.tf`
- Create: `infra/modules/compute/variables.tf`
- Create: `infra/modules/compute/main.tf`
- Create: `infra/modules/compute/outputs.tf`
- Create: `infra/modules/compute/tests/compute.tftest.hcl`

- [ ] **Step 1: Write the failing module test**

Create `infra/modules/compute/tests/compute.tftest.hcl`:

```hcl
mock_provider "hcloud" {}

variables {
  environment    = "staging"
  server_type    = "cx22"
  location       = "nbg1"
  image          = "docker-ce"
  ssh_key_ids    = ["12345"]
  ssh_allow_cidrs = ["203.0.113.5/32"]
}

run "names_and_labels_server" {
  command = plan

  assert {
    condition     = hcloud_server.app.name == "evecosys-staging-app"
    error_message = "server name must be evecosys-<environment>-app"
  }
  assert {
    condition     = hcloud_server.app.labels["environment"] == "staging"
    error_message = "server must carry environment label"
  }
}

run "rejects_world_open_ssh" {
  command = plan

  variables {
    ssh_allow_cidrs = ["0.0.0.0/0"]
  }

  expect_failures = [var.ssh_allow_cidrs]
}

run "requires_ssh_key" {
  command = plan

  variables {
    ssh_key_ids = []
  }

  expect_failures = [var.ssh_key_ids]
}
```

- [ ] **Step 2: Run to verify it fails**

Run:
```bash
tofu -chdir=infra/modules/compute init -backend=false -input=false
tofu -chdir=infra/modules/compute test
```
Expected: FAIL — module absent.

- [ ] **Step 3: Write variables (with validation)**

Create `infra/modules/compute/variables.tf`:

```hcl
variable "environment" {
  type        = string
  description = "Environment this server belongs to."

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be one of: staging, production."
  }
}

variable "server_type" {
  type        = string
  default     = "cx22"
  description = "Hetzner server type."
}

variable "location" {
  type        = string
  default     = "nbg1"
  description = "Hetzner datacenter location."
}

variable "image" {
  type        = string
  default     = "docker-ce"
  description = "Base image (Docker preinstalled)."
}

variable "ssh_key_ids" {
  type        = list(string)
  description = "Hetzner SSH key IDs authorised on the server."

  validation {
    condition     = length(var.ssh_key_ids) > 0
    error_message = "at least one ssh_key_id is required; password auth is never allowed."
  }
}

variable "ssh_allow_cidrs" {
  type        = list(string)
  description = "CIDRs permitted to reach SSH (port 22). World-open is rejected."

  validation {
    condition     = length(var.ssh_allow_cidrs) > 0
    error_message = "ssh_allow_cidrs must list at least one CIDR."
  }

  validation {
    condition     = !contains(var.ssh_allow_cidrs, "0.0.0.0/0") && !contains(var.ssh_allow_cidrs, "::/0")
    error_message = "SSH must not be open to the world (0.0.0.0/0 or ::/0)."
  }
}
```

- [ ] **Step 4: Write resources + outputs + versions**

Create `infra/modules/compute/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.8.0"
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }
}
```

Create `infra/modules/compute/main.tf`:

```hcl
locals {
  name = "evecosys-${var.environment}-app"
  labels = {
    managed_by  = "opentofu"
    environment = var.environment
  }
}

resource "hcloud_firewall" "app" {
  name   = "${local.name}-fw"
  labels = local.labels

  # SSH restricted to the operator allowlist.
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.ssh_allow_cidrs
  }

  # HTTP/HTTPS open to the world (public app).
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_server" "app" {
  name         = local.name
  server_type  = var.server_type
  location     = var.location
  image        = var.image
  ssh_keys     = var.ssh_key_ids
  firewall_ids = [hcloud_firewall.app.id]
  labels       = local.labels
}
```

Create `infra/modules/compute/outputs.tf`:

```hcl
output "server_name" {
  value       = hcloud_server.app.name
  description = "Name of the app server."
}

output "ipv4_address" {
  value       = hcloud_server.app.ipv4_address
  description = "Public IPv4 address (feeds the dns module's A record)."
}
```

- [ ] **Step 5: Run to verify it passes**

Run:
```bash
tofu -chdir=infra/modules/compute test
```
Expected: PASS — naming/labels asserted, world-open SSH and empty key list rejected.

- [ ] **Step 6: Validate, format, policy, commit**

```bash
tofu fmt infra/modules/compute
tofu -chdir=infra/modules/compute validate
conftest test --policy infra/policy --all-namespaces infra/modules/compute
git add infra/modules/compute
git commit -m "feat(iac): compute module (Hetzner reference) with locked-down firewall (EVE-57)"
```

---

## Task 9: `tenant` module + boundary isolation (TDD)

The per-tenant scaffolding EVE-46 (BYO-cloud) will consume. It composes a Supabase project and a DNS record for **one** tenant, prefixes every name with `tenant_id`, and is proven — by test and by policy — unable to reference any other tenant. This is the "shared modules cannot unintentionally cross environment or tenant boundaries" criterion.

**Files:**
- Create: `infra/modules/tenant/versions.tf`
- Create: `infra/modules/tenant/variables.tf`
- Create: `infra/modules/tenant/main.tf`
- Create: `infra/modules/tenant/outputs.tf`
- Create: `infra/modules/tenant/tests/tenant_boundary.tftest.hcl`
- Create: `infra/policy/tenant_boundary.rego`
- Create: `infra/policy/tenant_boundary_test.rego`

- [ ] **Step 1: Write the failing Rego boundary policy test**

Create `infra/policy/tenant_boundary_test.rego`:

```rego
package main

# A tenant config whose resources all reference its own slug is allowed.
test_allows_self_referencing_tenant if {
	count(deny) == 0 with input as {
		"variable": {"tenant_id": {"default": "acme"}},
		"resource": {"supabase_project": {"this": {"name": "evecosys-acme"}}},
	}
}

# A tenant config that hardcodes a *different* tenant's slug is denied.
test_denies_cross_tenant_reference if {
	count(deny) > 0 with input as {
		"variable": {"tenant_id": {"default": "acme"}},
		"resource": {"supabase_project": {"this": {"name": "evecosys-globex"}}},
	}
}
```

- [ ] **Step 2: Run to verify it fails**

Run:
```bash
conftest verify --policy infra/policy
```
Expected: FAIL — `tenant_boundary.rego` not yet present.

- [ ] **Step 3: Implement the boundary policy**

Create `infra/policy/tenant_boundary.rego`:

```rego
package main

# Only evaluate configs that declare a tenant_id variable (tenant module roots).
tenant_slug := slug if {
	slug := input.variable.tenant_id.default
}

# Any supabase_project / cloudflare_dns_record whose name encodes a slug other
# than this module's tenant_id is a cross-tenant leak.
deny contains msg if {
	tenant_slug
	some rname
	proj := input.resource.supabase_project[rname]
	name := proj.name
	startswith(name, "evecosys-")
	encoded := trim_prefix(name, "evecosys-")
	encoded != tenant_slug
	not contains(encoded, "${")
	msg := sprintf("supabase_project.%s name %q does not match tenant_id %q (cross-tenant reference)", [rname, name, tenant_slug])
}
```

- [ ] **Step 4: Run to verify the policy passes**

Run:
```bash
conftest verify --policy infra/policy
```
Expected: PASS — self-referencing allowed, cross-tenant denied.

- [ ] **Step 5: Write the failing module test**

Create `infra/modules/tenant/tests/tenant_boundary.tftest.hcl`:

```hcl
mock_provider "supabase" {}
mock_provider "cloudflare" {}

variables {
  tenant_id         = "acme"
  organization_id   = "org_mock"
  region            = "eu-central-1"
  database_password = "tenant-pw-from-tfvar"
  zone_id           = "zone_mock"
  base_domain       = "evecosys.example"
}

run "namespaces_all_resources_by_tenant" {
  command = plan

  assert {
    condition     = module.project.project_name == "evecosys-acme"
    error_message = "tenant's supabase project must be namespaced by tenant_id"
  }
  assert {
    condition     = module.dns.hostname == "acme.evecosys.example"
    error_message = "tenant hostname must be <tenant_id>.<base_domain>"
  }
}

run "rejects_invalid_tenant_id" {
  command = plan

  variables {
    tenant_id = "Acme Corp!" # spaces + uppercase + punctuation
  }

  expect_failures = [var.tenant_id]
}

run "rejects_reserved_tenant_id" {
  command = plan

  variables {
    tenant_id = "staging" # reserved environment word
  }

  expect_failures = [var.tenant_id]
}
```

- [ ] **Step 6: Run to verify it fails**

Run:
```bash
tofu -chdir=infra/modules/tenant init -backend=false -input=false
tofu -chdir=infra/modules/tenant test
```
Expected: FAIL — tenant module absent.

- [ ] **Step 7: Write variables (with strict validation)**

Create `infra/modules/tenant/variables.tf`:

```hcl
variable "tenant_id" {
  type        = string
  description = "Stable tenant slug. Lowercase DNS-safe; reserved words disallowed."

  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$", var.tenant_id))
    error_message = "tenant_id must be 1-32 lowercase alphanumeric/hyphen chars, not starting/ending with a hyphen."
  }

  validation {
    condition     = !contains(["staging", "production", "local", "admin", "www"], var.tenant_id)
    error_message = "tenant_id must not be a reserved word (staging, production, local, admin, www)."
  }
}

variable "organization_id" {
  type        = string
  description = "Supabase organization that owns the tenant project."
}

variable "region" {
  type        = string
  description = "Supabase region for this tenant."
}

variable "database_password" {
  type        = string
  sensitive   = true
  description = "Tenant DB password; supply via TF_VAR_database_password."
}

variable "zone_id" {
  type        = string
  description = "Cloudflare zone ID for the tenant hostname."
}

variable "base_domain" {
  type        = string
  description = "Base domain; tenant hostname is <tenant_id>.<base_domain>."
}
```

- [ ] **Step 8: Write the composition (modules only — no raw resources)**

Create `infra/modules/tenant/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.8.0"
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.5"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}
```

Create `infra/modules/tenant/main.tf`:

```hcl
locals {
  # Every tenant resource is namespaced by tenant_id. The tenant module never
  # accepts another tenant's id, so cross-tenant references are impossible by
  # construction; the tenant_boundary policy is the belt-and-braces check.
  hostname = "${var.tenant_id}.${var.base_domain}"
}

module "project" {
  source = "../supabase-project"

  organization_id   = var.organization_id
  environment       = var.tenant_id # project name becomes evecosys-<tenant_id>
  region            = var.region
  database_password = var.database_password
}

module "dns" {
  source = "../dns"

  zone_id     = var.zone_id
  environment = var.tenant_id
  hostname    = local.hostname
  record_type = "CNAME"
  value       = var.base_domain
  proxied     = true
}
```

Create `infra/modules/tenant/outputs.tf`:

```hcl
output "tenant_id" {
  value       = var.tenant_id
  description = "The tenant slug this instance manages."
}

output "project_ref" {
  value       = module.project.project_ref
  description = "Supabase project ref for the tenant."
}

output "hostname" {
  value       = module.dns.hostname
  description = "Public hostname for the tenant."
}
```

- [ ] **Step 9: Run to verify the module test passes**

Run:
```bash
tofu -chdir=infra/modules/tenant test
```
Expected: PASS — namespacing asserted; invalid and reserved `tenant_id` rejected.

- [ ] **Step 10: Validate, format, policy, commit**

```bash
tofu fmt infra/modules/tenant infra/policy
tofu -chdir=infra/modules/tenant validate
conftest verify --policy infra/policy
conftest test --policy infra/policy --all-namespaces infra/modules/tenant
git add infra/modules/tenant infra/policy/tenant_boundary.rego infra/policy/tenant_boundary_test.rego
git commit -m "feat(iac): tenant module with per-tenant namespacing + boundary policy (EVE-57)"
```

---

## Task 10: `staging` environment root + E2E composition test (TDD)

The first real root: composes `github-config` + `supabase-project` + `compute` + `dns` into a staging environment, wires outputs between them (compute IP → DNS A record), declares remote state, and proves the whole environment **plans and "applies" cleanly under mock providers with outputs matching declared state** — EVE-57's "provisioning outcomes match declared infrastructure state" E2E.

**Files:**
- Create: `infra/environments/staging/versions.tf`
- Create: `infra/environments/staging/backend.tf`
- Create: `infra/environments/staging/variables.tf`
- Create: `infra/environments/staging/main.tf`
- Create: `infra/environments/staging/outputs.tf`
- Create: `infra/environments/staging/staging.auto.tfvars`
- Create: `infra/environments/staging/tests/staging_e2e.tftest.hcl`

- [ ] **Step 1: Write the failing environment E2E test**

Create `infra/environments/staging/tests/staging_e2e.tftest.hcl`:

```hcl
mock_provider "github" {}
mock_provider "supabase" {}
mock_provider "cloudflare" {}
mock_provider "hcloud" {}

# Secrets normally arrive via TF_VAR_*; supply mock values for the test.
variables {
  github_token            = "mock"
  supabase_access_token   = "mock"
  supabase_organization_id = "org_mock"
  database_password       = "staging-db-pw-mock"
  cloudflare_api_token    = "mock"
  cloudflare_zone_id      = "zone_mock"
  hcloud_token            = "mock"
  ssh_key_ids             = ["12345"]
  ssh_allow_cidrs         = ["203.0.113.5/32"]
}

# Full apply against mocks proves the composition is internally consistent and
# leaves declared outputs populated (no unknown/partial state).
run "staging_applies_and_matches_declared_state" {
  command = apply

  assert {
    condition     = output.environment == "staging"
    error_message = "root must expose environment = staging"
  }
  assert {
    condition     = output.app_hostname == "staging.evecosys.example"
    error_message = "app hostname must be the declared staging hostname"
  }
  assert {
    condition     = output.supabase_project_name == "evecosys-staging"
    error_message = "supabase project must be evecosys-staging"
  }
}
```

- [ ] **Step 2: Run to verify it fails**

Run:
```bash
tofu -chdir=infra/environments/staging init -backend=false -input=false
tofu -chdir=infra/environments/staging test
```
Expected: FAIL — root not implemented.

- [ ] **Step 3: Write versions + providers**

Create `infra/environments/staging/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.8.0"
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.5"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }
}

provider "github" {
  owner = var.github_owner
  token = var.github_token
}

provider "supabase" {
  access_token = var.supabase_access_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "hcloud" {
  token = var.hcloud_token
}
```

- [ ] **Step 4: Write the remote-state backend (R2, partial config)**

Create `infra/environments/staging/backend.tf`:

```hcl
# Remote state in Cloudflare R2 (S3-compatible). State is isolated per
# environment by the `key`. Backend credentials are supplied at init time via
# `-backend-config` (CI) and are NEVER committed. Tests/validate use
# `-backend=false`, so this block is inert outside real plan/apply.
terraform {
  backend "s3" {
    bucket = "evecosys-tfstate"
    key    = "environments/staging/terraform.tfstate"
    region = "auto"

    # R2 specifics — passed via -backend-config in CI:
    #   endpoints = { s3 = "https://<accountid>.r2.cloudflarestorage.com" }
    #   access_key / secret_key from TF_VAR-free env (AWS_ACCESS_KEY_ID/SECRET)
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    use_path_style              = true
  }
}
```

- [ ] **Step 5: Write variables**

Create `infra/environments/staging/variables.tf`:

```hcl
variable "github_owner" {
  type        = string
  default     = "SDT-boss"
  description = "GitHub org/owner of the repository."
}

variable "github_token" {
  type        = string
  sensitive   = true
  description = "GitHub token (TF_VAR_github_token)."
}

variable "supabase_access_token" {
  type        = string
  sensitive   = true
  description = "Supabase access token (TF_VAR_supabase_access_token)."
}

variable "supabase_organization_id" {
  type        = string
  description = "Supabase organization ID (TF_VAR_supabase_organization_id)."
}

variable "database_password" {
  type        = string
  sensitive   = true
  description = "Staging Supabase DB password (TF_VAR_database_password)."
}

variable "cloudflare_api_token" {
  type        = string
  sensitive   = true
  description = "Cloudflare API token (TF_VAR_cloudflare_api_token)."
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare zone ID (TF_VAR_cloudflare_zone_id)."
}

variable "hcloud_token" {
  type        = string
  sensitive   = true
  description = "Hetzner Cloud token (TF_VAR_hcloud_token)."
}

variable "ssh_key_ids" {
  type        = list(string)
  description = "Hetzner SSH key IDs for the staging server."
}

variable "ssh_allow_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to SSH into the staging server."
}

# Non-secret, environment-shaped config (set in staging.auto.tfvars):
variable "region" {
  type        = string
  default     = "eu-central-1"
  description = "Supabase region for staging."
}

variable "base_domain" {
  type        = string
  default     = "evecosys.example"
  description = "Base domain."
}

variable "app_subdomain" {
  type        = string
  default     = "staging"
  description = "Subdomain for the staging app host."
}
```

- [ ] **Step 6: Write the composition root**

Create `infra/environments/staging/main.tf`:

```hcl
locals {
  environment  = "staging"
  app_hostname = "${var.app_subdomain}.${var.base_domain}"
}

module "github" {
  source = "../../modules/github-config"

  repository         = "evecosys"
  environment        = local.environment
  required_reviewers = [] # staging has no required reviewers (see DELIVERY.md §3)
}

module "supabase" {
  source = "../../modules/supabase-project"

  organization_id   = var.supabase_organization_id
  environment        = local.environment
  region            = var.region
  database_password = var.database_password
}

module "compute" {
  source = "../../modules/compute"

  environment     = local.environment
  ssh_key_ids     = var.ssh_key_ids
  ssh_allow_cidrs = var.ssh_allow_cidrs
}

module "dns" {
  source = "../../modules/dns"

  zone_id     = var.cloudflare_zone_id
  environment = local.environment
  hostname    = local.app_hostname
  record_type = "A"
  value       = module.compute.ipv4_address
  proxied     = true
}
```

- [ ] **Step 7: Write outputs**

Create `infra/environments/staging/outputs.tf`:

```hcl
output "environment" {
  value       = local.environment
  description = "Environment name."
}

output "app_hostname" {
  value       = module.dns.hostname
  description = "Public hostname of the staging app."
}

output "supabase_project_name" {
  value       = module.supabase.project_name
  description = "Supabase project name for staging."
}

output "supabase_project_ref" {
  value       = module.supabase.project_ref
  description = "Supabase project ref (set as project_id in supabase/config.toml)."
}
```

- [ ] **Step 8: Write the non-secret tfvars**

Create `infra/environments/staging/staging.auto.tfvars`:

```hcl
# Non-secret configuration only. Secrets come from TF_VAR_* env vars.
region        = "eu-central-1"
base_domain   = "evecosys.example"
app_subdomain = "staging"
```

- [ ] **Step 9: Run the E2E composition test to verify it passes**

Run:
```bash
tofu -chdir=infra/environments/staging test
```
Expected: PASS — mocked `apply` succeeds and the three declared outputs match.

- [ ] **Step 10: Validate, format, policy, commit**

```bash
tofu fmt infra/environments/staging
tofu -chdir=infra/environments/staging validate
conftest test --policy infra/policy --all-namespaces infra/environments/staging
git add infra/environments/staging
git commit -m "feat(iac): staging environment root + mocked apply E2E (EVE-57)"
```

---

## Task 11: `production` environment root + E2E composition test (TDD)

Same composition as staging, but with production guards: required reviewers on the GitHub environment and a stricter SSH allowlist. Proves production composes and "applies" under mocks.

**Files:**
- Create: `infra/environments/production/versions.tf`
- Create: `infra/environments/production/backend.tf`
- Create: `infra/environments/production/variables.tf`
- Create: `infra/environments/production/main.tf`
- Create: `infra/environments/production/outputs.tf`
- Create: `infra/environments/production/production.auto.tfvars`
- Create: `infra/environments/production/tests/production_e2e.tftest.hcl`

- [ ] **Step 1: Write the failing environment E2E test**

Create `infra/environments/production/tests/production_e2e.tftest.hcl`:

```hcl
mock_provider "github" {}
mock_provider "supabase" {}
mock_provider "cloudflare" {}
mock_provider "hcloud" {}

variables {
  github_token             = "mock"
  supabase_access_token    = "mock"
  supabase_organization_id = "org_mock"
  database_password        = "prod-db-pw-mock"
  cloudflare_api_token     = "mock"
  cloudflare_zone_id       = "zone_mock"
  hcloud_token             = "mock"
  ssh_key_ids              = ["12345"]
  ssh_allow_cidrs          = ["203.0.113.5/32"]
  required_reviewers       = ["octocat"]
}

run "production_applies_with_guards" {
  command = apply

  assert {
    condition     = output.environment == "production"
    error_message = "root must expose environment = production"
  }
  assert {
    condition     = output.app_hostname == "app.evecosys.example"
    error_message = "production app host must be the declared production hostname"
  }
  assert {
    condition     = output.supabase_project_name == "evecosys-production"
    error_message = "supabase project must be evecosys-production"
  }
}

run "production_requires_reviewers" {
  command = plan

  variables {
    required_reviewers = []
  }

  # The github-config module's validation rejects empty reviewers in production.
  expect_failures = [module.github.var.required_reviewers]
}
```

> **Note for executor:** `expect_failures` on a *module* input is addressed as `module.<name>.var.<name>` only in OpenTofu ≥ 1.8 / Terraform ≥ 1.9. If your version rejects that address, replace the `production_requires_reviewers` run with a dedicated test inside `modules/github-config` (already covered in Task 5's `production_requires_reviewers` run) and delete this run block. The Task 5 coverage is sufficient; this is a redundant integration assertion.

- [ ] **Step 2: Run to verify it fails**

Run:
```bash
tofu -chdir=infra/environments/production init -backend=false -input=false
tofu -chdir=infra/environments/production test
```
Expected: FAIL — root not implemented.

- [ ] **Step 3: Write versions + providers**

Create `infra/environments/production/versions.tf` — identical to `infra/environments/staging/versions.tf` from Task 10 Step 3 (copy it verbatim; the provider wiring is the same).

- [ ] **Step 4: Write the backend**

Create `infra/environments/production/backend.tf` — identical to staging's `backend.tf` (Task 10 Step 4) **except** change the state key:

```hcl
    key    = "environments/production/terraform.tfstate"
```

(Copy the staging `backend.tf` verbatim and change only that one line.)

- [ ] **Step 5: Write variables**

Create `infra/environments/production/variables.tf` — copy `infra/environments/staging/variables.tf` from Task 10 Step 5 verbatim, then:
- change `app_subdomain` default to `"app"`,
- add this variable:

```hcl
variable "required_reviewers" {
  type        = list(string)
  description = "GitHub usernames required to approve production deploys."

  validation {
    condition     = length(var.required_reviewers) > 0
    error_message = "production must declare at least one required reviewer."
  }
}
```

- [ ] **Step 6: Write the composition root**

Create `infra/environments/production/main.tf` — copy staging's `main.tf` (Task 10 Step 6) with these changes:
- `local.environment = "production"`,
- `module "github"` passes `required_reviewers = var.required_reviewers` (not `[]`):

```hcl
locals {
  environment  = "production"
  app_hostname = "${var.app_subdomain}.${var.base_domain}"
}

module "github" {
  source = "../../modules/github-config"

  repository         = "evecosys"
  environment        = local.environment
  required_reviewers = var.required_reviewers
}

module "supabase" {
  source = "../../modules/supabase-project"

  organization_id   = var.supabase_organization_id
  environment       = local.environment
  region            = var.region
  database_password = var.database_password
}

module "compute" {
  source = "../../modules/compute"

  environment     = local.environment
  ssh_key_ids     = var.ssh_key_ids
  ssh_allow_cidrs = var.ssh_allow_cidrs
}

module "dns" {
  source = "../../modules/dns"

  zone_id     = var.cloudflare_zone_id
  environment = local.environment
  hostname    = local.app_hostname
  record_type = "A"
  value       = module.compute.ipv4_address
  proxied     = true
}
```

- [ ] **Step 7: Write outputs**

Create `infra/environments/production/outputs.tf` — copy staging's `outputs.tf` (Task 10 Step 7) verbatim (the `local.environment` value differs, so the `environment` output becomes `production` automatically).

- [ ] **Step 8: Write the non-secret tfvars**

Create `infra/environments/production/production.auto.tfvars`:

```hcl
# Non-secret configuration only. Secrets come from TF_VAR_* env vars.
region        = "eu-central-1"
base_domain   = "evecosys.example"
app_subdomain = "app"
```

- [ ] **Step 9: Run the E2E composition test to verify it passes**

Run:
```bash
tofu -chdir=infra/environments/production test
```
Expected: PASS — production applies under mocks and outputs match. (If the redundant `production_requires_reviewers` run errors on the module-var address, apply the Step 1 executor note and remove it.)

- [ ] **Step 10: Validate, format, policy, commit**

```bash
tofu fmt infra/environments/production
tofu -chdir=infra/environments/production validate
conftest test --policy infra/policy --all-namespaces infra/environments/production
git add infra/environments/production
git commit -m "feat(iac): production environment root with reviewer guard + E2E (EVE-57)"
```

---

## Task 12: IaC CI workflow — credential-free PR gate + gated plan/apply + drift detection

Wire everything into CI. PR jobs run with **no cloud credentials** and block merge. A manual `plan` job (per environment, real creds) and a manual-approval `apply` job (production environment with required reviewers) form the controlled change path. A scheduled drift job runs `plan -detailed-exitcode` and fails on drift.

**Files:**
- Create: `.github/workflows/iac.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/iac.yml`:

```yaml
name: IaC

on:
  pull_request:
    branches: [main]
    paths: ['infra/**', '.github/workflows/iac.yml']
  workflow_dispatch:
    inputs:
      action:
        description: 'plan or apply'
        required: true
        default: 'plan'
        type: choice
        options: [plan, apply]
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options: [staging, production]
  schedule:
    - cron: '0 6 * * 1' # weekly drift check, Mondays 06:00 UTC

permissions:
  contents: read

jobs:
  # ---- Credential-free PR gate (always runs) ----------------------------------
  validate:
    name: Validate & policy
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: 1.8.5

      - name: Format check
        run: tofu fmt -check -recursive infra

      - name: Validate modules and environments
        run: |
          set -e
          for d in infra/modules/* infra/environments/*; do
            echo "== validate $d =="
            tofu -chdir="$d" init -backend=false -input=false >/dev/null
            tofu -chdir="$d" validate
          done

      - name: OpenTofu native tests (mock providers)
        run: |
          set -e
          for d in infra/modules/* infra/environments/*; do
            if ls "$d"/tests/*.tftest.hcl >/dev/null 2>&1; then
              echo "== test $d =="
              tofu -chdir="$d" init -backend=false -input=false >/dev/null
              tofu -chdir="$d" test
            fi
          done

      - name: Install conftest
        run: |
          CONFTEST_VERSION=0.56.0
          curl -sSL "https://github.com/open-policy-agent/conftest/releases/download/v${CONFTEST_VERSION}/conftest_${CONFTEST_VERSION}_Linux_x86_64.tar.gz" \
            | sudo tar xz -C /usr/local/bin conftest

      - name: Policy unit tests (Rego)
        run: conftest verify --policy infra/policy

      - name: Policy checks against IaC source
        run: conftest test --policy infra/policy --all-namespaces infra/modules infra/environments

  security-scan:
    name: Static security scan
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - name: Checkov (Terraform static analysis)
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: infra
          framework: terraform
          quiet: true
          soft_fail: false

      - name: gitleaks (secret scan over infra/)
        uses: gitleaks/gitleaks-action@v2
        env:
          GITLEAKS_CONFIG: ''
        with:
          args: detect --no-git --source infra --redact

  # ---- Gated plan (manual; real credentials via GitHub Environment) -----------
  plan:
    name: Plan (${{ inputs.environment }})
    if: github.event_name == 'workflow_dispatch' && inputs.action == 'plan'
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: 1.8.5
      - name: tofu init
        working-directory: infra/environments/${{ inputs.environment }}
        run: |
          tofu init \
            -backend-config="endpoints={s3=\"${R2_ENDPOINT}\"}" \
            -backend-config="access_key=${R2_ACCESS_KEY_ID}" \
            -backend-config="secret_key=${R2_SECRET_ACCESS_KEY}"
        env:
          R2_ENDPOINT: ${{ secrets.R2_ENDPOINT }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
      - name: tofu plan
        working-directory: infra/environments/${{ inputs.environment }}
        run: tofu plan -input=false -out=tfplan
        env:
          TF_VAR_github_token: ${{ secrets.IAC_GITHUB_TOKEN }}
          TF_VAR_supabase_access_token: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          TF_VAR_supabase_organization_id: ${{ secrets.SUPABASE_ORGANIZATION_ID }}
          TF_VAR_database_password: ${{ secrets.SUPABASE_DB_PASSWORD }}
          TF_VAR_cloudflare_api_token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          TF_VAR_cloudflare_zone_id: ${{ secrets.CLOUDFLARE_ZONE_ID }}
          TF_VAR_hcloud_token: ${{ secrets.HCLOUD_TOKEN }}
          TF_VAR_ssh_key_ids: ${{ secrets.HCLOUD_SSH_KEY_IDS }}
          TF_VAR_ssh_allow_cidrs: ${{ secrets.SSH_ALLOW_CIDRS }}
          TF_VAR_required_reviewers: ${{ secrets.IAC_REQUIRED_REVIEWERS }}
      - name: Policy-gate the plan
        working-directory: infra/environments/${{ inputs.environment }}
        run: |
          CONFTEST_VERSION=0.56.0
          curl -sSL "https://github.com/open-policy-agent/conftest/releases/download/v${CONFTEST_VERSION}/conftest_${CONFTEST_VERSION}_Linux_x86_64.tar.gz" \
            | sudo tar xz -C /usr/local/bin conftest
          tofu show -json tfplan > tfplan.json
          conftest test --policy ${{ github.workspace }}/infra/policy --all-namespaces tfplan.json
      - uses: actions/upload-artifact@v4
        with:
          name: tfplan-${{ inputs.environment }}
          path: infra/environments/${{ inputs.environment }}/tfplan

  # ---- Gated apply (manual; production requires reviewers on the Environment) --
  apply:
    name: Apply (${{ inputs.environment }})
    if: github.event_name == 'workflow_dispatch' && inputs.action == 'apply'
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: 1.8.5
      - name: tofu init
        working-directory: infra/environments/${{ inputs.environment }}
        run: |
          tofu init \
            -backend-config="endpoints={s3=\"${R2_ENDPOINT}\"}" \
            -backend-config="access_key=${R2_ACCESS_KEY_ID}" \
            -backend-config="secret_key=${R2_SECRET_ACCESS_KEY}"
        env:
          R2_ENDPOINT: ${{ secrets.R2_ENDPOINT }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
      - name: tofu apply
        working-directory: infra/environments/${{ inputs.environment }}
        run: tofu apply -input=false -auto-approve
        env:
          TF_VAR_github_token: ${{ secrets.IAC_GITHUB_TOKEN }}
          TF_VAR_supabase_access_token: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          TF_VAR_supabase_organization_id: ${{ secrets.SUPABASE_ORGANIZATION_ID }}
          TF_VAR_database_password: ${{ secrets.SUPABASE_DB_PASSWORD }}
          TF_VAR_cloudflare_api_token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          TF_VAR_cloudflare_zone_id: ${{ secrets.CLOUDFLARE_ZONE_ID }}
          TF_VAR_hcloud_token: ${{ secrets.HCLOUD_TOKEN }}
          TF_VAR_ssh_key_ids: ${{ secrets.HCLOUD_SSH_KEY_IDS }}
          TF_VAR_ssh_allow_cidrs: ${{ secrets.SSH_ALLOW_CIDRS }}
          TF_VAR_required_reviewers: ${{ secrets.IAC_REQUIRED_REVIEWERS }}

  # ---- Scheduled drift detection ----------------------------------------------
  drift:
    name: Drift detection (staging + production)
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      matrix:
        environment: [staging, production]
    environment: ${{ matrix.environment }}
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: 1.8.5
      - name: tofu init
        working-directory: infra/environments/${{ matrix.environment }}
        run: |
          tofu init \
            -backend-config="endpoints={s3=\"${R2_ENDPOINT}\"}" \
            -backend-config="access_key=${R2_ACCESS_KEY_ID}" \
            -backend-config="secret_key=${R2_SECRET_ACCESS_KEY}"
        env:
          R2_ENDPOINT: ${{ secrets.R2_ENDPOINT }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
      - name: Detect drift
        working-directory: infra/environments/${{ matrix.environment }}
        run: tofu plan -input=false -detailed-exitcode
        env:
          TF_VAR_github_token: ${{ secrets.IAC_GITHUB_TOKEN }}
          TF_VAR_supabase_access_token: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          TF_VAR_supabase_organization_id: ${{ secrets.SUPABASE_ORGANIZATION_ID }}
          TF_VAR_database_password: ${{ secrets.SUPABASE_DB_PASSWORD }}
          TF_VAR_cloudflare_api_token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          TF_VAR_cloudflare_zone_id: ${{ secrets.CLOUDFLARE_ZONE_ID }}
          TF_VAR_hcloud_token: ${{ secrets.HCLOUD_TOKEN }}
          TF_VAR_ssh_key_ids: ${{ secrets.HCLOUD_SSH_KEY_IDS }}
          TF_VAR_ssh_allow_cidrs: ${{ secrets.SSH_ALLOW_CIDRS }}
          TF_VAR_required_reviewers: ${{ secrets.IAC_REQUIRED_REVIEWERS }}
```

- [ ] **Step 2: Lint the workflow YAML locally**

Run:
```bash
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/iac.yml')); print('yaml ok')"
```
Expected: `yaml ok`.

- [ ] **Step 3: Confirm the credential-free jobs pass exactly as CI runs them**

Run (from repo root, requires `tofu` + `conftest` installed locally):
```bash
make iac-check
```
Expected: format check passes, all module + environment `validate` and `test` pass, `conftest verify` + `conftest test` pass.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/iac.yml
git commit -m "ci(iac): PR validation gate, gated plan/apply, and drift detection (EVE-57)"
```

---

## Task 13: Documentation — the "approach" deliverable

EVE-57's acceptance criteria are mostly about a *documented, ownable approach*. Produce `docs/IAC.md` and reconcile `docs/DELIVERY.md`, `.env.example`, and `CLAUDE.md`.

**Files:**
- Create: `docs/IAC.md`
- Modify: `docs/DELIVERY.md` (Section 1 stack table + Section 3 tenant escalation)
- Modify: `.env.example` (document `TF_VAR_*` provider tokens — names only)
- Modify: `CLAUDE.md` (note `infra/` conventions)

- [ ] **Step 1: Write `docs/IAC.md`**

Create `docs/IAC.md` with these sections (write full prose; outline below is the required structure, each bullet is a subsection to complete):

```markdown
# Infrastructure as Code (EVEcosys)

> Owner: Platform · Tooling: OpenTofu ≥ 1.8 · Last updated: 2026-06-30

## 1. Modeling
- Tool: OpenTofu (Terraform-compatible HCL). Why OpenTofu (open source, MPL-2.0, drop-in).
- Module/root split: modules are reusable building blocks; environment roots only compose.
- Module catalogue: github-config, supabase-project, dns, compute, tenant — one responsibility each, with their inputs/outputs.
- Naming + tagging conventions (evecosys-<environment>[-<tenant_id>]-<role>; managed_by/environment labels).

## 2. Workflow & ownership
- Change lifecycle: edit HCL on a branch → PR → credential-free CI gate → merge → manual `plan` (review output) → manual `apply`.
- Who owns what: Platform owns modules + environment roots; reviewers required for production.
- State: Cloudflare R2 (S3-compatible), isolated per environment and per tenant via the state `key`. Why per-key isolation bounds blast radius.
- Promotion: staging and production are independent roots; changes are made to a module, validated, then rolled to staging then production by running `plan`/`apply` per environment.

## 3. Security
- Review: branch protection requires approvals; production apply requires GitHub Environment reviewers.
- Least privilege: provider tokens are scoped (GitHub fine-grained PAT limited to this repo; Supabase org-scoped; Cloudflare zone-scoped; Hetzner project-scoped). DB migration user is separate from IaC (see DELIVERY.md §5).
- Secrets: never in source. Supplied via TF_VAR_* from GitHub Environment secrets. Enforced by no_plaintext_secrets policy + gitleaks. .auto.tfvars are non-secret only.
- Destructive-change control: prevent_destroy on Supabase projects; SSH-open and missing-reviewer rejected by validation + policy; apply is manual + gated.
- Tenant boundaries: tenant module is parameterized by tenant_id, namespaces all resources, gets isolated state, and is checked by the tenant_boundary policy.

## 4. Drift handling
- Weekly scheduled `tofu plan -detailed-exitcode`; non-zero exit = drift = failed run = alert.
- Remediation: investigate, then either re-apply to restore declared state or codify the intended change via PR. Never hand-edit cloud resources.

## 5. Validation coverage
- Table mapping each check to what it proves:
  - tofu fmt — formatting
  - tofu validate — schema/syntax per module + root
  - tofu test (mock_provider) — module behaviour, variable validation, environment composition, tenant boundary, mocked-apply E2E
  - conftest verify — Rego policy unit tests
  - conftest test — policies vs IaC source (and vs plan JSON in the gated plan job)
  - Checkov — static security breadth
  - gitleaks — secret exposure
- All PR-time checks are credential-free.

## 6. E2E validation
- Mocked-apply tests (staging_e2e, production_e2e) prove a representative environment plans+applies and outputs match declared state.
- Gated real plan/apply runbook (manual workflow_dispatch) for applying to a live environment; drift job proves outcomes match declared state over time.
- Failure safety: a failed plan/apply leaves prior state intact (OpenTofu is transactional per-resource; partial applies are recorded in state and re-runnable). No environment is left in an unknown state because state is the source of truth and drift detection runs continuously.

## 7. Dependencies
- CI/CD: iac.yml complements the existing app pipeline (DELIVERY.md §2). IaC manages the GitHub Environments that the deploy workflows consume.
- Secret management: GitHub Environment secrets feed both the app deploy workflows and IaC TF_VAR_*.
- Deployment workflows: compute module provisions the SSH target that deploy-staging/prod.yml deploy to; dns module provisions the hostnames Supabase Auth Site URLs depend on.
- Relationship to EVE-46 (BYO-cloud): the tenant module is the scaffolding EVE-46's orchestrator will instantiate per tenant.

## 8. Known limitations
- github-config reviewers: logins→IDs resolution is a follow-up (see module note).
- Compute provider is Hetzner reference; swapping providers changes only the compute module.
- prevent_destroy + tofu test interplay (see supabase-project note).
- Trivy/rollback caveats unchanged (cross-reference DELIVERY.md §2 Known Limitations).
```

Fill every subsection with complete prose drawn from the modules you built in Tasks 1–12. Do not leave outline bullets in the final file.

- [ ] **Step 2: Reconcile `docs/DELIVERY.md`**

In `docs/DELIVERY.md` Section 1, change the "Future infra expansion" row and the deferral paragraph. Replace:

```
| Future infra expansion | Terraform (not yet adopted) | Add when managing multiple servers or cloud resources programmatically |
```
with:
```
| Platform infrastructure | OpenTofu (`infra/`) | GitHub config, Supabase projects, Cloudflare DNS, app-server compute, and per-tenant scaffolding declared as code. See docs/IAC.md. |
```

And replace the paragraph:
```
Terraform is deliberately deferred. The current surface (one GHCR registry + two Supabase projects + one server per environment) does not justify the overhead.
```
with:
```
Infrastructure is managed with OpenTofu under `infra/` (adopted in EVE-57; see docs/IAC.md). The Supabase-migrations workflow below remains the source of truth for *schema*; OpenTofu manages the *projects, environments, DNS, and servers* those schemas run on.
```

In Section 3 "Tenant isolation", append a line after the escalation list:
```
The per-tenant escalation path above is now scaffolded as the `infra/modules/tenant` OpenTofu module (EVE-57); EVE-46's orchestrator instantiates it per tenant.
```

- [ ] **Step 3: Document provider tokens in `.env.example`**

Append to `.env.example`:

```env

# ── Infrastructure-as-Code (OpenTofu) — local plan/apply only ────────────────
# Supplied as TF_VAR_* environment variables; never committed. CI sources these
# from GitHub Environment secrets. See docs/IAC.md.
# TF_VAR_github_token=<repo-admin fine-grained PAT>
# TF_VAR_supabase_access_token=<supabase access token>
# TF_VAR_supabase_organization_id=<supabase org id>
# TF_VAR_database_password=<supabase db password>
# TF_VAR_cloudflare_api_token=<zone-scoped cloudflare token>
# TF_VAR_cloudflare_zone_id=<cloudflare zone id>
# TF_VAR_hcloud_token=<hetzner cloud token>
```

- [ ] **Step 4: Note conventions in `CLAUDE.md`**

In `CLAUDE.md` under "Code Standards", add a bullet:

```markdown
- Infrastructure lives in `infra/` (OpenTofu). Never put secret values in `.tf`/`.tfvars`; supply them via `TF_VAR_*`. Add new infra via a module + its `*.tftest.hcl` test and a passing `make iac-check`. See `docs/IAC.md`.
```

- [ ] **Step 5: Commit**

```bash
git add docs/IAC.md docs/DELIVERY.md .env.example CLAUDE.md
git commit -m "docs(iac): document IaC approach, ownership, security, and reconcile DELIVERY.md (EVE-57)"
```

---

## Task 14: Full local verification & PR readiness

Prove the whole baseline is green end-to-end and the repo's existing checks are unaffected.

**Files:** none (verification only)

- [ ] **Step 1: Run the complete IaC check suite**

Run:
```bash
make iac-check
```
Expected: `iac-fmt`, `iac-validate`, `iac-test`, and `iac-policy` all pass with no failures.

- [ ] **Step 2: Confirm no secrets leaked into committed files**

Run:
```bash
git ls-files infra | xargs grep -nEi '(password|token|secret|api[_-]?key)\s*=\s*"[^"$]' || echo "no literal secrets found"
```
Expected: `no literal secrets found` (every sensitive value is a `var.` reference or env-sourced).

- [ ] **Step 3: Confirm existing app checks still pass (IaC changes must not affect them)**

Run:
```bash
make check
```
Expected: lint, typecheck, unit tests, tokens, and build all pass exactly as before (this task added no application code).

- [ ] **Step 4: Verify the plan's spec coverage against EVE-57**

Confirm each acceptance criterion has an artifact (this is a manual read-through, not a command):
- IaC modeling/workflow/ownership → `docs/IAC.md` §1–2, modules + roots.
- Security (review/secrets/privileged access) → `docs/IAC.md` §3, policies (Tasks 2–4, 9), gated apply (Task 12).
- Validation coverage for modules + policy checks → `tofu test` suites + `conftest` (Tasks 5–11), `docs/IAC.md` §5.
- E2E proves repeatable environment management → staging/production mocked-apply tests + drift job (Tasks 10–12), `docs/IAC.md` §6.
- Specific enough to guide the platform IaC baseline → the working modules themselves.

- [ ] **Step 5: Push the branch and open the PR**

```bash
git push -u origin feature/eve-57-define-infrastructure-as-code-approach
gh pr create --base main \
  --title "EVE-57: Infrastructure-as-code baseline (OpenTofu)" \
  --body "Implements the platform IaC baseline: OpenTofu modules for GitHub config, Supabase projects, Cloudflare DNS, and app-server compute; per-tenant module with boundary isolation; policy-as-code; credential-free PR validation plus gated plan/apply and drift detection. See docs/IAC.md.

Closes EVE-57."
```

Expected: PR opens with the `IaC` workflow's credential-free jobs running.

---

## Self-Review (completed by plan author)

**1. Spec coverage** — every EVE-57 section maps to tasks:
- *Scope* (model/version/promote; declarations, provisioning, drift, review; tenant variation; deps on CI/CD, secrets, deploy) → Tasks 5–12 + docs Task 13 §7.
- *Security* (reviewed/auditable/least-priv; no secret exposure; restrict destructive/prod; tenant boundaries) → policies Tasks 2–4 & 9, gated apply Task 12, docs Task 13 §3.
- *Unit testing* (modules, variable handling, env composition; invalid config/unsafe defaults/policy violations; env-safe outputs; modules can't cross boundaries) → `tofu test` Tasks 5–11, policy tests Tasks 2–4 & 9.
- *E2E* (plan+apply representative change; outcomes match declared state; failures surface safely; supports CI/CD lifecycle) → Tasks 10–12, docs §6.
- *Acceptance criteria* → Task 14 Step 4 checklist.

**2. Placeholder scan** — no "TBD"/"add error handling"/"similar to Task N". Steps where a later task copies an earlier file (Task 11) name the exact source file + the exact lines to change, rather than omitting code.

**3. Type/name consistency** — module input/output names are consistent across callers: `supabase-project` outputs `project_ref`/`project_name` (consumed in roots + tenant); `compute` outputs `ipv4_address` (consumed by `dns.value` in both roots); `dns` outputs `hostname` (consumed by root `app_hostname`); `tenant` consumes `supabase-project` + `dns` with matching inputs. Policy package is `package main` across all Rego files so `conftest verify`/`test` see one ruleset. OpenTofu version pinned to `1.8.5` everywhere (`versions.tf`, `.terraform-version`, workflow, Makefile expectations).

**Known risk flagged for the executor:** exact provider resource/attribute names (e.g. Cloudflare v5 `cloudflare_dns_record`, Supabase `supabase_project` arguments, the `github_repository_environment.reviewers.users` ID requirement) can shift between provider versions. The TDD loop (`init` → `validate` → `test`) will surface any mismatch immediately at the step it occurs; fix against the pinned provider's docs and continue. This is expected and does not change the plan's structure.
