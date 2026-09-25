# PAIBOT.app

React Router Framework Mode + TypeScript + Clerk + use-intl, with SSR on Cloudflare Workers.
Japanese, English and Simplified Chinese use `/ja`, `/en`, `/zh` URLs.

## Development

Node.js 22 or later:

```sh
npm ci
cp .dev.vars.example .dev.vars # only when no local file exists
# Set development Clerk keys (pk_test_ / sk_test_).
npm run dev
```

Open http://localhost:3002/ja. Source lives in `src/`, translations in `messages/`,
and assets in `public/`. The old `migration/react-router` working directory is no
longer used. Existing ignored files there may remain locally; do not commit them.

`CLERK_PUBLISHABLE_KEY` replaces `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in the app.
`CLERK_SECRET_KEY` stays server-only. CI still reads the existing GitHub secret
names, so no GitHub-secret rename is needed. `.env.local` is no longer the app's
local Clerk configuration. Never use production keys in local auth tests.

## Verification

```sh
npm run typecheck
npm run check:build-targets     # production/rr-dev/dev builds and config assertions
npx playwright install chromium # first run only
npm run check:access            # redirects cannot leak Access headers
npm run check:i18n              # starts/stops its own local Workers
npm run preview                # port 3003; keep running in another terminal
CHECK_BROWSER_BASE_URL=http://localhost:3003 npm run check:smoke
CHECK_BROWSER_BASE_URL=http://localhost:3003 npm run check:tools
CHECK_BROWSER_BASE_URL=http://localhost:3003 npm run check:auth
```

- `check:i18n`: SSR/SEO/robots/sitemap with both dev and production indexing policies.
- `check:smoke`: 45 public URLs and 9 auth/coming-soon URLs, redirects, headers,
  Unicode input, locale navigation, persisted theme, Clerk forms and CSP violations.
- `check:tools`: one meaningful flow for each of 12 tools. IP responses are mocked
  to verify both protocols and partial failure without requiring runner IPv6.
- `check:auth`: real development-instance signup/email verification, authenticated
  SSR, session persistence, sign-out and sign-in. Uses Clerk's test-address flow
  (no real email), creates a unique fixture user and deletes it in `finally`.
  Requires `.dev.vars`; rejects live keys and non-local targets. This is separate
  from routine CI because it creates a temporary user in the dev Clerk instance.

For deployed smoke tests set `CHECK_BROWSER_BASE_URL`, `CHECK_SITE_URL`, and
`CHECK_SITE_INDEXABLE=true` for production. Dev Access tests additionally need
`CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`. Headers are scoped to the app
origin and never automatically forwarded across an external redirect.

## Environments and releases

| Build | Worker | Domain | Indexing |
| --- | --- | --- | --- |
| `npm run build` | `paibot-app-dev` | `dev.paibot.app` | noindex |
| `npm run build:production` | `paibot-app` | `paibot.app` | index |
| `npm run build:validation` | `paibot-react-router-validation` | `rr-dev.paibot.app` | noindex |

Select the environment at **build time**; deploy `build/server/wrangler.json`
without another `--env`. Runtime keys live in Workers Secrets. Local `.dev.vars`
and build output are ignored and must not be committed.

The development workflow verifies then deploys on main. Production deployment is
manual (`App (production)`), with post-deploy smoke tests and release tagging.
The production workflow also supports rollback refs from the old vinext app.
See [cutover checklist](docs/plans/react-router-cutover.md) before releasing.
