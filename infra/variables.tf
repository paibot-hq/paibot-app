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

# Who may sign in to the development site through Cloudflare Access. No default: the addresses are not kept in the
# public repository. CI passes the DEV_ACCESS_EMAILS repository variable (a JSON list, in the order applied so far);
# locally, put them in a *.tfvars file (ignored by git) or TF_VAR_dev_access_emails.
variable "dev_access_emails" {
  description = "Email addresses allowed to sign in to the development site (Cloudflare Access)."
  type        = list(string)
  nullable    = false

  validation {
    condition     = length(var.dev_access_emails) > 0
    error_message = "List at least one email address."
  }
}
