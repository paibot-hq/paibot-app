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

output "d1_app_dev_apac_database_id" {
  description = "Database ID for the dev D1 database. Not a secret, but Terraform doesn't manage wrangler.jsonc's d1_databases binding (see infra/README.md) — copy this value into the top-level d1_databases by hand after apply."
  value       = cloudflare_d1_database.app_dev_apac.id
}

output "d1_app_prod_apac_database_id" {
  description = "Database ID for the production D1 database. Not a secret, but Terraform doesn't manage wrangler.jsonc's d1_databases binding (see infra/README.md) — copy this value into env.production's d1_databases by hand after apply, as its own PR."
  value       = cloudflare_d1_database.app_prod_apac.id
}
