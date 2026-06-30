output "server_name" {
  value       = hcloud_server.app.name
  description = "Name of the app server."
}

output "ipv4_address" {
  value       = hcloud_server.app.ipv4_address
  description = "Public IPv4 address (feeds the dns module's A record)."
}
