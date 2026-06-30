# Infrastructure as Code (EVEcosys)

> Owner: Platform · Tooling: OpenTofu ≥ 1.9 · Last updated: 2026-06-30

---

## 1. Modeling

### Tool choice

EVEcosys uses **OpenTofu** for all cloud infrastructure declarations. OpenTofu is the open-source fork of Terraform maintained by the Linux Foundation after HashiCorp changed Terraform's license from MPL-2.0 to the Business Source License in 2023. OpenTofu is licensed MPL-2.0, uses the same HCL syntax, the same provider ecosystem, and the same state format as Terraform — existing Terraform skills and tooling transfer without modification.

CI pins version 1.9.0 via `infra/.terraform-version` and the `opentofu/setup-opentofu@v1` action. The `required_version` constraint in every `versions.tf` is `>= 1.9.0` — required because the modules use cross-variable references in `validation` blocks (e.g. the `required_reviewers` rule references `var.environment`), a feature added in OpenTofu 1.9. The constraint allows local use of newer releases (the development machine used during EVE-57 ran 1.12.3) while locking CI to the reproducible pinned version.

### Module / root split

The `infra/` tree separates reusable **modules** from opinionated **environment roots**:

```
infra/
  .terraform-version          # pins OpenTofu 1.9.0 for CI
  versions.tf                 # shared provider and version constraints
  modules/
    github-config/            # repo environments + branch protection
    supabase-project/         # Supabase project provisioning
    dns/                      # Cloudflare DNS record
    compute/                  # Hetzner server + firewall
    tenant/                   # per-tenant composite (supabase-project + dns)
  environments/
    staging/                  # staging root: composes all four modules
    production/               # production root: composes all four modules + reviewer guard
  policy/                     # conftest/Rego policies and unit tests
```

Modules accept typed variables and export named outputs. They never declare a backend block and carry no environment-specific configuration. Environment roots import modules, wire their outputs together (for example, feeding `module.compute.ipv4_address` into `module.dns`), and declare the remote backend. This separation means every module can be tested in isolation with `mock_provider` and reused across environments without duplication.

### Module catalogue

**`github-config`** — Provisions one `github_repository_environment` (the GitHub Environment that gates CI deployments) and one `github_branch_protection` rule.

Key inputs:
- `repository` — GitHub repository name (non-empty string).
- `environment` — must be `staging` or `production`.
- `required_reviewers` — list of GitHub login strings; validated non-empty when `environment = "production"`.
- `required_approvals` — number of PR reviews required before merge (default 1, minimum 1).
- `required_status_checks` — CI job names that must pass (default: lint, test, build, audit).

Key outputs: `environment_name`, `protected_branch`.

**`supabase-project`** — Provisions one `supabase_project` resource in the declared organization.

Key inputs:
- `organization_id` — Supabase org that owns the project.
- `environment` — logical label included in the project name (staging, production, or a tenant slug).
- `name_prefix` — prefix for the project name (default: evecosys); project is named `<name_prefix>-<environment>`.
- `region` — must be one of: eu-central-1, eu-west-1, eu-west-2, us-east-1, us-west-1.
- `database_password` — sensitive string, minimum 12 characters, must be supplied via `TF_VAR_database_password`.

Key outputs: `project_ref` (the Supabase project ID), `project_name`.

**`dns`** — Provisions one `cloudflare_dns_record` (Cloudflare provider v5 resource).

Key inputs:
- `zone_id` — Cloudflare zone that owns the record.
- `environment` — environment or tenant slug, embedded in the record's `comment` field.
- `hostname` — fully-qualified DNS name (lowercase, alphanumeric, dots, hyphens).
- `record_type` — A, AAAA, or CNAME.
- `value` — record target (IP for A/AAAA; hostname for CNAME).
- `proxied` — whether Cloudflare proxies the record (default true).
- `ttl` — TTL in seconds; 1 means automatic (required when proxied, default 1).

The record's `comment` is always `managed_by=opentofu environment=<env>`, which satisfies the `require_environment_tag` policy.

Key outputs: `hostname`, `record_id`.

**`compute`** — Provisions one `hcloud_firewall` and one `hcloud_server` on Hetzner Cloud.

