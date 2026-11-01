// Which of the slow CI jobs a change needs (a pull request against its base, a push to main against the last commit that passed), from what affected-tools.mjs says it can reach ("all", "" for
// nothing, or comma-separated slugs) and the changed files. A job is skipped only when nothing it checks can have
// changed; anything not recognised there is "all", so an unknown file runs everything.
//   e2e:     the server checks (routing, environments, Access) and the two tools whose flows start their own server
//            (domain, site-check), tests/e2e/{access,environments,whois,site-check}.mjs
//   browser: the preview checks (smoke, catalog, tools, quiz-browser) and the local D1 imports they use
//   sympy:   SymPy re-deriving every math answer (scripts/verify_math.py), which reads only the banks, itself and its Python setup
export const SERVER_TOOLS = ['domain', 'site-check'];
// Libraries the checks import that affected-tools.mjs treats as tooling.
const SHARED = /^scripts\/(lib\/access\.mjs|import-math\.mjs|import-quiz\.mjs|import-breaches\.mjs|validate-.*)$/;
const SYMPY = /^(src\/data\/math-[^/]*\.json|scripts\/verify_math\.py|tests\/unit\/test_verify_math\.py|pyproject\.toml|uv\.lock|\.python-version|\.github\/workflows\/app\.yml)$/;

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
