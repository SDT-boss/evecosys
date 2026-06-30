# Cloudflare provider v5 renamed cloudflare_record -> cloudflare_dns_record.
resource "cloudflare_dns_record" "this" {
  zone_id = var.zone_id
  name    = var.hostname
  type    = var.record_type
  content = var.value
  proxied = var.proxied
  ttl     = var.ttl
  comment = "managed_by=opentofu environment=${var.environment}"
}
