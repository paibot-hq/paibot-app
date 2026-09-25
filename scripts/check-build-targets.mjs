import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Leave the normal dev build last, so subsequent local checks use test keys.
for (const [environment, name, host, indexable] of [
  ['production', 'paibot-app', 'paibot.app', 'true'],
  ['', 'paibot-app-dev', 'dev.paibot.app', 'false'],
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
  assert.deepEqual(config.routes, [{ pattern: host, custom_domain: true }]);
  assert.equal(config.vars.SITE_URL, `https://${host}`);
  assert.equal(config.vars.SITE_INDEXABLE, indexable);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal(config.version_metadata.binding, 'CF_VERSION_METADATA');
  console.log(`PASS: ${environment || 'dev'} build targets ${name} (${host}), indexable=${indexable}`);
}
