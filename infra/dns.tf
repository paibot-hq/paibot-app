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

# The production Clerk instance for paibot.dev (the parent domain, so every site shares the login), created with
# `clerk deploy`: its five CNAMEs, copied from what it printed. They must stay DNS only (proxied = false below).
locals {
  clerk_dns_records_dev = {
    "clerk.paibot.dev"           = "frontend-api.clerk.services"
    "accounts.paibot.dev"        = "accounts.clerk.services"
    "clkmail.paibot.dev"         = "mail.9otjr4640v6g.clerk.services"
    "clk._domainkey.paibot.dev"  = "dkim1.9otjr4640v6g.clerk.services"
    "clk2._domainkey.paibot.dev" = "dkim2.9otjr4640v6g.clerk.services"
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
  comment = "Managed by Terraform (infra/dns.tf) - Clerk production instance for paibot.dev"
}

# paibot.dev is the hub (the cover of the three sites) and app/learn/doc are its subdomains. The apex gets its DNS
# record from the Worker's custom domain (wrangler.jsonc, added together with the host split), so none is managed
# here. www.paibot.dev redirects to the apex (infra/redirects.tf); Redirect Rules only run on proxied traffic, so
# it is a proxied CNAME. doc.paibot.dev is reserved for the documentation site.
resource "cloudflare_dns_record" "www_dev" {
  zone_id = local.zone_id
  name    = "www"
  type    = "CNAME"
  content = "paibot.dev"
  ttl     = 1
  proxied = true
  comment = "Managed by Terraform (infra/dns.tf) - redirect only, see infra/redirects.tf"
}
