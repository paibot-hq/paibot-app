// Needs: nothing running (rebuilds the app for each environment).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Leave the normal dev build last, so subsequent local checks use test keys.
// database: each environment must bind its own D1 database - production
// pointing at the dev one (or vice versa) would mix real users' data with tests.
// routes: the site's domain first; production also routes the old paibot.app, which only redirects (src/lib/legacy-host.ts).
for (const [environment, name, host, indexable, database, routes] of [
  ['production', 'paibot-app', 'app.paibot.dev', 'true', 'paibot-app-apac', ['app.paibot.dev', 'paibot.app']],
  ['', 'paibot-app-dev', 'app-dev.paibot.dev', 'false', 'paibot-app-dev-apac', ['app-dev.paibot.dev']],
]) {
  const env = { ...process.env };
  if (environment) env.CLOUDFLARE_ENV = environment;
  else delete env.CLOUDFLARE_ENV;
  const result = spawnSync('npm', ['run', 'build'], { env, encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw result.error ?? new Error(`Build failed: ${environment || 'dev'}`);
  }
  const config = JSON.parse(readFileSync('build/server/wrangler.json', 'utf8'));
  assert.equal(config.name, name);
  assert.deepEqual(config.routes, routes.map(pattern => ({ pattern, custom_domain: true })));
  assert.equal(config.vars.SITE_URL, `https://${host}`);
  assert.equal(config.vars.SITE_INDEXABLE, indexable);
  assert.deepEqual(config.d1_databases.map(d => [d.binding, d.database_name]), [['DB', database]]);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal(config.version_metadata.binding, 'CF_VERSION_METADATA');
  console.log(`PASS: ${environment || 'dev'} build targets ${name} (${host}), indexable=${indexable}`);
}
