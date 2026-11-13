# The Cloudflare account ID is not a secret (it's visible in the dashboard URL
# and in `wrangler whoami` output) — safe to default here rather than pass in.
variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns all resources in this configuration."
  type        = string
  default     = "b041431380f52e0bf2bb47b174e95b6a" # paibot's Cloudflare account
}

variable "root_domain" {
  description = "The zone (domain) this project's DNS records live under."
  type        = string
  default     = "paibot.app"
}
