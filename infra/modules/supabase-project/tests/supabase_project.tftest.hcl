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
