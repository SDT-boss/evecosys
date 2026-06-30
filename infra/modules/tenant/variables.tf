variable "tenant_id" {
  type        = string
  description = "Stable tenant slug. Lowercase DNS-safe; reserved words disallowed."

  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$", var.tenant_id))
    error_message = "tenant_id must be 1-32 lowercase alphanumeric/hyphen chars, not starting/ending with a hyphen."
  }

  validation {
    condition     = !contains(["staging", "production", "local", "admin", "www"], var.tenant_id)
    error_message = "tenant_id must not be a reserved word (staging, production, local, admin, www)."
  }
}

variable "organization_id" {
  type        = string
  description = "Supabase organization that owns the tenant project."
}

variable "region" {
  type        = string
  description = "Supabase region for this tenant."
}

variable "database_password" {
  type        = string
  sensitive   = true
  description = "Tenant DB password; supply via TF_VAR_database_password."
}

variable "zone_id" {
  type        = string
  description = "Cloudflare zone ID for the tenant hostname."
}

variable "base_domain" {
  type        = string
  description = "Base domain; tenant hostname is <tenant_id>.<base_domain>."
}
