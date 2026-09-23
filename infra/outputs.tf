output "zone_id" {
  description = "Zone ID for paibot.app. Reference this when wiring up custom domains / DNS in wrangler.jsonc or the Cloudflare dashboard."
  value       = local.zone_id
}

# Not printed anywhere in CI (terraform plan/apply output redacts sensitive
# values). After a local `terraform apply` that creates or rotates this token,
# read these with `terraform output -raw ci_access_client_id` /
# `-raw ci_access_client_secret` and register them as the CF_ACCESS_CLIENT_ID /
# CF_ACCESS_CLIENT_SECRET GitHub secrets (see .github/workflows/app.yml).
output "ci_access_client_id" {
  description = "Client ID for the GitHub Actions Access service token (CF-Access-Client-Id header)."
  value       = cloudflare_zero_trust_access_service_token.ci.client_id
  sensitive   = true
}

output "ci_access_client_secret" {
  description = "Client secret for the GitHub Actions Access service token (CF-Access-Client-Secret header)."
  value       = cloudflare_zero_trust_access_service_token.ci.client_secret
  sensitive   = true
}
