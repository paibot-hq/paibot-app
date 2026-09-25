# A single D1 database shared by the whole app (not one per feature), so we
# don't accumulate a separate binding for every small feature that wants a
# table. First real use is the favorites feature (issue #18, a small-scope
# trial run of D1 before /math's problem sets — docs/plans/problemset.md,
# Phase 3 — reuse the same database for their own tables.
#
# dev only for now. Production's database is created separately once the
# favorites feature is verified working here (see infra/README.md).
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
