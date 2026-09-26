// Secrets are provisioned separately from wrangler.jsonc. Keep these types
// available even on clean CI runners without a local .dev.vars file.
declare namespace Cloudflare {
  interface Env {
    CLERK_PUBLISHABLE_KEY: string;
    CLERK_SECRET_KEY: string;
    WHOIS_ROOT_SERVER: string;
    DB: D1Database;
  }
}
