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
    tenant_id = "Acme Corp!"
  }

  expect_failures = [var.tenant_id]
}

run "rejects_reserved_tenant_id" {
  command = plan

  variables {
    tenant_id = "staging"
  }

  expect_failures = [var.tenant_id]
}
