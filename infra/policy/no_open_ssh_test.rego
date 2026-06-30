package main

test_denies_ssh_open_to_world if {
	count(deny) > 0 with input as {"resource": {"hcloud_firewall": {"app": [{
		"labels": {"managed_by": "opentofu", "environment": "staging"},
		"rule": [{"direction": "in", "protocol": "tcp", "port": "22", "source_ips": ["0.0.0.0/0", "::/0"]}],
	}]}}}
}

test_allows_ssh_from_specific_cidr if {
	count(deny) == 0 with input as {"resource": {"hcloud_firewall": {"app": [{
		"labels": {"managed_by": "opentofu", "environment": "staging"},
		"rule": [{"direction": "in", "protocol": "tcp", "port": "22", "source_ips": ["203.0.113.5/32"]}],
	}]}}}
}

test_allows_https_open if {
	count(deny) == 0 with input as {"resource": {"hcloud_firewall": {"app": [{
		"labels": {"managed_by": "opentofu", "environment": "staging"},
		"rule": [{"direction": "in", "protocol": "tcp", "port": "443", "source_ips": ["0.0.0.0/0"]}],
	}]}}}
}