The firewall allows SSH (port 22) only to the operator-supplied `ssh_allow_cidrs` allowlist; HTTP (port 80) and HTTPS (port 443) are open to the world (`0.0.0.0/0` and `::/0`). Variable validation in the module rejects any `ssh_allow_cidrs` value of `0.0.0.0/0` or `::/0`. The server's `firewall_ids` is `[tonumber(hcloud_firewall.app.id)]` because the Hetzner provider exposes the firewall's `id` attribute as a string and the `firewall_ids` argument expects `set(number)`.

Key inputs:
- `environment` — staging or production.
- `ssh_key_ids` — list of Hetzner SSH key IDs; at least one required (password authentication is never enabled).
- `ssh_allow_cidrs` — CIDRs that may reach port 22; world-open values are rejected.
- `server_type` — Hetzner server type (default cx22).
- `location` — Hetzner datacenter (default nbg1).
- `image` — base image (default docker-ce).

Both resources carry labels `managed_by = "opentofu"` and `environment = <env>`.

Key outputs: `server_name` (e.g., `evecosys-staging-app`), `ipv4_address` (fed to the `dns` module).

**`tenant`** — Composite module that provisions a Supabase project and a DNS record for a single enterprise tenant, reusing `supabase-project` and `dns`.

The tenant's Supabase project is named `evecosys-<tenant_id>`. The DNS record is a proxied Cloudflare CNAME at `<tenant_id>.<base_domain>`. The `tenant_id` variable is validated: 1–32 lowercase alphanumeric/hyphen characters, not starting or ending with a hyphen, and not a reserved word (staging, production, local, admin, www).

Key inputs: `tenant_id`, `organization_id`, `region`, `database_password`, `zone_id`, `base_domain`.

Key outputs: `tenant_id`, `project_ref`, `hostname`.

### Naming and tagging conventions

Resource names follow the pattern `evecosys-<environment>-<role>`:
- Hetzner server: `evecosys-<environment>-app`
- Hetzner firewall: `evecosys-<environment>-app-fw`
- Supabase project: `evecosys-<environment>` (or `evecosys-<tenant_id>` for tenant projects)
- DNS hostname: `<subdomain>.<base_domain>` for environment roots; `<tenant_id>.<base_domain>` for tenant projects

Hetzner resources carry OpenTofu-managed labels: `managed_by = "opentofu"` and `environment = <env>`. Cloudflare DNS records embed the same metadata in the record `comment` field as the string `managed_by=opentofu environment=<env>`.

---

## 2. Workflow and Ownership

### Change lifecycle

Every infrastructure change follows this lifecycle:

1. **Edit on a branch.** Modify HCL under `infra/` on a feature branch. Run `make iac-check` locally to catch formatting errors, validation failures, test regressions, and policy violations before pushing.

2. **PR and credential-free CI gate.** Opening a PR against `main` triggers the `validate` job in `.github/workflows/iac.yml`. This job is entirely credential-free: it checks formatting, validates all modules and environment roots (with `-backend=false`), runs OpenTofu native tests with mock providers, and runs conftest policy unit tests and policy checks against the HCL source. All checks must pass for the PR to be mergeable.

3. **Merge to main.** After the PR is reviewed and CI passes, it is merged. The IaC CI workflow does not auto-deploy on merge; the apply is always manual.

4. **Manual plan.** A Platform team member dispatches the `IaC` workflow with `action: plan` and the target environment (`staging` or `production`). The plan job initialises the remote backend using R2 credentials from the GitHub Environment, runs `tofu plan -out=tfplan`, and uploads the plan artifact. No resources are created or modified at this step.

5. **Plan review.** The Platform team member downloads and reads the plan artifact. Destructive operations (resource replacements or deletions) must be intentional. If the plan is unexpected, the team raises a follow-up PR to correct the HCL before proceeding.

6. **Manual apply.** The Platform team member dispatches the workflow with `action: apply`. For production, the GitHub `production` Environment requires at least one designated reviewer to approve the run in the GitHub Actions UI before the job proceeds. OpenTofu applies the declared configuration and updates the remote state.

### Ownership

