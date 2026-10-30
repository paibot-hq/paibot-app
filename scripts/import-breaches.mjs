import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateBreaches } from '../src/tools/breaches/breaches-rules.mjs';

// Copies the incident list (src/data/breaches.json, reviewed in git) into D1, where the page reads it (docs/breaches.md). Explicit target only;
// importing never creates the tables (the migrations do). Every entry is written over its row, then the rows of entries no longer in the file
// are removed: the page never sees an empty list, at most a moment with both the old and the new rows.
//   --if-ready  does nothing when the tables are not there yet (production before the release that adds them).
//   --if-empty  does nothing when the list is already there: a release fills it the first time, and a rollback to an older commit does not take
//               the list back to that commit's.
// local-production is the local copy of production's database, which App (production) checks the production build against.
const targets = { local: ['--local'], 'local-production': ['--local', '--env', 'production'], dev: ['--remote'], prod: ['--remote', '--env', 'production'] };
const [target, ...flags] = process.argv.slice(2);
if (!Object.hasOwn(targets, target) || flags.some(flag => !['--if-ready', '--if-empty'].includes(flag))) throw new Error('Usage: node scripts/import-breaches.mjs local|local-production|dev|prod [--if-ready] [--if-empty]');
const wrangler = (...args) => spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', ...targets[target], ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
function query(sql) {
  const result = wrangler('--command', sql, '--json');
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`wrangler failed: ${result.stdout}`);
  return JSON.parse(result.stdout)[0].results;
}
if (flags.length) {
  const [{ tables }] = query("SELECT count(*) AS tables FROM sqlite_master WHERE type = 'table' AND name IN ('breach_incidents', 'breach_list')");
  if (tables !== 2) {
    if (!flags.includes('--if-ready')) throw new Error('The breach tables are not in this database: apply the migrations first');
    console.log(`::notice::The incident list was not imported into ${target}: its tables are not there yet (they come with the next release).`);
    process.exit(0);
  }
  if (flags.includes('--if-empty') && query('SELECT count(*) AS lists FROM breach_list')[0].lists > 0) {
    console.log(`The incident list is already in ${target}; left as it is (the daily update keeps it current).`);
    process.exit(0);
  }
}
const data = JSON.parse(readFileSync(new URL('../src/data/breaches.json', import.meta.url), 'utf8'));
// The same rules a pull request must pass: a list that breaks one is never written.
const problems = validateBreaches(data);
if (problems.length) throw new Error(`src/data/breaches.json breaks the rules:\n${problems.join('\n')}`);
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const statements = [
  ...data.items.map((item, position) => `INSERT INTO breach_incidents (id, position, entry) VALUES (${quote(item.id)}, ${position}, ${quote(JSON.stringify(item))}) ON CONFLICT(id) DO UPDATE SET position=excluded.position, entry=excluded.entry;`),
  `DELETE FROM breach_incidents WHERE id NOT IN (${data.items.map(item => quote(item.id)).join(',')});`,
  `INSERT INTO breach_list (id, as_of, note) VALUES ('current', ${quote(data.asOf)}, ${quote(data.note)}) ON CONFLICT(id) DO UPDATE SET as_of=excluded.as_of, note=excluded.note;`,
];
mkdirSync('.wrangler', { recursive: true });
const file = '.wrangler/breaches-import.sql';
writeFileSync(file, statements.join('\n') + '\n');
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', ...targets[target], '--file', file, '--yes'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
