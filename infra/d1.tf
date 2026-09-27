# One D1 database per environment (dev and production), each shared by the
# whole app rather than one per feature, so we don't accumulate a separate
# binding for every small feature that wants a table (favorites, diary,
# profiles, /math problem sets and scores all share them).
#
# Production is a separate database (not the dev one) so dev testing can never
# touch real users' data. Schema changes are applied to both via Wrangler
# migrations (see migrations/README.md), not here - Terraform only owns the
# databases' existence.
#
# Both primaries are pinned to Asia-Pacific: the site targets Japan, and
# without a location hint D1 places a primary near whoever creates it. The
# first pair (paibot-app-dev / paibot-app) was created from a GitHub Actions
# runner, landed in ENAM and added ~140ms to every query from the Tokyo edge;
# they were replaced by these in September 2026 (data moved with wrangler d1
# export/execute) and deleted. Changing primary_location_hint on an existing
# database forces a replacement, i.e. destroying it and its data - add a new
# resource and move the data instead.
resource "cloudflare_d1_database" "app_dev_apac" {
  account_id            = var.cloudflare_account_id
  name                  = "paibot-app-dev-apac"
  primary_location_hint = "apac"

  # Provider bug workaround (terraform-provider-cloudflare#6309): omitting
  # this sends `read_replication: null`, which the API rejects. "disabled"
  # matches this database's actual state (dev-only, no replicas).
  read_replication = {
    mode = "disabled"
  }
}

resource "cloudflare_d1_database" "app_prod_apac" {
  account_id            = var.cloudflare_account_id
  name                  = "paibot-app-apac"
  primary_location_hint = "apac"

  # Same provider-bug workaround as above. Overseas readers could later be
  # served by read replicas (no extra cost) instead of moving the primary.
  read_replication = {
    mode = "disabled"
  }
}