The Platform team owns all files under `infra/` — modules, environment roots, policies, and the CI workflow. Application engineers make HCL changes on branches and open PRs; the Platform team reviews, approves, and drives the plan/apply steps. Application engineers never need provider credentials.

Production applies require a human reviewer to approve the GitHub `production` Environment deployment, adding an audit trail beyond the PR review.

### Remote state

State is stored in Cloudflare R2 (S3-compatible), bucket `evecosys-tfstate`. Each environment has an isolated state file identified by its `key`:

| Environment | State key |
|---|---|
| staging | `environments/staging/terraform.tfstate` |
| production | `environments/production/terraform.tfstate` |

Isolating state per environment bounds the blast radius of any erroneous apply: a problem in staging cannot corrupt production state. Backend credentials (R2 endpoint, access key, secret key) are passed to `tofu init` at runtime via `-backend-config` flags in CI and are never committed to source.

The `-backend=false` flag is used in all credential-free CI jobs (`validate`) and is inert for `tofu test`; the backend block is only active during gated plan/apply runs.

### Promotion

Staging and production are independent environment roots — they do not share state and cannot be promoted atomically. To roll out a module change, apply to staging first, validate the outcome (or rely on the weekly drift check), and then apply to production via a separate `workflow_dispatch`. This gives the team a staging observation window before touching production.

---

## 3. Security

### Review gates

The `github-config` module provisions branch protection for `main`: direct pushes and force-pushes are blocked, at least one approving PR review is required, and the declared required CI status checks must pass. Admins are also subject to these rules (`enforce_admins = true`). The production GitHub Environment adds a second gate: any deployment to production (including IaC applies) must be approved by a designated reviewer before the run starts.

### Least privilege

Each cloud provider receives a narrowly scoped credential supplied exclusively at CI runtime via `TF_VAR_*` environment variables sourced from GitHub Environment secrets:

- `TF_VAR_github_token` — fine-grained GitHub personal access token scoped to the `evecosys` repository, limited to the permissions needed for managing Environments and branch protection.
- `TF_VAR_supabase_access_token` — Supabase organization-scoped access token; cannot reach resources outside the declared organization.
- `TF_VAR_cloudflare_api_token` — zone-scoped Cloudflare API token; cannot modify DNS for zones outside the declared `zone_id`.
- `TF_VAR_hcloud_token` — Hetzner project-scoped token; cannot act on resources in other Hetzner Cloud projects.

The database migration credential used by the app deployment pipeline (`SUPABASE_DB_URL` in DELIVERY.md §5) is a separate, least-privilege database user with migration-only rights. It is managed by the app CI pipeline, not by OpenTofu.

### Secrets never in source

Sensitive variable values are typed `sensitive = true` in module and root `variables.tf` files and must arrive via `TF_VAR_*` environment variables. The `.auto.tfvars` files committed to each environment root (`staging.auto.tfvars`, `production.auto.tfvars`) contain only non-secret configuration: region, base domain, and subdomain. They are not sufficient to authenticate with any provider.

The `no_plaintext_secrets` policy enforces this at PR time by scanning all HCL resource bodies for literal (non-reference) string values in known sensitive attributes (`database_password`, `password`, `token`, `api_token`, `access_token`, `secret`, `private_key`, `ssh_private_key`). A value that does not contain `var.`, `local.`, or `data.` is treated as a literal and denied. The `gitleaks` secret scan in the `security-scan` CI job provides a second layer by scanning `infra/` for known secret patterns including API tokens, private keys, and high-entropy strings.

### Destructive-change control

Production applies require explicit `workflow_dispatch` invocation, real credentials (from the `production` GitHub Environment), and approval from a designated reviewer before the job runs. Every apply is preceded by a separate plan step that produces a human-readable diff artifact. Destructive operations in the plan (resource replacements or deletions) are visible to the reviewer before they commit to applying.

The `no_open_ssh` policy blocks any `hcloud_firewall` resource that exposes port 22 to `0.0.0.0/0` or `::/0`. Variable validation in the `compute` module reinforces this at the OpenTofu level. The `github-config` module validates that any `production` environment configuration declares at least one `required_reviewer`.

