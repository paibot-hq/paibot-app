# DNS records required by Clerk's production instance (custom domain +
# transactional email deliverability for clkmail/DKIM). Captured verbatim from
# the BIND zone file `clerk deploy` generated, so they're reviewable in a PR
# rather than added by hand through the Cloudflare dashboard. See
# docs/plans/production-deploy.md.
#
# All records point at Clerk's own infrastructure, so they must stay
# unproxied ("DNS only" / grey cloud): Clerk terminates TLS and serves these
# hosts directly, and proxying through Cloudflare would break that.
#
# These are the paibot.app (legacy) zone's records for the old Clerk instance, kept until that domain is
# released. The paibot.dev instance's records are in clerk_dns_records_dev below.
locals {
  clerk_dns_records = {
    "clerk.paibot.app"           = "frontend-api.clerk.services"
    "accounts.paibot.app"        = "accounts.clerk.services"
    "clkmail.paibot.app"         = "mail.ao2vzolsybnd.clerk.services"
    "clk._domainkey.paibot.app"  = "dkim1.ao2vzolsybnd.clerk.services"
    "clk2._domainkey.paibot.app" = "dkim2.ao2vzolsybnd.clerk.services"
  }
}

resource "cloudflare_dns_record" "clerk" {
  for_each = local.clerk_dns_records

  zone_id = local.legacy_zone_id
  name    = each.key
  type    = "CNAME"
  content = each.value
  ttl     = 300
  proxied = false
  comment = "Managed by Terraform (infra/dns.tf) - Clerk production instance"
}

# Proxied (not DNS-only) so infra/redirects.tf's Redirect Rule — which only
# runs on traffic actually passing through Cloudflare — can catch it and
# send visitors to the apex. CNAME-to-apex is fine here: Cloudflare
# flattens it at the edge since the record is proxied.
resource "cloudflare_dns_record" "www" {
  zone_id = local.legacy_zone_id
  name    = "www"
  type    = "CNAME"
  content = "paibot.app"
  ttl     = 1 # must be 1 ("Auto") when proxied
  proxied = true
  comment = "Managed by Terraform (infra/dns.tf) - www redirects to the apex via infra/redirects.tf"
}

# The new production Clerk instance for app.paibot.dev. `clerk deploy` (interactive) prints the BIND zone
# file: copy its five CNAMEs here ("clerk.app", "accounts.app", "clkmail.app", "clk._domainkey.app",
# "clk2._domainkey.app" under paibot.dev, with that instance's own targets) and apply. Empty until then.
locals {
  clerk_dns_records_dev = {
    # "clerk.app.paibot.dev" = "frontend-api.clerk.services"
  }
}

resource "cloudflare_dns_record" "clerk_dev" {
  for_each = local.clerk_dns_records_dev

  zone_id = local.zone_id
  name    = each.key
  type    = "CNAME"
  content = each.value
  ttl     = 300
  proxied = false
  comment = "Managed by Terraform (infra/dns.tf) - Clerk production instance for app.paibot.dev"
}

# paibot.dev and www.paibot.dev have no site of their own yet: they redirect to app.paibot.dev
# (infra/redirects.tf). Redirect Rules only run on proxied traffic, so both get a proxied record; the
# apex one points at a documentation-range address that is never contacted. The app itself is the Worker's
# custom domain app.paibot.dev (wrangler.jsonc), and doc.paibot.dev is reserved for the documentation.
resource "cloudflare_dns_record" "apex" {
  zone_id = local.zone_id
  name    = "paibot.dev"
  type    = "A"
  content = "192.0.2.1"
  ttl     = 1
  proxied = true
  comment = "Managed by Terraform (infra/dns.tf) - redirect only, see infra/redirects.tf"
}

resource "cloudflare_dns_record" "www_dev" {
  zone_id = local.zone_id
  name    = "www"
  type    = "CNAME"
  content = "paibot.dev"
  ttl     = 1
  proxied = true
  comment = "Managed by Terraform (infra/dns.tf) - redirect only, see infra/redirects.tf"
}
