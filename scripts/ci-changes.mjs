import { execFileSync } from 'node:child_process';
import { jobsNeeded } from './lib/ci-jobs.mjs';

// Prints `run=true|false` for the CI job named in argv (e2e or browser), for $GITHUB_OUTPUT. Only a pull request
// can skip a job (main runs everything, as a deploy needs it); anything that goes wrong runs the job.
const job = process.argv[2];
const base = process.env.BASE_REF && `origin/${process.env.BASE_REF}`;
try {
  if (!['e2e', 'browser'].includes(job)) throw new Error(`Unknown job: ${job}`);
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request' || !base) throw new Error('not a pull request');
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const files = git('diff', '--name-only', '--no-renames', git('merge-base', base, 'HEAD').trim(), 'HEAD').split('\n').filter(Boolean);
  const affected = execFileSync(process.execPath, ['scripts/affected-tools.mjs', base], { encoding: 'utf8' }).trim();
  const run = jobsNeeded({ affected, files })[job];
  console.error(`${job}: ${run ? 'needed' : 'skipped'} (affected: ${affected || 'none'}; ${files.length} files)`);
  console.log(`run=${run}`);
} catch (error) {
  console.error(`${job}: running (${error.message})`);
  console.log('run=true');
}
