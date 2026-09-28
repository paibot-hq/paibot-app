import { execFileSync } from 'node:child_process';
import { APP_CATALOG } from '../src/lib/app-catalog.ts';
import { affectedTools } from './lib/affected-tools.mjs';

// Prints the tools a branch can affect compared with <base> (default
// origin/main): "all", or comma-separated slugs (empty for none). CI passes
// it to the browser checks as CHECK_TOOLS.
const base = process.argv[2] ?? 'origin/main';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const mergeBase = git('merge-base', base, 'HEAD').trim();
const files = git('diff', '--name-only', '--no-renames', mergeBase, 'HEAD').split('\n').filter(Boolean);
const show = (rev, file) => { try { return JSON.parse(git('show', `${rev}:${file}`)); } catch { return null; } };
const result = affectedTools({
  files,
  addedLines(file) {
    const lines = git('diff', '-U0', mergeBase, 'HEAD', '--', file).split('\n').filter(line => /^[+-](?![+-]{2} )/.test(line));
    return lines.some(line => line.startsWith('-')) ? null : lines.map(line => line.slice(1));
  },
  json: file => ({ before: show(mergeBase, file), after: show('HEAD', file) }),
}, APP_CATALOG);
console.log(result === 'all' ? 'all' : [...result].sort().join(','));
