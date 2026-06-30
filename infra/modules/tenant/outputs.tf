output "tenant_id" {
  value       = var.tenant_id
  description = "The tenant slug this instance manages."
}

output "project_ref" {
  value       = module.project.project_ref
  description = "Supabase project ref for the tenant."
}

output "hostname" {
  value       = module.dns.hostname
  description = "Public hostname for the tenant."
}
