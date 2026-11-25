import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createJiti } from 'jiti';

// Wrangler for the database commands (migrations, imports, exports), which Void does not cover for a migration
// directory of our own: `void db migrate` reads only db/migrations/. Void has no Wrangler file to point it at, so this
// writes one for a deployment target from void.config.ts (PAIBOT_APP_TARGET: dev, production or preview) and returns
// the arguments that select it. The local database of a target is the same as before (.wrangler/state, by its ID).
const root = resolve(import.meta.dirname, '../..');
const jiti = createJiti(import.meta.url);

export async function wranglerConfigArgs(target) {
  if (!['dev', 'production', 'preview'].includes(target)) throw new Error(`Unknown target ${target}: dev, production or preview`);
  const previous = process.env.PAIBOT_APP_TARGET;
  process.env.PAIBOT_APP_TARGET = target;
  let config;
  try {
    // A fresh load each time: the file reads PAIBOT_APP_TARGET when it is evaluated.
    config = (await jiti.import(resolve(root, 'void.config.ts'), { default: true, moduleCache: false }));
  } finally {
    if (previous === undefined) delete process.env.PAIBOT_APP_TARGET;
    else process.env.PAIBOT_APP_TARGET = previous;
  }
  const { cloudflare = {}, worker = {} } = config;
  const wrangler = {
    ...cloudflare,
    compatibility_date: worker.compatibility_date,
    compatibility_flags: worker.compatibility_flags,
    vars: worker.vars,
    // Wrangler resolves this against the config file's own directory, which is not the project root.
    d1_databases: (cloudflare.d1_databases ?? []).map(db => db.migrations_dir ? { ...db, migrations_dir: resolve(root, db.migrations_dir) } : db),
  };
  mkdirSync(resolve(root, '.wrangler'), { recursive: true });
  const file = resolve(root, '.wrangler', `void-${target}.json`);
  writeFileSync(file, JSON.stringify(wrangler, null, 2));
  return ['--config', file, '--persist-to', resolve(root, '.wrangler/state')];
}
