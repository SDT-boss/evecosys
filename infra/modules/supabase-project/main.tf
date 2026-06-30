locals {
  project_name = "${var.name_prefix}-${var.environment}"
}

resource "supabase_project" "this" {
  organization_id   = var.organization_id
  name              = local.project_name
  database_password = var.database_password
  region            = var.region

}
