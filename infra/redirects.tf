# www.<domain> -> paibot.io, preserving path and query string. These are zone-level Redirect Rules
# (Cloudflare's newer replacement for Page Rules), custom rulesets in the http_request_dynamic_redirect
# phase. They need the `www` DNS records in infra/dns.tf to be proxied: Redirect Rules only evaluate
# traffic that actually passes through Cloudflare's edge.
#
# The legacy apex (paibot.app) is not here: the Worker answers it with a 301 (src/lib/legacy-host.ts).
resource "cloudflare_ruleset" "www_redirect" {
  zone_id     = local.legacy_zone_id
  name        = "www to paibot.io redirect"
  description = "Redirects www.paibot.app to https://paibot.io, preserving path and query string"
  kind        = "zone"
  phase       = "http_request_dynamic_redirect"

  rules = [
    {
      description = "Redirect legacy www to paibot.io"
      expression  = "(http.host eq \"www.paibot.app\")"
      action      = "redirect"
      action_parameters = {
        from_value = {
          status_code           = 301
          preserve_query_string = true
          target_url = {
            expression = "concat(\"https://paibot.io\", http.request.uri.path)"
          }
        }
      }
    }
  ]
}

resource "cloudflare_ruleset" "www_redirect_io" {
  zone_id     = local.zone_id
  name        = "www to apex redirect"
  description = "Redirects www.paibot.io to paibot.io, preserving path and query string"
  kind        = "zone"
  phase       = "http_request_dynamic_redirect"

  rules = [
    {
      description = "Redirect www to apex"
      expression  = "(http.host eq \"www.paibot.io\")"
      action      = "redirect"
      action_parameters = {
        from_value = {
          status_code           = 301
          preserve_query_string = true
          target_url = {
            expression = "concat(\"https://paibot.io\", http.request.uri.path)"
          }
        }
      }
    }
  ]
}
