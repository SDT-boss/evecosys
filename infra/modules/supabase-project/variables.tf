variable "organization_id" {
  type        = string
  description = "Supabase organization ID that owns the project."

  validation {
    condition     = length(var.organization_id) > 0
    error_message = "organization_id must be non-empty."
  }
}

variable "environment" {
  type        = string
  description = "Logical environment label (staging, production, or a tenant slug)."

  validation {
    condition     = length(var.environment) > 0
    error_message = "environment must be non-empty."
  }
}

variable "name_prefix" {
  type        = string
  default     = "evecosys"
  description = "Prefix for the Supabase project name."
}

variable "region" {
  type        = string
  description = "Supabase project region."

  validation {
    condition = contains(
      ["eu-central-1", "eu-west-1", "eu-west-2", "us-east-1", "us-west-1"],
      var.region
    )
    error_message = "region must be one of the approved regions: eu-central-1, eu-west-1, eu-west-2, us-east-1, us-west-1."
  }
}

variable "database_password" {
  type        = string
  sensitive   = true
  description = "Initial database password. Supply via TF_VAR_database_password; never commit."

  validation {
    condition     = length(var.database_password) >= 12
    error_message = "database_password must be at least 12 characters and supplied via an environment variable."
  }
}
