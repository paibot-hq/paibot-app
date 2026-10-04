# DNS records required by Clerk's production instance (custom domain +
# transactional email deliverability for clkmail/DKIM). Captured verbatim from
# the BIND zone file `clerk deploy` generated, so they're reviewable in a PR
# rather than added by hand through the Cloudflare dashboard. See
# docs/plans/production-deploy.md.
#
# All records point at Clerk's own infrastructure, so they must stay
# unproxied ("DNS only" / grey cloud): Clerk terminates TLS and serves these
# hosts directly, and proxying through Cloudflare would break that.
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

  zone_id = local.zone_id
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
  zone_id = local.zone_id
  name    = "www"
  type    = "CNAME"
  content = "paibot.app"
  ttl     = 1 # must be 1 ("Auto") when proxied
  proxied = true
  comment = "Managed by Terraform (infra/dns.tf) - www redirects to the apex via infra/redirects.tf"
}
