# One D1 database per environment (dev and production), each shared by the
# whole app rather than one per feature, so we don't accumulate a separate
# binding for every small feature that wants a table. First real use is the
# favorites feature (issue #18); /math's problem sets (docs/plans/problemset.md,
# Phase 3) will reuse the same databases for their own tables.
#
# Production is a separate database (not the dev one) so dev testing can never
# touch real users' data. Schema changes are applied to both via Wrangler
# migrations (see migrations/README.md), not here - Terraform only owns the
# databases' existence.
resource "cloudflare_d1_database" "app_dev" {
  account_id = var.cloudflare_account_id
  name       = "paibot-app-dev"

  # Provider bug workaround (terraform-provider-cloudflare#6309): omitting
  # this sends `read_replication: null`, which the API rejects. "disabled"
  # matches this database's actual state (dev-only, no replicas).
  read_replication = {
    mode = "disabled"
  }
}

resource "cloudflare_d1_database" "app_prod" {
  account_id = var.cloudflare_account_id
  name       = "paibot-app"

  # Same provider-bug workaround as app_dev above. Replicas stay disabled
  # for now; revisit if production read latency ever becomes a concern.
  read_replication = {
    mode = "disabled"
  }
}
