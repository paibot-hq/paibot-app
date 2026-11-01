// Needs: a running preview.
// Runs each published tool's browser flow: src/tools/<slug>/e2e.mjs, or
// tests/e2e/flows/<slug>.mjs for pages outside src/tools (math). Each flow gets
// a fresh browser context, so flows are independent and can run in any order
// or subset (CHECK_TOOLS). Checks every tool shares are in catalog.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { configureAccess } from '../../scripts/lib/access.mjs';
import { flowFile, runsAlone, selectedTools } from './lib/selected-tools.mjs';

const base = new URL(process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002').origin;
const tools = selectedTools();
const browser = await chromium.launch();
const ran = [];
// How long each flow took, so that the slow ones can be seen (and cut) when the run gets long.
const timings = [];
// The flows are independent (each has a browser context of its own), so a few of them run at the same time (3 by default: the runners of a private repository have two cores); CHECK_CONCURRENCY=1 runs them one by one,
// which is the way to look into a flow that fails only in a crowd. A failure stops the others from being started, and is thrown once the ones that
// are running have finished.
const concurrency = Math.max(1, Number(process.env.CHECK_CONCURRENCY ?? 3));
// The clipboard is the one thing the contexts of a browser share, so flows that read or write it take turns (two at once would read each other's text).
let clipboardTurn = Promise.resolve();
const usesClipboard = file => /clipboard/.test(readFileSync(file, 'utf8'));
// A flow that keeps the processor busy the whole time (runsAlone) runs on its own once the others are done, as it would otherwise starve the
// flows beside it on CI's two cores (a screenshot that never came, in a flow that was not at fault).
async function runFlow(app, file) {
  if (!usesClipboard(file)) return runFlowNow(app, file);
  const before = clipboardTurn;
  let done;
  clipboardTurn = new Promise(resolve => { done = resolve; });
  await before;
  try { return await runFlowNow(app, file); } finally { done(); }
}
async function runFlowNow({ slug }, file) {
  const { default: flow } = await import(file);
  const startedAt = performance.now();
  const context = await browser.newContext({ timezoneId: 'Asia/Tokyo', permissions: ['clipboard-read', 'clipboard-write'], serviceWorkers: 'block' });
  try {
    const page = await context.newPage();
    await configureAccess(page, base);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Deterministic protocol results; this tests UI behavior, not runner IPv6 connectivity.
    await page.route('https://ipv4.icanhazip.com/**', route => route.fulfill({ body: '192.0.2.10\n', headers: { 'Access-Control-Allow-Origin': '*' } }));
    await page.route('https://ipv6.icanhazip.com/**', route => route.fulfill({ body: '2001:db8::10\n', headers: { 'Access-Control-Allow-Origin': '*' } }));
    const main = page.locator('main');
    const go = async path => {
      const res = await page.goto(`${base}/en/${path}`);
      assert.equal(res.status(), 200, path);
      assert.equal(new URL(page.url()).pathname, `/en/${path}`);
      await page.waitForFunction(() => document.documentElement.dataset.theme);
      await main.locator('h1').waitFor();
    };
    const result = text => page.waitForFunction(expected => [...document.querySelectorAll('main [aria-live]')].some(el => el.textContent === expected), text);
    await flow({ page, main, base, go, result, errors });
    assert.deepEqual(errors, [], `${slug}: uncaught errors`);
    ran.push(slug);
    timings.push([slug, performance.now() - startedAt]);
  } catch (error) {
    error.message = `${slug}: ${error.message}`;
    throw error;
  } finally { await context.close(); }
}
try {
  const flows = tools.map(app => [app, flowFile(app.slug)]).filter(([, file]) => file);
  const queue = flows.filter(([, file]) => !runsAlone(file));
  let failure = null;
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length || 1) }, async () => {
    while (queue.length && !failure) {
      const [app, file] = queue.shift();
      try { await runFlow(app, file); } catch (error) { failure ??= error; }
    }
  }));
  for (const [app, file] of flows.filter(([, file]) => runsAlone(file))) {
    if (failure) break;
    try { await runFlow(app, file); } catch (error) { failure ??= error; }
  }
  if (failure) throw failure;
} finally { await browser.close(); }
const without = tools.filter(app => !ran.includes(app.slug)).map(app => app.slug);
const slowest = [...timings].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([slug, ms]) => `${slug} ${(ms / 1000).toFixed(1)}s`).join(', ');
console.log(`${timings.length} flows took ${(timings.reduce((sum, [, ms]) => sum + ms, 0) / 1000).toFixed(1)}s; slowest: ${slowest}`);
console.log(`PASS: ${ran.length} tool flows, no uncaught JS errors${without.length ? ` (no flow here: ${without.join(', ')}; see their own e2e checks)` : ''}`);
