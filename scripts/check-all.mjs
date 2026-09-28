import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Runs every scripts/check-*.mjs that needs no build, server or browser, so a
// new check of that kind runs in CI just by adding the file. Checks that do
// need one start with `// check:all skips this file: <reason>` and are wired
// into .github/workflows/app.yml individually.
const SKIP = /^\/\/ check:all skips this file:/m;
const dir = new URL('./', import.meta.url);
const checks = readdirSync(dir)
  .filter(name => /^check-.+\.mjs$/.test(name) && name !== 'check-all.mjs')
  .filter(name => !SKIP.test(readFileSync(new URL(name, dir), 'utf8')))
  .sort();

const failed = [];
for (const name of checks) {
  console.log(`\n▶ ${name}`);
  const result = spawnSync(process.execPath, [new URL(name, dir).pathname], { stdio: 'inherit' });
  if (result.status !== 0) failed.push(name);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed${failed.length ? `; failed: ${failed.join(', ')}` : ''}`);
process.exitCode = failed.length ? 1 : 0;
