# A deployment environment (staging or production) on the repository.
resource "github_repository_environment" "this" {
  repository  = var.repository
  environment = var.environment

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
