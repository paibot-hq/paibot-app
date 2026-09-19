# The Cloudflare provider reads its API token from the CLOUDFLARE_API_TOKEN
# environment variable automatically — never hardcode it here or pass it as a
# committed variable default. Locally, export it in your shell before running
# terraform; in CI, it's injected from GitHub Secrets (see infra/README.md).
provider "cloudflare" {}
