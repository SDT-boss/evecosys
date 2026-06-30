output "hostname" {
  value       = cloudflare_dns_record.this.name
  description = "The DNS record hostname."
}

output "record_id" {
  value       = cloudflare_dns_record.this.id
  description = "Cloudflare DNS record ID."
}
