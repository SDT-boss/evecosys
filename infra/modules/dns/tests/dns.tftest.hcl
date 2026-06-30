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
