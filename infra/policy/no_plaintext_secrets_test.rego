package main

# A resource that hardcodes a token literal must be denied.
test_denies_hardcoded_token if {
	count(deny) > 0 with input as {"resource": {"supabase_project": {"this": {
		"database_password": "hunter2-literal-value",
	}}}}
}

# A resource that references a variable (no literal) is allowed.
test_allows_variable_reference if {
	count(deny) == 0 with input as {"resource": {"supabase_project": {"this": {
		"database_password": "${var.database_password}",
	}}}}
}

# Empty / unrelated input must not trip the rule.
test_allows_unrelated if {
	count(deny) == 0 with input as {"resource": {"github_branch_protection": {"this": {
		"pattern": "main",
	}}}}
}
