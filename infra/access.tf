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

# Lets GitHub Actions (the post-deploy e2e smoke test, see .github/workflows/app.yml's
# smoke-test-dev job) reach dev.paibot.app without a human Access login. Scoped to just
# this one application below via the policy's `include` — it doesn't grant access to
# anything else Access might protect in the future.
resource "cloudflare_zero_trust_access_service_token" "ci" {
  account_id = var.cloudflare_account_id
  name       = "GitHub Actions CI (dev e2e smoke test)"
  # Not "forever": a bounded lifetime means a forgotten/leaked token stops
  # working on its own. Rotate before expiry by re-applying (the provider
  # reissues a new client_secret) and updating the GitHub secrets from the
  # new `terraform output`.
  duration = "8760h" # ~1 year
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

      # `include` is OR-evaluated: either condition below is enough to pass.
      include = [
        {
          email = {
            email = "sanofc@gmail.com"
          }
        },
        {
          service_token = {
            token_id = cloudflare_zero_trust_access_service_token.ci.id
          }
        }
      ]
    }
  ]
}
