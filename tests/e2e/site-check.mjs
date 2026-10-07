// Needs: a build (starts its own preview).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

// Real requests from the Worker to a fake site on 127.0.0.1. Loopback is
// refused in production, so SITE_CHECK_ALLOW_PRIVATE is switched on in the
// generated build/server/wrangler.json for this run only and restored after
// (same approach and reasons as tests/e2e/whois.mjs).

function startFakeSite() {
  const server = createServer((req, res) => {
    const redirect = (status, location) => { res.writeHead(status, { location }); res.end(); };
    if (req.url === '/') return redirect(301, '/step');
    if (req.url === '/step') return redirect(302, '/ok');
    if (req.url === '/ok') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', server: 'FakeServer/1.0' });
      return res.end('<!doctype html><title>ok</title>');
    }
    if (req.url === '/down') { res.writeHead(503); return res.end(); }
    if (req.url.startsWith('/loop')) return redirect(302, `/loop${Number(req.url.slice(5) || 0) + 1}`);
    res.writeHead(404); res.end();
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const wranglerJsonPath = 'build/server/wrangler.json';
const originalWranglerJson = readFileSync(wranglerJsonPath, 'utf8');
const { server: fakeSite, port: sitePort } = await startFakeSite();
const config = JSON.parse(originalWranglerJson);
config.vars.SITE_CHECK_ALLOW_PRIVATE = 'true';
// Workers AI (the FAQ's search by meaning) only runs against the real service, which needs a login; these checks do not use it.
delete config.ai;
writeFileSync(wranglerJsonPath, JSON.stringify(config));

const port = 3007;
const worker = spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
worker.stdout.on('data', data => { output = (output + data).slice(-4000); });
worker.stderr.on('data', data => { output = (output + data).slice(-4000); });

const browser = await chromium.launch();
try {
  let ready = false;
  for (let n = 0; n < 60; n++) {
    if (worker.exitCode !== null) throw new Error(`Preview exited: ${output}`);
    try { ready = (await fetch(`http://localhost:${port}/robots.txt`)).ok; } catch {}
    if (ready) break;
    await delay(500);
  }
  assert.ok(ready, 'Local preview did not start');

  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const site = `http://127.0.0.1:${sitePort}`;
  const check = async (url, verdict) => {
    await page.goto(`http://localhost:${port}/en/site-check`);
    await page.locator('main h1').waitFor();
    await page.getByLabel('https://example.com').fill(url);
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await page.getByText(verdict, { exact: true }).waitFor();
  };

  // The local rate limiter counts per wall-clock minute (miniflare aligns its
  // windows to the clock), so start early in a minute: every check below,
  // including the limit test at the end, then lands in the same window.
  if (Date.now() % 60_000 > 20_000) await delay(60_000 - Date.now() % 60_000 + 200);
  const minute = Math.floor(Date.now() / 60_000);

  await check(`${site}/`, 'The site is responding normally (200)');
  await page.getByText(`${site}/ok`, { exact: true }).first().waitFor();
  await page.getByText('Redirects (2)', { exact: true }).waitFor();
  assert.deepEqual(await page.locator('main ol li span:first-child').allTextContents(), ['301', '302', '200']);
  await page.getByText('text/html; charset=utf-8', { exact: true }).waitFor();
  await page.getByText('FakeServer/1.0', { exact: true }).waitFor();
  console.log('PASS: follows each redirect hop and shows the final status, URL and headers');

  await check(`${site}/down`, 'The site returned a server error (503)');
  console.log('PASS: a 503 is reported as a server error');

  await check(`${site}/loop`, 'Stopped after more than 5 redirects');
  assert.equal(await page.locator('main ol li').count(), 6);
  console.log('PASS: a redirect loop stops after 5 redirects');

  // Per-IP limit: 10 checks a minute. Three were made above; the limit must
  // stop further checks within the next ten, without contacting the site.
  const limited = "Too many in a short time. Please wait a minute and try again (up to 10 a minute).";
  let allowed = 3;
  for (; allowed <= 11; allowed++) {
    await page.goto(`http://localhost:${port}/en/site-check`);
    await page.locator('main h1').waitFor();
    await page.getByLabel('https://example.com').fill(`${site}/ok`);
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    const outcome = await Promise.race([
      page.getByText(limited, { exact: true }).waitFor().then(() => 'limited'),
      page.getByText('The site is responding normally (200)', { exact: true }).waitFor().then(() => 'ok'),
    ]);
    if (outcome === 'limited') break;
  }
  assert.equal(Math.floor(Date.now() / 60_000), minute, 'the checks ran into the next minute, so the limit count was reset');
  assert.equal(allowed, 10, `the 11th check in a minute is refused (refused after ${allowed})`);
  console.log('PASS: the 11th check within a minute from one IP is refused');
  // Only requests that would reach the network count: once limited, a typo
  // still gets its own message (and never used up the quota). Blocked hosts
  // are checked the same way, but this run allows 127.0.0.1 for the fake site.
  await check('not a url', "That doesn't look like a valid URL. Enter a URL starting with http:// or https://, or a domain name.");
  console.log('PASS: an invalid URL is rejected before the rate limit');

  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  worker.kill('SIGTERM');
  await new Promise(resolve => { if (worker.exitCode !== null) resolve(); else worker.once('exit', resolve); });
  fakeSite.close();
  writeFileSync(wranglerJsonPath, originalWranglerJson);
}
