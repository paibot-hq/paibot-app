// Which of the slow CI jobs a change needs (a pull request against its base, a push to main against the last commit that passed), from what affected-tools.mjs says it can reach ("all", "" for
// nothing, or comma-separated slugs) and the changed files. A job is skipped only when nothing it checks can have
// changed; anything not recognised there is "all", so an unknown file runs everything.
//   e2e:     the server checks (routing, environments, Access) and the two tools whose flows start their own server
//            (domain, site-check), tests/e2e/{access,environments,whois,site-check}.mjs
//   browser: the preview checks (smoke, catalog, tools, quiz-browser) and the local D1 imports they use
//   sympy:   SymPy re-deriving every math answer (scripts/verify_math.py) and the lessons' math (verify_lessons.py), and the AI and data
//            science answers recomputed (verify_ds.py), which read only the banks, the lessons, the ai-ds catalog, themselves and their Python setup
export const SERVER_TOOLS = ['domain', 'site-check'];
// Libraries the checks import that affected-tools.mjs treats as tooling.
const SHARED = /^scripts\/(lib\/access\.mjs|import-math\.mjs|import-quiz\.mjs|import-breaches\.mjs|validate-.*)$/;
const SYMPY = /^(src\/data\/(math-[^/]*|item-lessons)\.json|src\/tools\/ai-ds\/(data\/[^/]*\.json|lessons\.json|catalog\.ts)|scripts\/verify_(math|lessons|ds)\.py|tests\/unit\/test_verify_(math|lessons|ds)\.py|pyproject\.toml|uv\.lock|\.python-version|\.github\/workflows\/app\.yml)$/;

export function jobsNeeded({ affected, files }) {
  const slugs = affected === 'all' ? [] : affected.split(',').filter(Boolean);
  const shared = files.some(file => SHARED.test(file));
  const all = affected === 'all' || shared;
  return {
    e2e: all || slugs.some(slug => SERVER_TOOLS.includes(slug)),
    browser: all || slugs.length > 0,
    sympy: files.some(file => SYMPY.test(file)),
  };
}

// What the browser job covers (CHECK_TOOLS for each check): `catalog`, the checks every tool shares (it loads in three locales, has no
// uncaught errors and fits 390px), and `flows`, each tool's own flow (tools.mjs), which take most of the job's time. A change to shared code
// ("all") reaches every page, so every tool gets the shared checks, but the flows run only for the tools it names: a shared component
// that breaks a tool's page shows in the shared checks. Every flow still runs when the checks themselves or the dependencies change,
// and when a library the checks import does (`affected` is then empty although the browser job is needed).
const CHECKS = /^(tests\/e2e\/(?!flows\/)|\.github\/|scripts\/(ci-changes|affected-tools)\.mjs$|scripts\/lib\/(affected-tools|ci-jobs)\.mjs$|package(-lock)?\.json$)/;

export function browserScope({ affected, files }) {
  if (affected === 'all') return { catalog: 'all', flows: files.some(file => CHECKS.test(file)) ? 'all' : '' };
  if (!affected && jobsNeeded({ affected, files }).browser) return { catalog: 'all', flows: 'all' };
  return { catalog: affected, flows: affected };
}
