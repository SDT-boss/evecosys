mock_provider "hcloud" {
  # hcloud_firewall.id is a numeric string in production (e.g. "12345678").
  # The default mock generates opaque strings, which makes tonumber() fail.
  # Override with a numeric string so the firewall_ids = [tonumber(id)] expression
  # works during plan in tests just as it would against the real provider.
  mock_resource "hcloud_firewall" {
    defaults = {
      id = "42"
    }
  }
}

variables {
  environment     = "staging"
  server_type     = "cx22"
  location        = "nbg1"
  image           = "docker-ce"
  ssh_key_ids     = ["12345"]
  ssh_allow_cidrs = ["203.0.113.5/32"]
}

run "names_and_labels_server" {
  command = plan

  assert {
    condition     = hcloud_server.app.name == "evecosys-staging-app"
    error_message = "server name must be evecosys-<environment>-app"
  }
  assert {
    condition     = hcloud_server.app.labels["environment"] == "staging"
    error_message = "server must carry environment label"
  }
}

run "rejects_world_open_ssh" {
  command = plan

  variables {
    ssh_allow_cidrs = ["0.0.0.0/0"]
  }

  expect_failures = [var.ssh_allow_cidrs]
}

run "requires_ssh_key" {
  command = plan

  variables {
    ssh_key_ids = []
  }

  expect_failures = [var.ssh_key_ids]
}
