package main

test_denies_hardcoded_token if {
	count(deny) > 0 with input as {"resource": {"supabase_project": {"this": [{
		"database_password": "hunter2-literal-value",
	}]}}}
}

test_allows_variable_reference if {
	count(deny) == 0 with input as {"resource": {"supabase_project": {"this": [{
		"database_password": "${var.database_password}",
	}]}}}
}

test_allows_unrelated if {
	count(deny) == 0 with input as {"resource": {"github_branch_protection": {"this": [{
		"pattern": "main",
	}]}}}
}
