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

Math is organized unit → learning item → practice set, all in
`src/lib/math-catalog.ts` (names under `App.math.units.<unit>.items.<item>` in
`messages/*.json`). Pages:
- `/math` ("Math Drills", `routes/math.tsx` + `components/math-unit-table.tsx`):
  every unit with its learning items, filtered in the browser by level,
  playability and name. Each unit's name links to its page and each item to its
  own; items with published problems in D1 are highlighted.
- `/math/<unit>` (`routes/math-unit.tsx`): the unit and its learning items.
- `/math/<unit>/<item>` (`routes/math-item.tsx`): the item and its practice sets
  (練習1, 2, ...) with a signed-in user's latest and best score, and a way back
  to the unit. Old set URLs (`/math/<unit>/<set id>`) 301 to the new ones.
- `/math/<unit>/<item>/<set>` (`routes/math-quiz.tsx`): a five-problem,
  four-choice quiz (`components/math-set-quiz.tsx`), which links back to the
  item's sets and to the unit. A set without published problems shows "being prepared".

A unit's `kind` says what shape its problems have, and so which payload, checker
and display it uses (`components/math-questions.tsx`):
- `expression`: integer expressions and word problems (`src/lib/math-arith.ts`);
  arith, signed, addition, multiplication, division.
- `factorization`: (x + p)(x + q); `pythagoras`: integer-coordinate figures
  drawn by `math-figure.tsx`, labels and accessible descriptions calculated.
- `formula`: `FormulaPayload` (`src/lib/math-formula.ts`), a question and four
  choices in one small formula grammar (numbers, letters, `pi`, `i`, `sqrt`,
  `sin`/`cos`/`tan`, `abs`, `log(x, base)`, `C`/`P`, `sum(term, k, from, to)`),
  of kind `calc`, `expand`, `transform`, `factor`, `solve`, `remainder`,
  `derivative`, `tangent`, `extremum`, `integral`, `area`, `term`, `series`,
  `radian`, `degree`, `recurrence`, `distribution`, `geometry`, `identity`,
  `inequality`, `induction`, `inference` or `region` (the
  grammar comment there lists each kind's extra fields and variants). The page renders the TeX and the
  instruction line from those strings, and `scripts/verify_math.py` parses the
  same grammar to re-derive the answer, so what is shown is what was checked.
  Every problem carries `steps`, its worked solution as 1-6 lines of the same
  grammar (a chain "a = b = c", or "x = 2, x = -2"), shown under the answer;
  SymPy checks each line (`check_steps`). `npm run math:steps -- <unit>` has an
  LLM write and verify steps for problems that lack them.
A unit without a kind cannot hold problems yet. Only sets with a `rule` (a key in
`scripts/validate-math-<kind>.mjs`; expression uses `validate-math-arith.mjs`)
can hold problems; a new set of an existing kind needs its rule and prompt
(`scripts/math-prompts/<rule>.md`), a new unit also `src/data/math-<unit>.json`.

Problems live in D1's `math_problems` (unit, item, set_id, position, published,
answer_index, JSON `payload`, grade, tier, reviewed_at); attempts in
`math_attempts` (unit, item, set_id, answers). Scope and difficulty are kept
apart, so tests can be assembled as "these grades or items, so many of each tier":
- grade: the item's school year in Japan's curriculum
  (`src/lib/math-curriculum-jp.ts`: e1-e6, m1-m3, h-i/h-a/h-ii/h-b/h-iii/h-c,
  u1-u2), copied onto each problem on import. The catalog itself stays
  curriculum-neutral; an item that spans years is split. Shown on the item page.
  `docs/plans/math-curriculum-jp.md` lists every item by grade as a checklist
  against the Course of Study, with what each still needs before problems can be
  made (A-D). It is generated by `scripts/math-curriculum-doc.mjs`; `npm test`
  fails when it is stale.
- tier: difficulty within the item and grade, 1 basic, 2 standard, 3 advanced; shown on each quiz problem and, as counts per set, on the item page
  (`scripts/math-prompts/_tiers.md`), stored per problem in the bank. New problems
  get it from `math:generate -- ... --tier N` and the review checks it;
  `scripts/math-tier.mjs <unit>` has Codex judge problems made before tiers.
  Correct rates from `math_attempts` can recalibrate tiers once there are enough.
Coming-soon units' pages are noindex and excluded from publicPaths/the sitemap;
`src/lib/seo.ts` lists the public item pages of published units.

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
| 学習項目 | 単元内で一意の英小文字 | `order-of-operations` |
| 問題セット | 学習項目内の練習の番号 | `1`, `2` |
| 問題 | 単元+3桁の通し番号 | `arith-001` |

表示順はカタログ(`src/lib/math-catalog.ts`)の並びで決め、IDは変えない。問題IDはセットに依存しない。

問題の生成・検算・盲検レビューから公開までの操作は [問題を追加する手順](docs/plans/math-units.md#9-問題を追加する手順) を参照。
