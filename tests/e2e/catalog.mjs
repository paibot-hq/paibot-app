// Needs a running preview (CHECK_BROWSER_BASE_URL). The same checks for every
// published tool, derived from src/lib/app-catalog.ts, so a new tool is covered
// without writing anything: it loads in every locale, hydrates, shows its
// title, renders no untranslated message key, throws no uncaught error and fits
// a phone screen. Tool-specific flows are in tools.mjs.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { configureAccess } from '../../scripts/lib/access.mjs';
import { selectedTools } from './lib/selected-tools.mjs';

const base = new URL(process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002').origin;
const locales = ['ja', 'en', 'zh'];
const tools = selectedTools();
// A few tools are checked at the same time, each worker on a page of its own (3 by default, as in tools.mjs: the runners of a private repository
// have two cores); CHECK_CONCURRENCY=1 checks them one by one.
const concurrency = Math.max(1, Number(process.env.CHECK_CONCURRENCY ?? 3));
const browser = await chromium.launch();
const errors = [];
const timings = [];

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await configureAccess(page, base);
  // Keep the IP tool off the real network, as in tools.mjs.
  await page.route('https://ipv4.icanhazip.com/**', route => route.fulfill({ body: '192.0.2.10\n', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await page.route('https://ipv6.icanhazip.com/**', route => route.fulfill({ body: '2001:db8::10\n', headers: { 'Access-Control-Allow-Origin': '*' } }));
  page.on('pageerror', error => errors.push(`${page.url()}: ${error.message}`));
  return page;
}

async function check(page, { slug, href, private: isPrivate }) {
  const startedAt = performance.now();
  for (const locale of locales) {
    const path = `/${locale}${href}`;
    const response = await page.goto(`${base}${path}`);
    assert.equal(response.status(), 200, path);
    assert.equal(new URL(page.url()).pathname, path, `${path} redirected`);
    // Hydrated: the theme script and React have both run.
    await page.waitForFunction(() => document.documentElement.dataset.theme);
    const title = (await page.locator('main h1').first().textContent())?.trim();
    assert.ok(title, `${path}: no <h1>`);
    // (A signed-in page is not a public one: it has none of this.)
    if (!isPrivate) {
      // The text about the tool, links to other tools and structured data are in the page as the server sent it (what a search engine reads).
      const about = page.locator('[data-tool-about]');
      assert.equal(await about.count(), 1, `${path}: no text about the tool`);
      assert.ok(((await about.locator('p').first().textContent()) ?? '').trim().length >= 10, `${path}: the text is too short`);
      assert.ok(await about.locator('nav a').count() > 0, `${path}: no links to other tools`);
      const data = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
      assert.equal(data['@type'], 'WebApplication'); assert.equal(data.inLanguage, locale);
      assert.equal(new URL(data.url).pathname, path);
    }
    assert.ok(!/\bApp\.[A-Za-z]/.test(await page.locator('body').innerText()), `${path}: untranslated message key`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: horizontal scroll at 390px`);
  }
  timings.push([slug, performance.now() - startedAt]);
}

const startedAt = performance.now();
try {
  const queue = [...tools];
  let failure = null;
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length || 1) }, async () => {
    const page = await openPage();
    while (queue.length && !failure) {
      const tool = queue.shift();
      try { await check(page, tool); } catch (error) { failure ??= error; }
    }
  }));
  if (failure) throw failure;
  const slowest = [...timings].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([slug, ms]) => `${slug} ${(ms / 1000).toFixed(1)}s`).join(', ');
  console.log(`${timings.length} tools took ${(timings.reduce((sum, [, ms]) => sum + ms, 0) / 1000).toFixed(1)}s (${((performance.now() - startedAt) / 1000).toFixed(1)}s with ${concurrency} at a time); slowest: ${slowest}`);
  assert.deepEqual(errors, []);
  console.log(`PASS: ${tools.length} published tools × ${locales.length} locales load, hydrate, have a title, no untranslated keys or uncaught errors, and fit 390px`);
} finally { await browser.close(); }
