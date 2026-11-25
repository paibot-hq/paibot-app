// Needs: nothing running (rebuilds the app for each deployment target in void.config.ts).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Leave the normal dev build last, so subsequent local checks use test keys.
// database: each deployment must bind its own D1 database - production
// pointing at the dev one (or vice versa) would mix real users' data with tests.
// The workers.dev preview is the one exception: it tries Void's deploy on dev's database.
// routes: each environment is served on its one host (the Worker's custom domain); the preview on workers.dev only.
// rateLimits: every deployment counts in namespaces of its own.
for (const [target, name, host, indexable, database, routes, rateLimits] of [
  ['production', 'paibot-app', 'paibot.app', 'true', 'paibot-app-apac', ['paibot.app'], ['1002', '1004', '1006']],
  ['preview', 'paibot-app-void', 'paibot-app-void.proud-leaf-50e3.workers.dev', 'false', 'paibot-app-dev-apac', [], ['1007', '1009', '1011']],
  ['dev', 'paibot-app-dev', 'dev.paibot.app', 'false', 'paibot-app-dev-apac', ['dev.paibot.app'], ['1001', '1003', '1005']],
]) {
  const env = { ...process.env, PAIBOT_APP_TARGET: target };
  delete env.PAIBOT_APP_WORKERS_AI;
  const result = spawnSync('npm', ['run', 'build'], { env, encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw result.error ?? new Error(`Build failed: ${target}`);
  }
  const config = JSON.parse(readFileSync('build/server/wrangler.json', 'utf8'));
  assert.equal(config.name, name);
  assert.deepEqual(config.routes, routes.map(pattern => ({ pattern, custom_domain: true })));
  assert.equal(config.vars.SITE_URL, `https://${host}`);
  assert.equal(config.vars.SITE_INDEXABLE, indexable);
  assert.deepEqual(config.d1_databases.map(d => [d.binding, d.database_name]), [['DB', database]]);
  assert.equal(config.workers_dev, routes.length === 0);
  assert.equal(config.preview_urls, false);
  assert.equal(config.version_metadata.binding, 'CF_VERSION_METADATA');
  assert.deepEqual(config.ratelimits.map(limit => limit.namespace_id), rateLimits);
  // Workers AI only in a deploy's build (PAIBOT_APP_WORKERS_AI=1, void.config.ts), never in one for local checks.
  assert.equal(config.ai, undefined);
  console.log(`PASS: ${target} build targets ${name} (${host}), indexable=${indexable}`);
}
