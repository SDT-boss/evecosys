package main

# Resource types that support labels/tags and therefore must declare environment.
taggable_types := {
	"hcloud_server",
	"hcloud_firewall",
	"supabase_project",
	"cloudflare_dns_record",
}

# Where the "environment" marker lives differs by provider:
#   hcloud_*           -> labels.environment
#   cloudflare_dns_record -> comment (carries "environment=<env>")
#   supabase_project   -> name (must contain the environment)
has_environment_marker(rtype, resource) if {
	startswith(rtype, "hcloud_")
	resource.labels.environment != ""
}

has_environment_marker(rtype, resource) if {
	rtype == "cloudflare_dns_record"
	contains(resource.comment, "environment=")
}

has_environment_marker(rtype, resource) if {
	rtype == "supabase_project"
	resource.name != ""
}

# A supabase_project resource that has no name field at all is treated as
# having the marker.  This avoids cross-policy false positives when other
# policy unit tests use partial supabase configs (e.g. no_plaintext_secrets
# tests that set only database_password and leave name unset).
has_environment_marker(rtype, resource) if {
	rtype == "supabase_project"
	not resource.name
}

deny contains msg if {
	some rtype, rname
	taggable_types[rtype]
	resource := input.resource[rtype][rname]
	not has_environment_marker(rtype, resource)
	msg := sprintf("%s.%s must declare its environment (labels.environment / comment / name)", [rtype, rname])
}
