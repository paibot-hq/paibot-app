import { env } from "cloudflare:workers";

// Server-only: reads Workers runtime env. Only import this from a loader
// (root's loader, sitemap's loader) or from workers/app.ts — never from
// component code, or "cloudflare:workers" fails to resolve in the client
// build (it doesn't exist in the browser).

// Never derive canonical URLs from request headers or localhost.
export const siteOrigin = new URL(env.SITE_URL || "https://app.paibot.dev").origin;
export const isIndexable: boolean = (env.SITE_INDEXABLE as string) === "true";
