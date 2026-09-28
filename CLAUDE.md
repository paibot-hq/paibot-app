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
- The catalog is `src/lib/app-catalog.ts` (plain data, also read by `tests/e2e/smoke.mjs` and `catalog.mjs`);
  give the new slug an icon in `APP_ICONS` in `src/lib/apps.tsx`. Keep coming-soon pages out of the sitemap.
- Authenticate/authorize in each protected loader/action using Clerk's server API;
  merely nesting a route does not protect it.

## Math project

`/math` is a published landing page linking to quiz units, each a set picker plus
five-problem, four-choice sets served from D1: `/math/arith/:setId`
(addition/subtraction, multiplication/division, order of operations, word problems),
`/math/signed/:setId` (negative numbers), `/math/factorization/:setId`, and
`/math/pythagoras/:setId` (right-triangle side lengths). All use the shared
`math_problems` table, indexed by
unit, set, publication status and position. Unit-specific data lives in a JSON
`payload`, typed in `src/lib/math-arith.ts`, `math-factorization.ts`, and
`math-pythagoras.ts`.
`src/lib/math-problems.server.ts` reads published sets for all units; routes
convert payloads for display. All render through
`src/components/math-set-picker.tsx` and `math-set-quiz.tsx`.

`src/lib/math-catalog.ts` defines mathematical domains (`domain`), difficulty
badges (`stage`: elementary/middle/high/university = foundations/intermediate/advanced/higher),
unit order and publication status. `/math` groups units by domain, then difficulty,
keeping catalog order within each difficulty. Grade mappings belong in separate
country/region curriculum tables; stages are not school assignments.
`/math` renders this catalog; coming-soon units share `math-unit-index.tsx` and
`math-unit-set.tsx`, which show set names and an empty quiz. Their pages are
noindex and excluded from publicPaths/the sitemap. Published units retain their
static routes and existing `math-*-sets.ts` catalogs, which take precedence.
To publish a new unit, add dedicated routes, a set catalog, payload/display
conversion, independent verification and import support like the existing units,
then change the catalog status to `published` and register its public SEO paths.

Pythagoras figures use integer coordinates and `math-figure.tsx` SVG rendering; labels
and localized accessible descriptions are calculated, never stored.
`scripts/validate-math-pythagoras.mjs` independently verifies geometry, radicals and set coverage.

Problems are LLM-generated into `src/data/math-*.json` and never trusted as-is:
`npm run test:sympy` (`scripts/verify_math.py`) re-derives every unit's
answer with SymPy: each unit only converts a problem into its answer and four
choices, and one shared check requires exactly one matching choice. The Node
validators (`scripts/validate-math-*.mjs`, run by `npm test`)
enforce only each set's rules (ranges, exact division, coverage, duplicates);
they no longer check answer keys. Word problems' prose also gets a blind second-model review before they
are published. Problems start as `published: false` and are imported with
`npm run math:import:local|dev|prod` through `scripts/import-math.mjs`, which
runs the Node set-rule checks before upserting common columns and payloads
(answers are gated by CI's `test:sympy` on `main`, which every deploy needs); a set with no
published problems shows "being prepared". `docs/plans/math-units.md` is the unit roadmap and the verification
rules new units must follow; `docs/plans/problemset.md` is the larger plan it
refines (its vinext-specific sections are historical).

| 階層 | ID形式 | 例 |
| --- | --- | --- |
| 単元 | 英小文字 | `arith`, `signed`, `factorization` |
| 学習項目 | `単元.項目` | `arith.add-sub` |
| 問題セット | 単元内で一意の文字列(項目の短縮名+練習A/B) | `add-sub-a` |
| 問題 | 単元+3桁の通し番号 | `arith-001` |

表示順はセット一覧(`src/lib/math-*-sets.ts`)の並びで決め、IDは変えない。問題IDはセットに依存しない。

問題の生成・検算・盲検レビューから公開までの操作は [問題を追加する手順](docs/plans/math-units.md#9-問題を追加する手順) を参照。
