# React Router migration validation

This is an isolated validation app, not a replacement for the deployed Next.js/vinext app. It uses React Router Framework Mode with SSR in Cloudflare's local Workers runtime, `@clerk/react-router` without patches, and `use-intl` with the existing message catalogs.

## Run

```sh
cd migration/react-router
npm ci --include=dev
cp .dev.vars.example .dev.vars
# Set development Clerk keys in .dev.vars. Do not use production keys.
npm run dev
```

Open http://localhost:3002/ja (also `/en` and `/zh`). All 12 tools, the cover, app catalog, about page and Clerk sign-in/sign-up routes are available. Known public and auth URLs without a locale redirect to Japanese with status 307, preserving the query string. Unknown paths remain 404.

The components, styles, message catalogs and app registry are snapshots of the existing source. This duplication is temporary for the migration experiment, not a second permanent implementation. Changes to the existing app do not automatically update this snapshot.

## Verify

```sh
npm run typecheck
npm run build
# With npm run dev running:
npm run check:smoke
# Alternatively, start built Workers preview:
npm run preview
CHECK_BROWSER_BASE_URL=http://localhost:3003 npm run check:smoke
```

Playwright needs Chromium installed (`npx playwright install chromium`) on a fresh machine.

The smoke test checks the raw SSR HTML for all 45 public URLs (15 pages × 3 locales) and 6 auth URLs: exactly one nonempty title, canonical/hreflang, OG/Twitter, indexing and security headers. It also checks locale redirects and query preservation, 404s, robots and every sitemap entry. A fresh browser context checks Unicode character counting after hydration, client-side language navigation, persisted theme, Clerk's logged-out sign-in/sign-up forms, browser errors and CSP violations. It does not submit credentials or verify a complete OAuth/email-code login, and it does not exercise every tool's functionality.

The expected metadata origin defaults to `https://dev.paibot.app`, with indexing disabled. When testing a different configuration, set `CHECK_SITE_URL` and `CHECK_SITE_INDEXABLE=true` to match the server's `SITE_URL`/`SITE_INDEXABLE`. These test variables only set expectations; they do not change the server. The CI workflow builds and checks a local Workers preview without deploying.

No deploy command or domain route is configured. `workers_dev` and preview URLs are disabled. `.dev.vars`, generated build files (which can contain a local `.dev.vars`), and dependencies are ignored by git. Secrets are only read by server-side Clerk code; never prefix a secret key with `VITE_`.

## Before replacing the main app

- Remove snapshot duplication when adopting the migration.
- Verify production indexing configuration. Canonical/hreflang, sitemap and robots are implemented; the validation Worker defaults to noindex.
- Verify CSP and production Clerk authorized parties on the target deployment. Local checks cover the security headers and Clerk form rendering, not all authenticated flows or external integrations.
- Verify sign-up, sign-out, authenticated SSR and complete login with a test account.
- Update CI and Workers dev/production build configuration; verify Cloudflare Access against the actual dev Worker before switching traffic.
- Remove Next.js, vinext and their Clerk patch only after the migration checks pass.

References: https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/ and https://clerk.com/docs/react-router/getting-started/quickstart .
