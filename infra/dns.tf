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
# released. The paibot.io instance's records are in clerk_dns_records_io below.
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

# The new production Clerk instance for paibot.io. `clerk deploy` (interactive) prints the BIND zone file:
# copy its five CNAMEs here ("clerk", "accounts", "clkmail", "clk._domainkey", "clk2._domainkey" under
# paibot.io, with that instance's own targets) and apply. Empty until then.
locals {
  clerk_dns_records_io = {
    # "clerk.paibot.io" = "frontend-api.clerk.services"
  }
}

resource "cloudflare_dns_record" "clerk_io" {
  for_each = local.clerk_dns_records_io

  zone_id = local.zone_id
  name    = each.key
  type    = "CNAME"
  content = each.value
  ttl     = 300
  proxied = false
  comment = "Managed by Terraform (infra/dns.tf) - Clerk production instance for paibot.io"
}

# www.paibot.io -> paibot.io (infra/redirects.tf), proxied for the same reason as the legacy www record.
resource "cloudflare_dns_record" "www_io" {
  zone_id = local.zone_id
  name    = "www"
  type    = "CNAME"
  content = "paibot.io"
  ttl     = 1
  proxied = true
  comment = "Managed by Terraform (infra/dns.tf) - www redirects to the apex via infra/redirects.tf"
}
