import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Runs browser/server checks by name: `npm run e2e -- smoke tools`.
// Each file in this directory states in its header comment what it needs (a
// running preview via CHECK_BROWSER_BASE_URL, a build, Clerk test keys, local
// D1). .env is loaded when present, for the Clerk keys.
const dir = new URL('./', import.meta.url);
const available = readdirSync(dir).filter(name => name.endsWith('.mjs') && name !== 'run.mjs').map(name => name.slice(0, -4)).sort();
const names = process.argv.slice(2);
const unknown = names.filter(name => !available.includes(name));
if (!names.length || unknown.length) {
  console.error(`${unknown.length ? `Unknown: ${unknown.join(', ')}\n` : ''}Usage: npm run e2e -- <name...>\nAvailable: ${available.join(', ')}`);
  process.exit(1);
}
const envFile = existsSync('.env') ? ['--env-file=.env'] : [];
// How long each check took is printed, so that in a CI log it is clear which one makes the run long.
const took = [];
for (const name of names) {
  console.log(`\n▶ e2e ${name}`);
  const startedAt = performance.now();
  const result = spawnSync(process.execPath, [...envFile, new URL(`${name}.mjs`, dir).pathname], { stdio: 'inherit' });
  took.push(`${name} ${((performance.now() - startedAt) / 1000).toFixed(1)}s`);
  if (result.status !== 0) {
    console.error(`\n✗ e2e ${name} failed (${took.join(', ')})`);
    process.exit(result.status ?? 1);
  }
}
if (names.length > 1) console.log(`\ne2e took: ${took.join(', ')}`);
