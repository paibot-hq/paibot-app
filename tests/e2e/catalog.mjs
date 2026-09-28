// Needs a running preview (CHECK_BROWSER_BASE_URL). The same checks for every
// published tool, derived from src/lib/app-catalog.ts, so a new tool is covered
// without writing anything: it loads in every locale, hydrates, shows its
// title, renders no untranslated message key, throws no uncaught error and fits
// a phone screen. Tool-specific flows are in tools.mjs.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { configureAccess } from '../../scripts/lib/access.mjs';
import { selectedTools } from './lib/selected-tools.mjs';

const base = process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002';
const locales = ['ja', 'en', 'zh'];
const tools = selectedTools();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await configureAccess(page, base);
  // Keep the IP tool off the real network, as in tools.mjs.
  await page.route('https://ipv4.icanhazip.com/**', route => route.fulfill({ body: '192.0.2.10\n', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await page.route('https://ipv6.icanhazip.com/**', route => route.fulfill({ body: '2001:db8::10\n', headers: { 'Access-Control-Allow-Origin': '*' } }));
  const errors = [];
  page.on('pageerror', error => errors.push(`${page.url()}: ${error.message}`));
  for (const { href } of tools) {
    for (const locale of locales) {
      const path = `/${locale}${href}`;
      const response = await page.goto(`${base}${path}`);
      assert.equal(response.status(), 200, path);
      assert.equal(new URL(page.url()).pathname, path, `${path} redirected`);
      // Hydrated: the theme script and React have both run.
      await page.waitForFunction(() => document.documentElement.dataset.theme);
      const title = (await page.locator('main h1').first().textContent())?.trim();
      assert.ok(title, `${path}: no <h1>`);
      assert.ok(!/\bApp\.[A-Za-z]/.test(await page.locator('body').innerText()), `${path}: untranslated message key`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: horizontal scroll at 390px`);
    }
  }
  assert.deepEqual(errors, []);
  console.log(`PASS: ${tools.length} published tools × ${locales.length} locales load, hydrate, have a title, no untranslated keys or uncaught errors, and fit 390px`);
} finally { await browser.close(); }
