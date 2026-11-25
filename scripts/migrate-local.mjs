import { spawnSync } from 'node:child_process';

// `node scripts/migrate-local.mjs <dev|production>`: applies db/migrations to a target's local database with Wrangler,
// as the deployed databases get them (d1_migrations), then copies that history into Void's own (_void_migrations), which
// the Void dev server reads and would otherwise take for a database it did not create and refuse to migrate.
const [target, ...rest] = process.argv.slice(2);
if (!['dev', 'production'].includes(target) || rest.length) {
  console.error('Usage: node scripts/migrate-local.mjs <dev|production>');
  process.exit(1);
}
function wrangler(...args) {
  const result = spawnSync(process.execPath, ['scripts/wrangler.mjs', target, ...args], { stdio: 'inherit', env: { ...process.env, CI: process.env.CI ?? '1' } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
wrangler('d1', 'migrations', 'apply', 'DB', '--local');
wrangler('d1', 'execute', 'DB', '--local', '--command',
  "CREATE TABLE IF NOT EXISTS _void_migrations (name TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now'))); " +
  'INSERT OR IGNORE INTO _void_migrations (name, applied_at) SELECT name, applied_at FROM d1_migrations;');
