variable "github_owner" {
  type        = string
  default     = "SDT-boss"
  description = "GitHub org/owner of the repository."
}

variable "github_token" {
  type        = string
  sensitive   = true
  description = "GitHub token (TF_VAR_github_token)."
}

variable "supabase_access_token" {
  type        = string
  sensitive   = true
  description = "Supabase access token (TF_VAR_supabase_access_token)."
}

variable "supabase_organization_id" {
  type        = string
  description = "Supabase organization ID (TF_VAR_supabase_organization_id)."
}

variable "database_password" {
  type        = string
  sensitive   = true
  description = "Staging Supabase DB password (TF_VAR_database_password)."
}

variable "cloudflare_api_token" {
  type        = string
  sensitive   = true
  description = "Cloudflare API token (TF_VAR_cloudflare_api_token)."
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare zone ID (TF_VAR_cloudflare_zone_id)."
}

variable "hcloud_token" {
  type        = string
  sensitive   = true
  description = "Hetzner Cloud token (TF_VAR_hcloud_token)."
}

variable "ssh_key_ids" {
  type        = list(string)
  description = "Hetzner SSH key IDs for the staging server."
}

variable "ssh_allow_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to SSH into the staging server."
}

variable "region" {
  type        = string
  default     = "eu-central-1"
  description = "Supabase region for staging."
}

variable "base_domain" {
  type        = string
  default     = "evecosys.example"
  description = "Base domain."
}

variable "app_subdomain" {
  type        = string
  default     = "app"
  description = "Subdomain for the production app host."
}

variable "required_reviewers" {
  type        = list(string)
  description = "GitHub usernames required to approve production deploys."

  validation {
    condition     = length(var.required_reviewers) > 0
    error_message = "production must declare at least one required reviewer."
  }
}
