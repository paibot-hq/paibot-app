# Protects the dev Worker (paibot-app-dev) with Cloudflare Access, so nobody can
# reach it — via dev.paibot.app, the workers.dev URL, or preview URLs — without
# signing in as an allowed email. Access is configured here (account-level), not
# in wrangler.jsonc: Wrangler's own `access` block only simulates an identity
# for `wrangler dev` and does not configure real Access.
#
# The Worker itself, its routes and its custom domain stay managed by Wrangler
# (wrangler.jsonc); this only attaches an Access application to it.
locals {
  # Cloudflare's internal ID for the Worker (not its name). It changes only if
  # the Worker is deleted and recreated. Look it up with:
  #   GET /accounts/<account_id>/workers/scripts  (the "tag" field)
  paibot_app_dev_worker_id = "1e821be2bb064f4b8c6eaa8bd156471f"
}

resource "cloudflare_zero_trust_access_application" "paibot_app_dev" {
  account_id = var.cloudflare_account_id

  name = "Access for paibot-app-dev"
  type = "self_hosted"

  destinations = [
    {
      type      = "worker"
      worker_id = local.paibot_app_dev_worker_id
    }
  ]

  session_duration = "24h"

  policies = [
    {
      name     = "paibot-app-dev owner only"
      decision = "allow"

      include = [
        {
          email = {
            email = "sanofc@gmail.com"
          }
        }
      ]
    }
  ]
}
