package main

# Attribute names that must never hold a literal value in IaC source.
secret_attrs := {
	"database_password",
	"password",
	"token",
	"api_token",
	"access_token",
	"secret",
	"private_key",
	"ssh_private_key",
}

# A value is a "literal secret" if it is a non-empty string that is NOT an
# interpolation/reference (does not contain "var.", "local.", or "data.").
is_reference(v) if { contains(v, "var.") }
is_reference(v) if { contains(v, "local.") }
is_reference(v) if { contains(v, "data.") }

# conftest's HCL2 parser exposes resources as input.resource[type][name] = [ {body}, ... ].
deny contains msg if {
	some rtype, rname
	some body in input.resource[rtype][rname]
	some attr, value in body
	secret_attrs[attr]
	is_string(value)
	value != ""
	not is_reference(value)
	msg := sprintf("%s.%s sets sensitive attribute %q to a literal value; use a variable instead", [rtype, rname, attr])
}