The `prevent_destroy` lifecycle argument is intentionally absent from the `supabase-project` module. The module is reused for both permanent environments (staging, production) and for ephemeral per-tenant projects (via the `tenant` module), which must be decommissionable on request. A hardcoded `prevent_destroy` would prevent legitimate tenant teardown and cause the mocked-apply E2E tests to fail. Destroy safety for production relies instead on the gated manual apply, required reviewer approval, and the explicit plan review step — any plan that would delete the production Supabase project is visible and rejectable before apply proceeds. See §8 for the follow-up note.

### Tenant boundaries

The `tenant` module is parameterised exclusively by `tenant_id`, which namespaces every provisioned resource (`evecosys-<tenant_id>` project, `<tenant_id>.<base_domain>` DNS record). Each tenant instantiation stores its state under a separate state key, so tenant state files cannot overlap. The `tenant_boundary` Rego policy fires on any per-tenant HCL configuration that hardcodes a Supabase project name encoding a foreign tenant slug. Because the `tenant` module uses `module` blocks rather than direct `supabase_project` resources, the policy's primary enforcement mechanism is its Rego unit tests (`tenant_boundary_test.rego`) and the module's own `tenant_boundary.tftest.hcl` OpenTofu tests, which verify that the module namespaces all outputs by `tenant_id` and rejects invalid or reserved tenant IDs.

---

## 4. Drift Handling

The `drift` job in `iac.yml` runs on a weekly schedule — Mondays at 06:00 UTC — against both staging and production in parallel using a matrix strategy. It authenticates with the respective GitHub Environment's secrets, initialises the remote backend, and runs `tofu plan -input=false -detailed-exitcode`.

`-detailed-exitcode` produces exit code 0 when there are no changes (no drift), exit code 1 on an execution error, and exit code 2 when OpenTofu detects a difference between the declared state and the live cloud resources. Any non-zero exit causes the GitHub Actions job to fail and generates an alert via the standard GitHub notification system for the repository.

When drift is detected, a Platform team member investigates the cause. Common causes are: a manual change made directly to a cloud resource bypassing OpenTofu, a provider-side update (such as a Supabase project region change or a Hetzner host property update), or a stale state file after a partial apply. Remediation follows one of two paths:

1. **Re-apply to restore declared state.** If the drift was unintended (a manual change made incorrectly), trigger `workflow_dispatch` with `action: apply` to restore the resource to its declared values.
2. **Codify the intended change.** If the drift reflects a deliberate operational decision, open a PR to update the HCL to match the live resource, then apply to reconcile the state file.

Hand-editing cloud resources outside of OpenTofu is prohibited. Every infrastructure change must go through the PR → plan → apply lifecycle to keep the state file, the HCL declaration, and the live resource in sync. The weekly drift job provides the backstop that catches any divergence before it compounds.

---

## 5. Validation Coverage

All PR-time checks are credential-free. The `validate` and `security-scan` jobs in `iac.yml` do not require any provider tokens, R2 backend credentials, or Hetzner/Supabase/Cloudflare/GitHub secrets. `make iac-check` runs the local-compatible subset (fmt, validate, test, policy — everything except gitleaks and Checkov, which require the GitHub Actions environment).

| Check | Tool | What it proves |
|---|---|---|
| `tofu fmt -check -recursive infra` | OpenTofu | All HCL files are consistently formatted per the OpenTofu canonical style |
| `tofu validate` (per module and root, `-backend=false`) | OpenTofu | Variable references, resource schema attributes, and expression types are valid in every module and environment root |
| `tofu test` with `mock_provider` | OpenTofu native tests | Module behaviour (variable validations, output values, resource configuration), environment composition (modules wire together correctly), tenant namespacing, and mocked-apply E2E correctness — no real credentials required |
| `conftest verify --policy infra/policy` | conftest 0.62.0 (OPA 1.x) | All Rego policy unit tests in `*_test.rego` files pass |
| `conftest test --policy infra/policy ... infra/modules infra/environments` | conftest 0.62.0 (OPA 1.x) | All four policies pass against the HCL2 source representation of every module and environment root; conftest parses `.tf` files and exposes resources as `input.resource[type][name]` (a list), so policies run at PR time without a generated plan or provider credentials |
| Checkov (`bridgecrewio/checkov-action`) | Checkov | Static security breadth scan of Terraform/OpenTofu HCL against CIS benchmarks and common misconfiguration rules |
| gitleaks (`gitleaks/gitleaks-action`) | gitleaks | No secret patterns (API tokens, private keys, high-entropy strings) present in `infra/`; CI-only check, not included in `make iac-check` |

