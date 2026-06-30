package main

# The tenant slug this config declares (from the tenant_id variable's default).
# conftest parses variable blocks as lists, so we iterate:
#   input.variable.tenant_id = [{"default": "acme"}, ...]
tenant_slug := slug if {
	some v in input.variable.tenant_id
	slug := v.default
}

# Any supabase_project whose name encodes a slug other than this tenant_id is a
# cross-tenant leak. Names that are interpolations (contain "${") are skipped —
# only literal cross-tenant slugs are caught.
deny contains msg if {
	tenant_slug
	some rname
	some body in input.resource.supabase_project[rname]
	name := body.name
	startswith(name, "evecosys-")
	not contains(name, "${")
	encoded := trim_prefix(name, "evecosys-")
	encoded != tenant_slug
	msg := sprintf("supabase_project.%s name %q does not match tenant_id %q (cross-tenant reference)", [rname, name, tenant_slug])
}
