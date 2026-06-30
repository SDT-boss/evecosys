locals {
  hostname = "${var.tenant_id}.${var.base_domain}"
}

module "project" {
  source = "../supabase-project"

  organization_id   = var.organization_id
  environment       = var.tenant_id
  region            = var.region
  database_password = var.database_password
}

module "dns" {
  source = "../dns"

  zone_id     = var.zone_id
  environment = var.tenant_id
  hostname    = local.hostname
  record_type = "CNAME"
  value       = var.base_domain
  proxied     = true
}
