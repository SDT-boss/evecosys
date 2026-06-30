output "environment_name" {
  value       = github_repository_environment.this.environment
  description = "The configured GitHub environment name."
}

output "protected_branch" {
  value       = github_branch_protection.this.pattern
  description = "The branch protected by this module."
}
