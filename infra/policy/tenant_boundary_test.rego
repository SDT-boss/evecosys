package main

# A tenant config whose resources all reference its own slug is allowed.
# Note: conftest parses variable blocks as lists — {"tenant_id": [{"default": "acme"}]}
test_allows_self_referencing_tenant if {
	count(deny) == 0 with input as {
		"variable": {"tenant_id": [{"default": "acme"}]},
		"resource": {"supabase_project": {"this": [{"name": "evecosys-acme"}]}},
	}
}

# A tenant config that hardcodes a *different* tenant's slug is denied.
test_denies_cross_tenant_reference if {
	count(deny) > 0 with input as {
		"variable": {"tenant_id": [{"default": "acme"}]},
		"resource": {"supabase_project": {"this": [{"name": "evecosys-globex"}]}},
	}
}
