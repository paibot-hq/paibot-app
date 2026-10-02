// Needs: a running preview.
// Runs each published tool's browser flow: src/tools/<slug>/e2e.mjs, or
// tests/e2e/flows/<slug>.mjs for pages outside src/tools (math). Each flow gets
// a fresh browser context, so flows are independent and can run in any order
// or subset (CHECK_TOOLS). Checks every tool shares are in catalog.mjs.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { configureAccess } from '../../scripts/lib/access.mjs';
import { selectedTools } from './lib/selected-tools.mjs';

const base = process.env.CHECK_BROWSER_BASE_URL ?? 'http://app.localhost:3002';
const flowFile = slug => [new URL(`../../src/tools/${slug}/e2e.mjs`, import.meta.url), new URL(`./flows/${slug}.mjs`, import.meta.url)].find(existsSync);
const tools = selectedTools();
const browser = await chromium.launch();
const ran = [];
try {
  for (const { slug } of tools) {
    const file = flowFile(slug);
    if (!file) continue;
    const { default: flow } = await import(file);
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
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
const without = tools.filter(app => !ran.includes(app.slug)).map(app => app.slug);
console.log(`PASS: ${ran.length} tool flows, no uncaught JS errors${without.length ? ` (no flow here: ${without.join(', ')}; see their own e2e checks)` : ''}`);
