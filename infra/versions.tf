# `use_lockfile` (S3-native state locking without DynamoDB) is GA from Terraform
# 1.11. R2 supports the underlying primitive it depends on (conditional PutObject
# via If-None-Match) — confirmed against Cloudflare's own S3 API compatibility
# docs: https://developers.cloudflare.com/r2/api/s3/api/ (PutObject: If-Match,
# If-Modified-Since, If-None-Match, If-Unmodified-Since all supported). Not yet
# verified end-to-end against a real bucket (R2 isn't enabled on this account
# yet) — see infra/README.md.
terraform {
  required_version = ">= 1.11.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.25"
    }
  }

  # R2 as an S3-compatible backend. Values that can't be hardcoded (bucket name,
  # endpoint, credentials) are supplied via `-backend-config` at `terraform init`
  # time — see infra/README.md for the exact init command. This block only pins
  # the parts that are safe to commit and don't change between environments.
  backend "s3" {
    key                         = "paibot-app/terraform.tfstate"
    region                      = "auto"
    use_path_style              = true
    use_lockfile                = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}
