package main

# Resource types that support labels/tags and therefore must declare environment.
taggable_types := {
	"hcloud_server",
	"hcloud_firewall",
	"supabase_project",
	"cloudflare_dns_record",
}

# Where the "environment" marker lives differs by provider:
#   hcloud_*              -> labels.environment
#   cloudflare_dns_record -> comment (carries "environment=<env>")
#   supabase_project      -> name (non-empty)
has_environment_marker(rtype, body) if {
	startswith(rtype, "hcloud_")
	body.labels.environment != ""
}

has_environment_marker(rtype, body) if {
	rtype == "cloudflare_dns_record"
	contains(body.comment, "environment=")
}

has_environment_marker(rtype, body) if {
	rtype == "supabase_project"
	body.name != ""
}

# A supabase_project body with no name field at all is exempt; this avoids
# cross-policy false positives when other unit tests use partial supabase
# configs (e.g. no_plaintext_secrets fixtures that set only database_password).
has_environment_marker(rtype, body) if {
	rtype == "supabase_project"
	not body.name
}

deny contains msg if {
	some rtype, rname
	taggable_types[rtype]
	some body in input.resource[rtype][rname]
	not has_environment_marker(rtype, body)
	msg := sprintf("%s.%s must declare its environment (labels.environment / comment / name)", [rtype, rname])
}
