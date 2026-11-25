import { defineConfig } from 'void/config';

// One file for every deployment, picked at build and deploy time by PAIBOT_APP_TARGET, because Void has no named
// Cloudflare environments (what wrangler.jsonc's `env.production` used to be):
// - dev (the default, as a build without CLOUDFLARE_ENV used to be): paibot-app-dev on dev.paibot.app.
// - production: paibot-app on paibot.app.
// - preview: paibot-app-void on workers.dev, for trying Void's deploy without touching either of the others.
//   It uses dev's database; deploy it with --skip-migrations so only dev's own deploy changes that schema.
// Resource IDs are always given, never left for Void to create: Terraform (infra/d1.tf) owns the databases.
// Names, routes and vars are explicit in each target; nothing is inherited.
type Target = 'dev' | 'production' | 'preview';
type D1 = typeof DEV_DB;
interface CloudflareTarget {
  name: string;
  routes: { pattern: string; custom_domain: boolean }[];
  workers_dev: boolean;
  vars: Record<string, string>;
  ratelimits: { name: string; namespace_id: string; simple: { limit: number; period: number } }[];
  d1_databases: D1[];
}
const target = (process.env.PAIBOT_APP_TARGET ?? 'dev') as Target;
if (!['dev', 'production', 'preview'].includes(target)) throw new Error(`PAIBOT_APP_TARGET must be dev, production or preview, not ${target}`);

const ACCOUNT_ID = 'b041431380f52e0bf2bb47b174e95b6a';
// Both environments use the Asia-Pacific databases (app_dev_apac/app_prod_apac): the site targets Japan and the
// original ENAM ones added ~140ms per query. Migrations stay where drizzle-kit writes them (drizzle.config.ts), in the
// table wrangler has always recorded them in, so the history applied so far is the one Void checks.
const DEV_DB = { binding: 'DB', database_name: 'paibot-app-dev-apac', database_id: '11f4b088-e6f9-4c96-baa7-cfc1859ecae8', migrations_dir: 'migrations', migrations_table: 'd1_migrations' };
const PROD_DB = { binding: 'DB', database_name: 'paibot-app-apac', database_id: 'fdfaf455-d8c4-4652-a2a0-4ccda9ed1d61', migrations_dir: 'migrations', migrations_table: 'd1_migrations' };

// Per-IP limits for the tools that make outbound requests (website status check, domain lookup), so they cannot be
// scripted into a relay against other sites, and for the government FAQ search and its answers written by the model
// (dearer than a vector, so fewer). Each deployment counts in namespaces of its own.
function rateLimits(first: number) {
  return [
    { name: 'TOOL_RATE_LIMIT', namespace_id: String(first), simple: { limit: 10, period: 60 } },
    { name: 'GOVFAQ_RATE_LIMIT', namespace_id: String(first + 2), simple: { limit: 30, period: 60 } },
    { name: 'GOVFAQ_ANSWER_RATE_LIMIT', namespace_id: String(first + 4), simple: { limit: 6, period: 60 } },
  ];
}

// WHOIS_ROOT_SERVER and RDAP_BOOTSTRAP_URL are also test seams: tests/e2e/whois.mjs points them at local fake servers
// (src/tools/domain/whois.server.ts). SITE_CHECK_ALLOW_PRIVATE is the same kind of seam for tests/e2e/site-check.mjs;
// it must stay "false" in every deployed environment (src/tools/site-check/site-check.server.ts). APP_VERSION is
// overridden at deploy and sent as X-App-Version, so CI can wait until the new version is serving before checks.
function vars(siteUrl: string, indexable: boolean) {
  return {
    SITE_URL: siteUrl,
    SITE_INDEXABLE: String(indexable),
    WHOIS_ROOT_SERVER: 'whois.iana.org:43',
    RDAP_BOOTSTRAP_URL: 'https://data.iana.org/rdap/dns.json',
    SITE_CHECK_ALLOW_PRIVATE: 'false',
    APP_VERSION: process.env.PAIBOT_APP_VERSION ?? 'local',
  };
}

const targets: Record<Target, CloudflareTarget> = {
  dev: {
    name: 'paibot-app-dev',
    routes: [{ pattern: 'dev.paibot.app', custom_domain: true }],
    workers_dev: false,
    vars: vars('https://dev.paibot.app', false),
    ratelimits: rateLimits(1001),
    d1_databases: [DEV_DB],
  },
  production: {
    name: 'paibot-app',
    routes: [{ pattern: 'paibot.app', custom_domain: true }],
    workers_dev: false,
    vars: vars('https://paibot.app', true),
    ratelimits: rateLimits(1002),
    d1_databases: [PROD_DB],
  },
  preview: {
    name: 'paibot-app-void',
    routes: [],
    workers_dev: true,
    vars: vars(process.env.PAIBOT_APP_SITE_URL ?? 'https://paibot-app-void.workers.dev', false),
    ratelimits: rateLimits(1007),
    d1_databases: [DEV_DB],
  },
};

const { vars: targetVars, ...cloudflare } = targets[target];

export default defineConfig({
  worker: {
    compatibility_date: '2026-09-13',
    compatibility_flags: ['nodejs_compat'],
    vars: targetVars,
  },
  cloudflare: {
    account_id: ACCOUNT_ID,
    ...cloudflare,
    preview_urls: false,
    observability: { enabled: true },
    version_metadata: { binding: 'CF_VERSION_METADATA' },
    // Workers AI, for the government FAQ search (src/routes/api.govfaq.embed.ts): it turns a question into numbers (an
    // embedding). The AI is Cloudflare's own and is billed to the account beyond the free allowance; the route is
    // limited per client IP by GOVFAQ_RATE_LIMIT.
    ai: { binding: 'AI' },
  },
  // The app reads its bindings from cloudflare:workers itself (src/db/client.server.ts), not through void/db, and
  // keeps Clerk for sign-in: Void-managed auth is not available to React Router apps.
  inference: { appType: 'framework' },
});
