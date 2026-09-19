output "zone_id" {
  description = "Zone ID for paibot.app. Reference this when wiring up custom domains / DNS in wrangler.jsonc or the Cloudflare dashboard."
  value       = local.zone_id
}