conftest is pinned to version 0.62.0, which ships OPA 1.x and defaults to Rego v1 semantics. The policies use `if`/`contains` built-ins without an explicit `import rego.v1` statement; this is correct and expected for OPA 1.x — `import rego.v1` is a compatibility shim for older OPA releases that is not required here.

conftest reads the **HCL2 source** representation of `.tf` files, not a plan JSON file. This means policies execute against the declared configuration at PR time, before any `tofu plan` or provider authentication. It also means the input shape follows the HCL2 parser's list-per-resource convention (`input.resource[type][name]` is a list of body objects) rather than the plan JSON schema.

---

## 6. E2E Validation

### Mocked-apply tests

Two mocked-apply E2E tests exercise the full environment composition at PR time without real cloud credentials:

**`infra/environments/staging/tests/staging_e2e.tftest.hcl`** — uses `mock_provider` for all four providers (github, supabase, cloudflare, hcloud). The hcloud mock overrides the `hcloud_firewall` default `id` to `"42"` so that `tonumber(hcloud_firewall.app.id)` succeeds during the mocked apply. The test runs `command = apply` and asserts:
- `output.environment == "staging"`
- `output.app_hostname == "staging.evecosys.example"`
- `output.supabase_project_name == "evecosys-staging"`

**`infra/environments/production/tests/production_e2e.tftest.hcl`** — same mock setup. Runs `command = apply` and asserts the production equivalents (`output.environment == "production"`, `output.app_hostname == "app.evecosys.example"`, `output.supabase_project_name == "evecosys-production"`). A second run with `required_reviewers = []` uses `expect_failures = [var.required_reviewers]` to prove that the production root rejects a configuration missing required reviewers.

These tests run in the `validate` CI job on every PR and can be run locally with `make iac-check` (via `make iac-test`).

### Real-environment runbook

Applying to a live environment follows these steps:

1. Dispatch the `IaC` workflow with `action: plan` and the target `environment`. The plan job initialises the real backend, runs `tofu plan -out=tfplan`, and uploads the plan as a GitHub Actions artifact.
2. Download and inspect the plan. Verify that destructive operations (replacements, deletes) are intentional. If not, raise a PR to correct the HCL.
3. Dispatch the `IaC` workflow with `action: apply` and the same target environment. For production, a designated reviewer must approve the deployment in the GitHub Actions UI before the job starts.
4. `tofu apply -auto-approve` runs against the plan produced in step 1.

### Failure safety

A failed apply leaves prior state intact. OpenTofu applies resources transactionally at the individual resource level: each resource is recorded in the state file as it succeeds. If an error occurs mid-apply, already-applied resources are in state and in their new configuration; unapplied resources remain in their pre-apply state. Re-running apply is safe — OpenTofu will reconcile from the recorded state and retry only the failed resources.

The weekly drift detection job provides the long-term backstop: any environment that diverges from its declared state after a partial apply or any out-of-band change will be flagged on the next Monday run. No environment can silently remain in an unknown state for more than a week.

---

## 7. Dependencies

### CI/CD pipeline integration

`iac.yml` complements the application CI/CD pipeline described in DELIVERY.md §2. The two pipelines are independent but related: IaC manages the GitHub Environments (`staging`, `production`) that the app deploy workflows (`deploy-staging.yml`, `deploy-prod.yml`) consume for environment-gated secrets and reviewer approval. If IaC ever re-provisions an Environment, the secrets attached to it must be re-added before the app pipeline can deploy.

### Secret management

