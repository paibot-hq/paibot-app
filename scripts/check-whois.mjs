import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

// `wrangler dev`'s local routing simulates the Worker's configured custom
// domain (wrangler.jsonc's `routes`), which makes Clerk's server-side dev
// handshake redirect back to the real "dev.paibot.app" instead of this local
// origin - fine for check-environments.mjs (SSR-only, no browser), but a
// real browser navigation there gets stuck on the real, Access-protected
// dev.paibot.app. `vite preview` (what check-tools.mjs/check-smoke.mjs
// already use) doesn't have this problem, so this script uses that instead
// - but vite preview reads `vars` from the generated build/server/wrangler.json
// once at startup with no per-invocation override, so WHOIS_ROOT_SERVER is
// injected by patching that (gitignored) file's `vars` before launching,
// then restoring it afterward. Confirmed empirically that `cloudflare:sockets`
// connect() to a 127.0.0.1 loopback server works fine under this runtime.

const FAKE_TLD_RESPONSE = [
  'Domain Name: EXAMPLE.TEST',
  'Registrar: Example Registrar, Inc.',
  'Registrant Organization: Example Registrant Org',
  'Creation Date: 2020-01-01T00:00:00Z',
  'Registry Expiry Date: 2030-01-01T00:00:00Z',
  'Name Server: NS1.EXAMPLE.TEST',
  'Name Server: NS2.EXAMPLE.TEST',
  'Domain Status: clientTransferProhibited',
  '',
].join('\r\n');

async function startFakeWhoisServer() {
  const server = createServer(socket => {
    socket.on('data', data => socket.end(String(data).startsWith('free.') ? 'No match for domain "FREE.TEST".\r\n' : FAKE_TLD_RESPONSE));
    socket.on('error', () => {});
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, port: server.address().port };
}

// Serves both the RDAP bootstrap (only the made-up `rdaptest` TLD, so `.test`
// still goes to the fake WHOIS server) and the RDAP answers: one registered
// domain, 404 for everything else.
const FAKE_RDAP_DOMAIN = {
  objectClassName: 'domain',
  ldhName: 'taken.rdaptest',
  status: ['active'],
  events: [{ eventAction: 'registration', eventDate: '2021-02-03T00:00:00Z' }, { eventAction: 'expiration', eventDate: '2031-02-03T00:00:00Z' }],
  nameservers: [{ ldhName: 'NS1.RDAP.TEST' }],
  entities: [{ roles: ['registrar'], vcardArray: ['vcard', [['version', {}, 'text', '4.0'], ['fn', {}, 'text', 'RDAP Registrar, Inc.']]] }],
};

async function startFakeRdapServer() {
  const server = createHttpServer((req, res) => {
    const { port } = server.address();
    if (req.url === '/dns.json') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ services: [[['rdaptest'], [`http://127.0.0.1:${port}/rdap/`]]] }));
    }
    if (req.url === '/rdap/domain/taken.rdaptest') {
      res.writeHead(200, { 'content-type': 'application/rdap+json' });
      return res.end(JSON.stringify(FAKE_RDAP_DOMAIN));
    }
    res.writeHead(404, { 'content-type': 'application/rdap+json' });
    res.end(JSON.stringify({ errorCode: 404, title: 'Not Found' }));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, port: server.address().port };
}

const wranglerJsonPath = 'build/server/wrangler.json';
const originalWranglerJson = readFileSync(wranglerJsonPath, 'utf8');
const { server: fakeWhois, port: fakePort } = await startFakeWhoisServer();
const { server: fakeRdap, port: rdapPort } = await startFakeRdapServer();
const config = JSON.parse(originalWranglerJson);
config.vars.WHOIS_ROOT_SERVER = `127.0.0.1:${fakePort}`;
config.vars.RDAP_BOOTSTRAP_URL = `http://127.0.0.1:${rdapPort}/dns.json`;
writeFileSync(wranglerJsonPath, JSON.stringify(config));

const port = 3006;
// Direct node invocation, not `npx vite` - npx's resolution/update-check
// overhead made this step take ~9 minutes in CI (vs. seconds locally) even
// though it eventually passed. check-environments.mjs avoids the same trap
// by invoking wrangler's bin script directly for the same reason.
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
  const main = page.locator('main');

  // Real referral-chain code path: the fake server responds directly with a
  // full record and no `refer:`/`ReferralServer:` line, so the lookup stops
  // after one hop - exactly what a real single-hop ccTLD WHOIS server would
  // trigger, without depending on a real, rate-limitable third party in CI.
  await page.goto(`http://localhost:${port}/en/domain`);
  await main.locator('h1').waitFor();
  await page.getByLabel('example.com').fill('example.test');
  await page.getByRole('button', { name: 'Look up', exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('main [aria-live]')].some(el => el.textContent?.includes('Example Registrar, Inc.')));
  await page.getByText('Example Registrant Org', { exact: true }).waitFor();
  await page.getByText('2030-01-01T00:00:00Z', { exact: true }).waitFor();
  await page.getByText('NS1.EXAMPLE.TEST, NS2.EXAMPLE.TEST', { exact: true }).waitFor();
  await page.getByText('example.test is already registered', { exact: true }).waitFor();
  await page.getByText('Show raw response').click();
  await page.getByText('Domain Status: clientTransferProhibited').waitFor();
  console.log('PASS: WHOIS lookup follows the fake server response and renders parsed + raw fields');

  const lookUp = async (domain, text) => {
    await page.goto(`http://localhost:${port}/en/domain`);
    await main.locator('h1').waitFor();
    await page.getByLabel('example.com').fill(domain);
    await page.getByRole('button', { name: 'Look up', exact: true }).click();
    await page.getByText(text, { exact: true }).waitFor();
  };
  await lookUp('free.test', 'free.test is not registered');
  console.log('PASS: a WHOIS "No match" answer is shown as not registered');
  await lookUp('taken.rdaptest', 'taken.rdaptest is already registered');
  await page.getByText('RDAP Registrar, Inc.', { exact: true }).waitFor();
  await page.getByText('2031-02-03T00:00:00Z', { exact: true }).waitFor();
  await page.getByText('ns1.rdap.test', { exact: true }).waitFor();
  await lookUp('free.rdaptest', 'free.rdaptest is not registered');
  console.log('PASS: RDAP is used when the TLD has a service: 200 is registered with parsed fields, 404 is not registered');

  // A domain string carrying a CRLF injection attempt must never reach the
  // socket write - normalizeDomain rejects it before any connection opens.
  await page.goto(`http://localhost:${port}/en/domain`);
  await main.locator('h1').waitFor();
  await page.getByLabel('example.com').fill('example.test\r\nDROP TABLE');
  await page.getByRole('button', { name: 'Look up', exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('main [aria-live]')].some(el => el.textContent === "That doesn't look like a valid domain name."));
  console.log('PASS: CRLF-injecting input is rejected as invalid before opening a socket');

  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  worker.kill('SIGTERM');
  await new Promise(resolve => { if (worker.exitCode !== null) resolve(); else worker.once('exit', resolve); });
  fakeWhois.close();
  fakeRdap.close();
  writeFileSync(wranglerJsonPath, originalWranglerJson);
}
