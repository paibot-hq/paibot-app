import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Writes the incident list as the page reads it from D1 (docs/breaches.md) to a file, in the shape of src/data/breaches.json: the daily update
// (.github/workflows/breaches-update.yml) starts from it, and a person can refresh the copy in git with it (`npm run breaches:export:prod`).
// Exits with 2, writing nothing, when the database has no list (no tables yet, or never filled), so a caller can try another.
const targets = { local: ['--local'], dev: ['--remote'], prod: ['--remote', '--env', 'production'] };
const [target, file = 'src/data/breaches.json'] = process.argv.slice(2);
if (!Object.hasOwn(targets, target)) throw new Error('Usage: node scripts/export-breaches.mjs local|dev|prod [file]');
function query(sql) {
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', ...targets[target], '--command', sql, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`wrangler failed: ${result.stdout}`);
  return JSON.parse(result.stdout)[0].results;
}
const [{ tables }] = query("SELECT count(*) AS tables FROM sqlite_master WHERE type = 'table' AND name IN ('breach_incidents', 'breach_list')");
const [list] = tables === 2 ? query("SELECT as_of, note FROM breach_list WHERE id = 'current'") : [];
const rows = list ? query('SELECT entry FROM breach_incidents ORDER BY position') : [];
if (!rows.length) {
  console.error(`${target} has no incident list.`);
  process.exit(2);
}
writeFileSync(file, JSON.stringify({ asOf: list.as_of, note: list.note, items: rows.map(row => JSON.parse(row.entry)) }, null, 1) + '\n');
console.error(`${target}: ${rows.length} entries as of ${list.as_of} -> ${file}`);
