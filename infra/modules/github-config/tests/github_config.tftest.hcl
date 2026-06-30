mock_provider "github" {}

variables {
  repository         = "evecosys"
  environment        = "production"
  protected_branch   = "main"
  required_reviewers = ["octocat"]
  required_approvals = 1
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
