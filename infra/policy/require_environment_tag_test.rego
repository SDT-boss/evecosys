package main

# A compute resource without an environment label is denied.
test_denies_missing_environment if {
	count(deny) > 0 with input as {"resource": {"hcloud_server": {"app": {
		"name":   "evecosys-staging-app",
		"labels": {"managed_by": "opentofu"},
	}}}}
}

# A resource carrying a non-empty environment label is allowed.
test_allows_with_environment if {
	count(deny) == 0 with input as {"resource": {"hcloud_server": {"app": {
		"name":   "evecosys-staging-app",
		"labels": {"managed_by": "opentofu", "environment": "${var.environment}"},
	}}}}
}

# Resource types that are not taggable (e.g. branch protection) are exempt.
test_exempts_non_taggable if {
	count(deny) == 0 with input as {"resource": {"github_branch_protection": {"main": {
		"pattern": "main",
	}}}}
}
