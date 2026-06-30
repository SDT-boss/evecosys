mock_provider "github" {}
mock_provider "supabase" {}
mock_provider "cloudflare" {}
mock_provider "hcloud" {
  mock_resource "hcloud_firewall" {
    defaults = { id = "42" }
  }
}

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

  expect_failures = [var.required_reviewers]
}
