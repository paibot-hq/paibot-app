@AGENTS.md

## Current app

React Router Framework Mode + Cloudflare Vite plugin + Clerk React Router + use-intl.
The migration snapshot has been consolidated into `src/`; `messages/` is the single
translation source. Next.js, vinext and the Clerk patch are no longer dependencies.
Historical notes are in `docs/archive/next-vinext-notes.md`.

See `README.md` for development/testing and `docs/plans/react-router-cutover.md`
for outstanding deployment checks, environment selection and rollback.

## Infrastructure boundaries

Terraform in `infra/` owns account-level resources (Access, DNS, D1, R2).
Wrangler owns Worker code, bindings and custom domains; never manage the same
resource with both. The Terraform state R2 bucket must not become an app binding.
Existing AWS/GCP and Cloudflare account notes are in `docs/infra/`.
Do not print secret keys. Runtime Clerk keys must be synced to Workers Secrets;
`.dev.vars` only configures local execution and does not provision remote secrets.

## Adding a tool

- Add a route in `src/routes.ts` and a leaf component in `src/routes/`.
- Components/CSS Modules belong in `src/components/`; shared styles in `src/styles/`.
- Add translations to all three `messages/*.json` catalogs.
- Public pages render `PublicHead` and are listed in `src/lib/seo.ts`.
- The catalog is `src/lib/apps.tsx`. Keep coming-soon pages out of the sitemap.
- Authenticate/authorize in each protected loader/action using Clerk's server API;
  merely nesting a route does not protect it.

## Math project

`/math` is a noindex coming-soon page. `docs/plans/problemset.md` is the approved
math problem-set plan. Its vinext-specific sections are historical. Existing
KaTeX components are retained for this work; D1/infra changes are outside the
framework migration.
