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

# DMARC: what a receiving mail server should do with mail from paibot.app that fails SPF and DKIM. "p=none" only watches: nothing is rejected or sent to
# spam because of it, so it is safe to start with. It can be tightened (p=quarantine, then p=reject) once reports show that all the mail that should pass does.
# No report address (rua) is set yet, so no reports are sent; add one (mailto:...) to see who sends mail as paibot.app.
resource "cloudflare_dns_record" "dmarc" {
  zone_id = local.zone_id
  name    = "_dmarc.paibot.app"
  type    = "TXT"
  # In quotes, as the API returns TXT content (see google_workspace_spf).
  content = "\"v=DMARC1; p=none\""
  ttl     = 1 # "Auto"
  comment = "Managed by Terraform (infra/dns.tf) - DMARC, monitoring only"
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

# Bing Webmaster Tools proves ownership of the site by this CNAME (Bing's "CNAME record" verification method). It points at Bing, not at the app,
# so it stays unproxied ("DNS only"). It can be removed once the site is verified and no longer needs to be re-checked, but Bing re-checks now and then.
resource "cloudflare_dns_record" "bing_verification" {
  zone_id = local.zone_id
  name    = "048841c43e41259fb3ee015e3e86aae2.paibot.app"
  type    = "CNAME"
  content = "verify.bing.com"
  ttl     = 300
  proxied = false
  comment = "Managed by Terraform (infra/dns.tf) - Bing Webmaster Tools site verification"
}

# Mail for the apex (paibot.app) is handled by Google Workspace: Google's single MX host, and an SPF record that lets Google send for the domain.
# (The two google-site-verification TXT records on the apex were added by hand when Workspace was set up; they are not managed here.)
# The DKIM key (google._domainkey) is made in Google's Admin console after the MX is live, and DMARC (_dmarc) is added once mail flows; both are TXT records
# to be added here as well. The SPF record is the only one on the apex: a domain may have just one.
resource "cloudflare_dns_record" "google_workspace_mx" {
  zone_id  = local.zone_id
  name     = "paibot.app"
  type     = "MX"
  content  = "smtp.google.com"
  priority = 1
  ttl      = 300
  comment  = "Managed by Terraform (infra/dns.tf) - Google Workspace mail"
}

resource "cloudflare_dns_record" "google_workspace_spf" {
  zone_id = local.zone_id
  name    = "paibot.app"
  type    = "TXT"
  # The provider keeps TXT content in quotes, as the API returns it; without them every plan would show a change.
  content = "\"v=spf1 include:_spf.google.com ~all\""
  ttl     = 300
  comment = "Managed by Terraform (infra/dns.tf) - SPF for Google Workspace"
}

# DKIM for Google Workspace: the public key of the signature Google puts on mail sent from paibot.app (made in the Admin console, "Authenticate email").
# A TXT string is at most 255 characters and the key is longer, so the value is written as two quoted strings, which resolvers join into one.
resource "cloudflare_dns_record" "google_workspace_dkim" {
  zone_id = local.zone_id
  name    = "google._domainkey.paibot.app"
  type    = "TXT"
  content = "\"v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvbZvU3VYRFPPF2py+tB2MkcpVmn1li4UNyYICDCIbQzHUEHim1ASyERiJs7QYdCAlKBcnYMRGSaZxlZ5s04gsY+62M4H6t1ovzA978Rg+3TjPJEPgAuZ+SukpT9S1i+nDzz9pmNIMpKotcdv1Kj6Ydw84yUJef0XlA/i3/BRABfV3x777w7jjt+4Uym0\" \"Hxqebh7K6LUWDTTS3x8nm1uZUsDqgn07Q+5ytVt2Jx/bXB9yKRtQ8yr7hznGShCS6BBpJt05vhY0J0Kkm16hIUVDn4OsI/Wc8WJrCQpTcLxfENtZUPSKUq8hUlPOmGB4+Y16Io/W+yx2evnqf4DlB1wcGwIDAQAB\""
  ttl     = 300
  comment = "Managed by Terraform (infra/dns.tf) - DKIM for Google Workspace"
}
