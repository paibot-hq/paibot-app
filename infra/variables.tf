# The Cloudflare account ID is not a secret (it's visible in the dashboard URL
# and in `wrangler whoami` output) — safe to default here rather than pass in.
variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns all resources in this configuration."
  type        = string
  default     = "b041431380f52e0bf2bb47b174e95b6a" # Admin@paibot.co.jp's Account
}

variable "root_domain" {
  description = "The zone (domain) this project's DNS records live under. paibot.io is the site."
  type        = string
  default     = "paibot.io"
}

variable "legacy_domain" {
  description = "The previous domain. It only redirects to root_domain (the Worker answers with a 301, and www.<legacy_domain> has a Redirect Rule in redirects.tf) until the domain is released."
  type        = string
  default     = "paibot.app"
}
