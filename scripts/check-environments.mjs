// check:all skips this file: needs a build and starts its own Workers.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

async function run(command, args, env) {
  const child = spawn(command, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}
// Simulate both indexing policies using the built Worker, never a live deployment.
// --persist-to shares the local D1 that db:migrate:local migrates; without it the
// built config keeps its own empty database under build/server/.wrangler.
for (const [indexable, origin, port] of [[false, 'https://dev.paibot.app', 4311], [true, 'https://paibot.app', 4312]]) {
  const server = spawn('node', ['node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'build/server/wrangler.json', '--persist-to', '.wrangler/state', '--port', String(port), '--inspector-port', '0', '--var', `SITE_URL:${origin}`, '--var', `SITE_INDEXABLE:${indexable}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  server.stdout.on('data', data => { output = (output + data).slice(-4000); });
  server.stderr.on('data', data => { output = (output + data).slice(-4000); });
  try {
    let ready = false;
    for (let n = 0; n < 60; n++) {
      if (server.exitCode !== null) throw new Error(`Preview exited: ${output}`);
      try { ready = (await fetch(`http://localhost:${port}/robots.txt`)).ok; } catch {}
      if (ready) break;
      await delay(500);
    }
    assert.ok(ready, 'Local Worker did not start');
    await run('node', ['scripts/check-smoke.mjs'], { CHECK_BROWSER_BASE_URL: `http://localhost:${port}`, CHECK_SITE_URL: origin, CHECK_SITE_INDEXABLE: String(indexable), CHECK_SSR_ONLY: 'true' });
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
  }
}
console.log('PASS: dev and production indexing policies in the built Worker');