GitHub Environment secrets serve two roles simultaneously. The `staging` and `production` Environments contain both the app deployment secrets (`SUPABASE_URL`, `DEPLOY_SSH_KEY`, `STAGING_URL`, etc. documented in DELIVERY.md §4) and the IaC provider tokens (`IAC_GITHUB_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `HCLOUD_TOKEN`, etc.) consumed as `TF_VAR_*` by the IaC plan/apply jobs. Both sets of secrets are governed by the same GitHub Environment protection rules — production secrets are reviewers-gated for both app deploys and IaC applies.

### Deployment target

The `compute` module provisions the Hetzner server that the app deployment workflows SSH into. The `dns` module provisions the Cloudflare A record that resolves the app hostname to the server's public IP. The `DEPLOY_HOST` secret used by `deploy-staging.yml` and `deploy-prod.yml` should be the IP address or hostname output by `module.compute.ipv4_address` (and registered by `module.dns`). Supabase Auth's Site URL and Redirect URL configuration must reference the hostname provisioned by the `dns` module; mismatches will break OAuth redirects.

### EVE-46 BYO-cloud tenant provisioning

The `tenant` module is the per-tenant scaffolding that EVE-46's orchestrator instantiates when an enterprise tenant requests full data isolation. EVE-46's control-plane API calls OpenTofu (or wraps the module via automation) to provision a dedicated `evecosys-<tenant_id>` Supabase project and a `<tenant_id>.<base_domain>` DNS record on demand, using the `tenant` module as the atomic unit of deployment. Tenant state is isolated in a separate state key per tenant so that one tenant's provisioning cannot affect another's.

---

## 8. Known Limitations

### 1. `prevent_destroy` removed from `supabase-project`

The `prevent_destroy` lifecycle meta-argument is not set on the `supabase_project` resource in the `supabase-project` module. This was a deliberate decision: the module is reused for both permanent environments (staging and production) and for ephemeral per-tenant projects provisioned by the `tenant` module. A hardcoded `prevent_destroy` would block legitimate tenant decommissioning and caused the mocked-apply E2E tests to fail (OpenTofu treats a planned destroy of a `prevent_destroy` resource as an error even in mock runs).

Production destroy safety is enforced instead by the gated manual apply, required reviewer approval, and the explicit plan review step. Any plan that would destroy the production Supabase project is visible before apply is triggered. A future improvement could introduce a separate module variant (e.g., `supabase-project-permanent`) that reinstates `prevent_destroy` for environments that should never be torn down.

### 2. Reviewer logins not resolved to numeric IDs

The `github-config` module accepts `required_reviewers` as a list of GitHub login strings. The current `github_repository_environment` resource sets `reviewers { users = [] }` — the GitHub provider requires numeric user IDs, not login strings, and resolving logins to IDs via `data "github_user"` lookups is deferred as a follow-up. Until this is implemented, the GitHub `production` Environment must be configured with required reviewers manually in the repository's **Settings → Environments** page, or by a supplementary configuration step outside this module. The variable validation that requires a non-empty `required_reviewers` list for production is still enforced and documents intent.

### 3. Hetzner as reference compute provider

The `compute` module uses Hetzner Cloud (`hetznercloud/hcloud`). Hetzner is a cost-effective reference implementation; it is not a requirement. Switching to a different cloud provider (AWS EC2, GCP Compute Engine, etc.) requires replacing only the `compute` module — the environment roots, other modules, and the CI pipeline are unchanged. Note that `tonumber(hcloud_firewall.app.id)` is Hetzner-specific: the Hetzner provider exposes the firewall's `id` as a string, while `firewall_ids` expects `set(number)`. An equivalent compute module for a different provider would not need this cast.

### 4. gitleaks is CI-only

The gitleaks secret scan runs only in the GitHub Actions `security-scan` job (triggered on PRs). It is not included in `make iac-check` and is not run as a local pre-commit hook out of the box. Engineers who work on `infra/` regularly should install gitleaks locally (`brew install gitleaks`) and run `gitleaks detect --no-git --source infra --redact` before opening PRs to catch potential secret exposure before CI does.

### 5. App deployment caveats (cross-reference)

The Trivy container scan running after image push (not before), the automated rollback not undoing database migrations, and the rollback job requiring environment approval are limitations of the app deployment pipeline described in DELIVERY.md §2 Known Limitations. These apply unchanged and are not repeated here.
