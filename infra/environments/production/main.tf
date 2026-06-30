locals {
  environment  = "production"
  app_hostname = "${var.app_subdomain}.${var.base_domain}"
}

module "github" {
  source = "../../modules/github-config"

  repository         = "evecosys"
  environment        = local.environment
  required_reviewers = var.required_reviewers
}

module "supabase" {
  source = "../../modules/supabase-project"

  organization_id   = var.supabase_organization_id
  environment       = local.environment
  region            = var.region
  database_password = var.database_password
}

module "compute" {
  source = "../../modules/compute"

  environment     = local.environment
  ssh_key_ids     = var.ssh_key_ids
  ssh_allow_cidrs = var.ssh_allow_cidrs
}

module "dns" {
  source = "../../modules/dns"

  zone_id     = var.cloudflare_zone_id
  environment = local.environment
  hostname    = local.app_hostname
  record_type = "A"
  value       = module.compute.ipv4_address
  proxied     = true
}
