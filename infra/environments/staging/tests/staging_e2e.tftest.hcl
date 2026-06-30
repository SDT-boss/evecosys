mock_provider "github" {}
mock_provider "supabase" {}
mock_provider "cloudflare" {}
mock_provider "hcloud" {
  # hcloud_firewall.id is a numeric string in production (e.g. "12345678").
  # The default mock generates opaque strings, which makes tonumber() fail.
  # Override with a numeric string so the firewall_ids = [tonumber(id)] expression
  # works during apply in tests just as it would against the real provider.
  mock_resource "hcloud_firewall" {
    defaults = {
      id = "42"
    }
  }
}

variables {
  github_token             = "mock"
  supabase_access_token    = "mock"
  supabase_organization_id = "org_mock"
  database_password        = "staging-db-pw-mock"
  cloudflare_api_token     = "mock"
  cloudflare_zone_id       = "zone_mock"
  hcloud_token             = "mock"
  ssh_key_ids              = ["12345"]
  ssh_allow_cidrs          = ["203.0.113.5/32"]
}

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
