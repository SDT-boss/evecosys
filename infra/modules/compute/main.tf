locals {
  name = "evecosys-${var.environment}-app"
}

resource "hcloud_firewall" "app" {
  name = "${local.name}-fw"

  labels = {
    managed_by  = "opentofu"
    environment = var.environment
  }

  # SSH restricted to the operator allowlist.
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.ssh_allow_cidrs
  }

  # HTTP/HTTPS open to the world (public app).
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_server" "app" {
  name         = local.name
  server_type  = var.server_type
  location     = var.location
  image        = var.image
  ssh_keys     = var.ssh_key_ids
  firewall_ids = [tonumber(hcloud_firewall.app.id)]

  labels = {
    managed_by  = "opentofu"
    environment = var.environment
  }
}
