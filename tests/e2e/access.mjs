// Needs: a Playwright browser (no server).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { appFetch, configureAccess } from '../../scripts/lib/access.mjs';

process.env.CF_ACCESS_CLIENT_ID = 'test-client-id';
process.env.CF_ACCESS_CLIENT_SECRET = 'test-client-secret';
const ownRequests = [], externalRequests = [];
async function listen(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
const external = await listen((req, res) => {
  externalRequests.push(req.headers);
  res.end('external destination');
});
const own = await listen((req, res) => {
  ownRequests.push(req.headers);
  res.writeHead(302, { Location: req.url === '/start' ? '/redirect' : external.origin });
  res.end();
});
// Drops the first connection without an answer, then answers.
let drops = 0;
const flaky = await listen((req, res) => {
  if (drops++ === 0) { req.socket.destroy(); return; }
  res.end('second try');
});
let browser;
try {
  assert.equal(await (await appFetch(flaky.origin, '/')).text(), 'second try', 'a dropped connection is tried again');
  drops = 0;
  await assert.rejects(appFetch(flaky.origin, '/', { method: 'POST' }), /fetch failed/, 'a POST is not repeated');
  await assert.rejects(appFetch(own.origin, '/start'), /outside its origin/);
  assert.equal(externalRequests.length, 0, 'Node fetch must stop before external hop');
  browser = await chromium.launch();
  const page = await browser.newPage();
  await configureAccess(page, own.origin);
  await page.goto(`${own.origin}/start`);
  assert.equal(await page.locator('body').textContent(), 'external destination');
  assert.ok(ownRequests.length >= 4);
  for (const headers of ownRequests) {
    assert.equal(headers['cf-access-client-id'], 'test-client-id');
    assert.equal(headers['cf-access-client-secret'], 'test-client-secret');
  }
  assert.ok(externalRequests.length > 0);
  for (const headers of externalRequests) {
    assert.equal(headers['cf-access-client-id'], undefined);
    assert.equal(headers['cf-access-client-secret'], undefined);
  }
  console.log('PASS: Access headers stay on the app origin across redirects');
} finally {
  await browser?.close();
  for (const { server } of [own, external, flaky]) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
