package main

world_cidrs := {"0.0.0.0/0", "::/0"}

deny contains msg if {
	some rname
	some fw in input.resource.hcloud_firewall[rname]
	some rule in fw.rule
	rule.direction == "in"
	rule.port == "22"
	some cidr in rule.source_ips
	world_cidrs[cidr]
	msg := sprintf("hcloud_firewall.%s exposes SSH (port 22) to %s; restrict to a specific CIDR", [rname, cidr])
}
