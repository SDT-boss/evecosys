variable "repository" {
  type        = string
  description = "Name of the GitHub repository (without owner)."

  validation {
    condition     = length(var.repository) > 0
    error_message = "repository must be a non-empty repo name."
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment this config block targets."

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be one of: staging, production."
  }
}

variable "protected_branch" {
  type        = string
  default     = "main"
  description = "Branch to protect with required reviews and status checks."
}

variable "required_reviewers" {
  type        = list(string)
  default     = []
  description = "GitHub usernames that must approve production deployments."

  validation {
    condition     = var.environment != "production" || length(var.required_reviewers) > 0
    error_message = "production environment must declare at least one required_reviewer."
  }
}

variable "required_approvals" {
  type        = number
  default     = 1
  description = "Number of approving PR reviews required to merge the protected branch."

  validation {
    condition     = var.required_approvals >= 1
    error_message = "required_approvals must be at least 1."
  }
}

variable "required_status_checks" {
  type        = list(string)
  default     = ["lint", "test", "build", "audit"]
  description = "CI job names that must pass before the protected branch can merge."
}
