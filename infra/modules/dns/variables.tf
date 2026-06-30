variable "zone_id" {
  type        = string
  description = "Cloudflare zone ID that owns the record."

  validation {
    condition     = length(var.zone_id) > 0
    error_message = "zone_id must be non-empty."
  }
}

variable "environment" {
  type        = string
  description = "Environment (or tenant slug) this record belongs to."

  validation {
    condition     = length(var.environment) > 0
    error_message = "environment must be non-empty."
  }
}

variable "hostname" {
  type        = string
  description = "Fully-qualified hostname for the record."

  validation {
    condition     = can(regex("^[a-z0-9.-]+$", var.hostname))
    error_message = "hostname must be a lowercase DNS name (a-z, 0-9, dot, hyphen)."
  }
}

variable "record_type" {
  type        = string
  default     = "A"
  description = "DNS record type."

  validation {
    condition     = contains(["A", "AAAA", "CNAME"], var.record_type)
    error_message = "record_type must be one of: A, AAAA, CNAME."
  }
}

variable "value" {
  type        = string
  description = "Record target (IP for A/AAAA, hostname for CNAME)."
}

variable "proxied" {
  type        = bool
  default     = true
  description = "Whether Cloudflare proxies (orange-cloud) the record."

  validation {
    condition     = var.proxied == false || contains(["A", "AAAA", "CNAME"], var.record_type)
    error_message = "only A, AAAA, or CNAME records can be proxied."
  }
}

variable "ttl" {
  type        = number
  default     = 1 # 1 = automatic (required when proxied)
  description = "Record TTL in seconds; 1 means automatic."
}
