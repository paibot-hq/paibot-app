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

`/math` is a published landing page linking to quiz units, each a set picker plus
five-problem, four-choice sets served from D1: `/math/arith/:setId`
(order of operations, negative numbers, word problems) and
`/math/factorization/:setId`. Both use the shared `math_problems` table, indexed by
unit, set, publication status and position. Unit-specific data lives in a JSON
`payload`, typed in `src/lib/math-arith.ts` and `math-factorization.ts`.
`src/lib/math-problems.server.ts` reads published sets for either unit; routes
convert payloads for display. Both render through
`src/components/math-set-picker.tsx` and `math-set-quiz.tsx`.

Problems are LLM-generated into `src/data/math-*.json` and never trusted as-is:
`npm run check:math-arith` / `check:math-factorization` re-derive every answer
(by evaluating the expression / expanding each choice) and enforce each set's
rules. Word problems' prose also gets a blind second-model review before they
are published. Problems start as `published: false` and are imported with
`npm run math:import:local|dev|prod` through `scripts/import-math.mjs`, which
validates both banks before upserting common columns and payloads; a set with no
published problems shows "being prepared". `docs/plans/math-units.md` is the unit roadmap and the verification
rules new units must follow; `docs/plans/problemset.md` is the larger plan it
refines (its vinext-specific sections are historical).
