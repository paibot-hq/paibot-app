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

# IPv4-only/IPv6-only hosts for the IP tool's dual-stack detection (/ip page
# fetches both from the client, see src/components/ip-lookup.tsx). Cloudflare
# normally answers both A and AAAA for any proxied hostname regardless of the
# record type you create — `settings.ipv4_only`/`ipv6_only` is a documented
# escape hatch ("intended for exceptional cases") that suppresses the other
# answer, forcing a client to connect over just that one protocol. Content is
# a placeholder (RFC 5737/3849 documentation addresses): proxied + a Workers
# route (wrangler.jsonc) is what actually serves the request, so the record's
# content is never dialed.
#
# One pair per environment: `env.production`'s routes/vars aren't inherited
# from the top level any more than name/routes are elsewhere in this repo
# (see docs/plans/production-deploy.md), so the dev and production Workers
# each need their own hostnames.
locals {
  ip_probe_records = {
    "ipv4.dev.paibot.app" = { type = "A", content = "192.0.2.1", ipv4_only = true, ipv6_only = false }
    "ipv6.dev.paibot.app" = { type = "AAAA", content = "100::", ipv4_only = false, ipv6_only = true }
    "ipv4.paibot.app"     = { type = "A", content = "192.0.2.1", ipv4_only = true, ipv6_only = false }
    "ipv6.paibot.app"     = { type = "AAAA", content = "100::", ipv4_only = false, ipv6_only = true }
  }
}

resource "cloudflare_dns_record" "ip_probe" {
  for_each = local.ip_probe_records

  zone_id = local.zone_id
  name    = each.key
  type    = each.value.type
  content = each.value.content
  ttl     = 1 # Must be 1 ("Auto") when proxied — Cloudflare controls the TTL itself.
  proxied = true
  comment = "Managed by Terraform (infra/dns.tf) - IPv4/IPv6 detection for the IP tool"

  settings = {
    ipv4_only     = each.value.ipv4_only
    ipv6_only     = each.value.ipv6_only
    flatten_cname = false
  }
}
