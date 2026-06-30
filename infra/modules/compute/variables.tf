variable "environment" {
  type        = string
  description = "Environment this server belongs to."

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be one of: staging, production."
  }
}

variable "server_type" {
  type        = string
  default     = "cx22"
  description = "Hetzner server type."
}

variable "location" {
  type        = string
  default     = "nbg1"
  description = "Hetzner datacenter location."
}

variable "image" {
  type        = string
  default     = "docker-ce"
  description = "Base image (Docker preinstalled)."
}

variable "ssh_key_ids" {
  type        = list(string)
  description = "Hetzner SSH key IDs authorised on the server."

  validation {
    condition     = length(var.ssh_key_ids) > 0
    error_message = "at least one ssh_key_id is required; password auth is never allowed."
  }
}

variable "ssh_allow_cidrs" {
  type        = list(string)
  description = "CIDRs permitted to reach SSH (port 22). World-open is rejected."

  validation {
    condition     = length(var.ssh_allow_cidrs) > 0
    error_message = "ssh_allow_cidrs must list at least one CIDR."
  }

  validation {
    condition     = !contains(var.ssh_allow_cidrs, "0.0.0.0/0") && !contains(var.ssh_allow_cidrs, "::/0")
    error_message = "SSH must not be open to the world (0.0.0.0/0 or ::/0)."
  }
}
