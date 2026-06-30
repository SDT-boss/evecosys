output "environment" {
  value       = local.environment
  description = "Environment name."
}

output "app_hostname" {
  value       = module.dns.hostname
  description = "Public hostname of the staging app."
}

output "supabase_project_name" {
  value       = module.supabase.project_name
  description = "Supabase project name for staging."
}

output "supabase_project_ref" {
  value       = module.supabase.project_ref
  description = "Supabase project ref (set as project_id in supabase/config.toml)."
}
