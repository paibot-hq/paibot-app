# React Router cutover

## Local implementation

The validation app is consolidated into root `src/`. Components, translations,
styles and the app registry each have one source. The 12 tools, `/math`
coming-soon page, locale/auth redirects, icon/apple icon and OG image are preserved.
Next.js/vinext/next-intl/patch-package and their Clerk patch are removed from the
active build. The original source remains in git (pre-migration baseline:
`86bb7fd`) and historical notes in `docs/archive/next-vinext-notes.md`.

This change prepares the release; editing these files does not deploy them.

## Before production dispatch

1. Review the migration diff and merge only when ready to replace the dev Worker.
   Main's `App (development)` now builds React Router and deploys `dev.paibot.app`.
2. Require the dev workflow, including the smoke test through Cloudflare Access,
   to succeed. The existing dev Access service policy/secrets are reused.
3. On deployed dev, verify the actual sign-in/sign-out flow and external IP lookup.
   Automated tool tests mock IP connectivity; local auth tests use a dev fixture.
4. Confirm production Clerk domain/OAuth settings and `authorizedParties` on the
   actual production origin. Local tests use test keys and cannot substitute for
   production OAuth/domain validation. Runtime uses `[SITE_URL]` for live keys.
5. Record the current successful production release tag or deployment version.
   Dispatch `App (production)` manually. It checks production Worker name,
   canonical origin and indexability before uploading; then runs deployed smoke.
6. Verify Google/email login and logout on production after switching. A failing
   post-deploy smoke marks the workflow failed; it does not automatically roll back.

## Runtime configuration

`wrangler.jsonc` has explicit names/routes/vars for dev and production.
Use `CLOUDFLARE_ENV=production` at build time (`build:production`). `SITE_URL` and
`SITE_INDEXABLE` are Workers vars, not `.env.local` build inputs. `check:i18n`
starts the built Worker with explicit local overrides to test both indexing modes.

Clerk's `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are runtime secrets.
The CI jobs read existing GitHub secret names; no secret rotation is necessary.
Production also retains the old `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` Workers secret
for rollback compatibility. Local verification never uploads `.dev.vars`.

The `validation` build/env and the rr-dev Worker it targeted (plus its Access
application) were removed once the migration was fully adopted in production
(2026-09-26) — they only existed for pre-adoption spike testing.

## Rollback

Run `App (production)` with `ref` set to the previously recorded release tag or
commit. The workflow detects whether that ref uses React Router or vinext, builds
with `CLOUDFLARE_ENV=production`, selects `build/server` or `dist/server`, and syncs
both Clerk publishable-key names. Old refs retain their own package-lock and
patch-package setup. No new release tag is created for a rollback.

Alternatively use the previously recorded Cloudflare deployment version through
the dashboard. Do not delete the Clerk instance, domain, Access applications,
Terraform state or release tags as part of this migration.

## Verification performed (2026-09-25, local)

- Typecheck including use-intl translation keys: passed.
- Actual production, validation and dev builds: passed; generated Worker names,
  routes, indexability, version metadata and disabled fallback URLs asserted.
- Dev and production indexing simulations: passed for all 45 public URLs and
  9 auth/coming-soon URLs, including canonical/hreflang, sitemap, assets and robots.
- Built-Worker smoke: passed; no uncaught JS errors, console errors or CSP violations.
- All 12 tools: basic functional flows passed (IP network responses mocked).
- Development Clerk signup/email-code verification, authenticated SSR, reload,
  logout and email-code signin: passed; no CSP violations, fixture deleted.
- Access header redirect regression: passed using two local HTTP origins.
- Workflow YAML syntax and git diff whitespace: passed. Updated workflows have
  not run on GitHub yet; no deployment or Terraform apply was performed.

Production OAuth/live-key behavior and the revised deployed-dev smoke still need
real-domain verification after review. Local auth tests use the official Clerk
helper for sign-out and email-code sign-in; they do not automate Google's UI.
