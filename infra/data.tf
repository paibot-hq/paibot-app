# Read-only reference to the paibot.dev zone (and, below, the legacy paibot.app one). Add paibot.dev to
# Cloudflare first (docs/plans/paibot-dev-migration.md): a data source cannot create it.
#
# Read-only reference to the zone. This is a data source,
# not a managed resource: the zone already exists (created outside Terraform,
# confirmed via the Cloudflare API — status "active") and Terraform never
# creates, modifies, or has the power to destroy it. DNS records added later
# reference `local.zone_id` below.
#
# The v5 provider's singular `cloudflare_zone` data source requires a zone_id
# up front (no name-based lookup), so we look it up by name via the plural
# `cloudflare_zones` data source instead, to avoid hardcoding the raw ID.
data "cloudflare_zones" "root" {
  name = var.root_domain
}

data "cloudflare_zones" "legacy" {
  name = var.legacy_domain
}

locals {
  zone_id        = one(data.cloudflare_zones.root.result).id
  legacy_zone_id = one(data.cloudflare_zones.legacy.result).id
}
