# www.paibot.app -> paibot.app, preserving path and query string. This is a
# zone-level Redirect Rule (Cloudflare's newer replacement for Page Rules),
# implemented as a custom ruleset in the http_request_dynamic_redirect phase.
# Needs the `www` DNS record in infra/dns.tf to be proxied — Redirect Rules
# only evaluate traffic that's actually passing through Cloudflare's edge.
resource "cloudflare_ruleset" "www_redirect" {
  zone_id     = local.zone_id
  name        = "www to apex redirect"
  description = "Redirects www.paibot.app to paibot.app, preserving path and query string"
  kind        = "zone"
  phase       = "http_request_dynamic_redirect"

  rules = [
    {
      description = "Redirect www to apex"
      expression  = "(http.host eq \"www.paibot.app\")"
      action      = "redirect"
      action_parameters = {
        from_value = {
          status_code           = 301
          preserve_query_string = true
          target_url = {
            expression = "concat(\"https://paibot.app\", http.request.uri.path)"
          }
        }
      }
    }
  ]
}
