package main

test_denies_missing_environment if {
	count(deny) > 0 with input as {"resource": {"hcloud_server": {"app": [{
		"name":   "evecosys-staging-app",
		"labels": {"managed_by": "opentofu"},
	}]}}}
}

test_allows_with_environment if {
	count(deny) == 0 with input as {"resource": {"hcloud_server": {"app": [{
		"name":   "evecosys-staging-app",
		"labels": {"managed_by": "opentofu", "environment": "staging"},
	}]}}}
}

test_exempts_non_taggable if {
	count(deny) == 0 with input as {"resource": {"github_branch_protection": {"main": [{
		"pattern": "main",
	}]}}}
}
