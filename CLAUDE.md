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

A tool is a folder, `src/tools/<slug>/`, holding everything that is only its own:
- `route.tsx` (the page; renders `PublicHead`), components, CSS Modules, logic
  (`*.server.ts` for server-only code) and `*.test.mjs` unit tests (run by `npm test`).
- `e2e.mjs`: one short browser flow (`export default async function ({ page, main, go, result, errors })`),
  run by `npm run e2e -- tools`. Checks every tool shares (loads in three locales,
  no uncaught errors, fits 390px) come from `e2e -- catalog` with no code.

Then register it in the shared lists (these, and nothing else, change outside the folder):
- `src/lib/app-catalog.ts`: the entry (`slug` = folder name, `href`). Routes
  (`src/routes.ts`) and public SEO paths (`src/lib/seo.ts`) are derived from it;
  `private: true` keeps a signed-in page out of the sitemap. Coming-soon entries have no page.
- `APP_ICONS` in `src/lib/apps.tsx`, and `App.<messageKey>` in all three `messages/*.json`.

Code shared by several tools stays in `src/components/`, `src/lib/` and `src/styles/`.
PR CI runs per-tool browser checks only for the tools a change can affect
(`scripts/affected-tools.mjs`: the tool's folder, its messages, registry additions);
a change to shared code runs every tool, as does every push to `main`.
- Authenticate/authorize in each protected loader/action using Clerk's server API;
  merely nesting a route does not protect it.

## Math project

`/math` ("Math Drills") is the only math index: every unit and all of its sets
on one page (`src/components/math-unit-table.tsx`), filtered in the browser by
level, playability and name.
Sets with published problems in D1 are highlighted, and a signed-in user's
scores are shown. Units have no page of their own; former unit and entry URLs
301 to `/math`. Sets are five-problem, four-choice quizzes served from D1: `/math/arith/:setId`
(addition/subtraction, multiplication/division, order of operations, word problems),
`/math/signed/:setId` (negative numbers), `/math/factorization/:setId`, and
`/math/pythagoras/:setId` (right-triangle side lengths). All use the shared
`math_problems` table, indexed by
unit, set, publication status and position. Unit-specific data lives in a JSON
`payload`, typed in `src/lib/math-arith.ts`, `math-factorization.ts`, and
`math-pythagoras.ts`.
`src/lib/math-problems.server.ts` reads published sets for all units; routes
convert payloads for display. All render through `src/components/math-set-quiz.tsx`,
whose back link returns to `/math`.

`src/lib/math-catalog.ts` defines mathematical domains (`domain`), difficulty
badges (`stage`: elementary/middle/high/university = foundations/intermediate/advanced/higher),
unit order and publication status. `/math` groups units by domain, then difficulty,
keeping catalog order within each difficulty. Grade mappings belong in separate
country/region curriculum tables; stages are not school assignments.
Coming-soon units' sets share `math-unit-set.tsx`, which shows an empty quiz;
those pages are noindex and excluded from publicPaths/the sitemap. Published units retain their
static routes and existing `math-*-sets.ts` catalogs, which take precedence.
To publish a new unit, add dedicated routes, a set catalog, payload/display
conversion, independent verification and import support like the existing units,
then change the catalog status to `published` and register its public SEO paths.

Newer units don't get their own routes. Expression units
(`src/lib/math-expression-units.ts`: addition, multiplication, division) reuse
arith's integer-expression payload; formula units (`src/lib/math-formula-units.ts`:
decimals, fractions, powers, expressions, equations, expansion, square roots,
quadratics) use `FormulaPayload` (`src/lib/math-formula.ts`): a question and four
choices in one small formula grammar, of kind `calc`, `expand` or `solve`. The page
renders the TeX from those strings, and `scripts/verify_math.py` parses the same
grammar to re-derive the answer, so what is shown is what was checked. Both kinds
keep their sets (with `rule`s) in the catalog and their text under
`App.math.units.<unit>`, and share `routes/math-expression.tsx` / `math-formula.tsx`.
A new unit of either kind needs its registry entry, catalog sets with rules,
`src/data/math-<unit>.json`, rules in `scripts/validate-math-arith.mjs` or
`validate-math-formula.mjs`, and prompts in `scripts/math-prompts/`.

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
