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
