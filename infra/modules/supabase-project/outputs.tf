output "project_ref" {
  value       = supabase_project.this.id
  description = "Supabase project ref (used as the project_id in supabase/config.toml)."
}

output "project_name" {
  value       = supabase_project.this.name
  description = "The Supabase project name."
}
