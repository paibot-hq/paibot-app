import { execFileSync } from 'node:child_process';
import { browserScope, jobsNeeded } from './lib/ci-jobs.mjs';

// Prints, for $GITHUB_OUTPUT, whether the CI job named in argv (e2e, browser or sympy) is needed (`run=true|false`) and, for browser, the tools
// its checks cover, each "all" or comma-separated slugs for CHECK_TOOLS: `catalog` for the checks every tool shares, `tools` for the tools' own
// flows (browserScope in lib/ci-jobs.mjs). A pull request is compared with its base branch (BASE_REF); a push
// to main with BASE_SHA, the last commit on main whose run passed (everything up to it was checked, so only what changed since needs checking).
// With CHECK_SHARD=i/n, a browser job whose share of the tools is empty is not needed (the first one runs the checks that are not per tool,
// so it is whenever browser is). Anything that goes wrong, or a push with no commit to compare with, runs the job on every tool.
const job = process.argv[2];
try {
  if (!['e2e', 'browser', 'sympy'].includes(job)) throw new Error(`Unknown job: ${job}`);
  const base = process.env.GITHUB_EVENT_NAME === 'pull_request'
    ? process.env.BASE_REF && `origin/${process.env.BASE_REF}`
    : process.env.BASE_SHA;
  if (!base) throw new Error('nothing to compare with');
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const files = git('diff', '--name-only', '--no-renames', git('merge-base', base, 'HEAD').trim(), 'HEAD').split('\n').filter(Boolean);
  const affected = execFileSync(process.execPath, ['scripts/affected-tools.mjs', base], { encoding: 'utf8' }).trim();
  const needed = jobsNeeded({ affected, files });
  let run = needed[job];
  const { catalog, flows: tools } = browserScope({ affected, files });
  const shard = process.env.CHECK_SHARD;
  if (job === 'browser' && run && shard && !shard.startsWith('1/')) {
    // The flows' tools are among the catalog's, so a share with no catalog tools has nothing to do.
    const { selectedTools } = await import('../tests/e2e/lib/selected-tools.mjs');
    run = selectedTools({ tools: catalog, shard }).length > 0;
  }
  console.error(`${job}${shard ? ` ${shard}` : ''}: ${run ? 'needed' : 'skipped'} (since ${base}: affected ${affected || 'none'}; ${files.length} files)`);
  console.log(`run=${run}`);
  console.log(`catalog=${catalog}`);
  console.log(`tools=${tools}`);
} catch (error) {
  console.error(`${job}: running on every tool (${error.message})`);
  console.log('run=true');
  console.log('catalog=all');
  console.log('tools=all');
}
