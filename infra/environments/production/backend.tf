# Remote state in Cloudflare R2 (S3-compatible). State is isolated per
# environment by the `key`. Backend credentials are supplied at init time via
# `-backend-config` (CI) and are NEVER committed. Tests/validate use
# `-backend=false`, so this block is inert outside real plan/apply.
terraform {
  backend "s3" {
    bucket = "evecosys-tfstate"
    key    = "environments/production/terraform.tfstate"
    region = "auto"

    # R2 specifics — passed via -backend-config in CI:
    #   endpoints = { s3 = "https://<accountid>.r2.cloudflarestorage.com" }
    #   access_key / secret_key from env
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    use_path_style              = true
  }
}
