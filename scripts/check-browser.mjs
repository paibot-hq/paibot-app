import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Browser-driven checks that a plain fetch can't cover: client-side navigation,
// HMR, theme switching, and JS runtime errors (console/page errors). Run against
// an already-running dev server (`npm run dev`, default port 3001).
// Complements check-i18n.mjs, which checks the built app without a real browser.
const base = process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3001';
const tools = ['age', 'arith', 'base64', 'dice', 'ip', 'json', 'password', 'reaction', 'timing', 'urlencode', 'wc'];

// dev.paibot.app sits behind Cloudflare Access (infra/access.tf), which
// otherwise redirects every request to its login page. A Service Token's
// CF-Access-Client-Id/Secret headers bypass that. Unset when checking a local
// dev server (it isn't behind Access), so no extra headers get sent.
const accessHeaders = process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET
  ? {
      'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
    }
  : {};

try {
  await fetch(base, { headers: accessHeaders });
} catch {
  console.error(`Dev server is not reachable at ${base}.\nStart it first with \`npm run dev\` (in another terminal), then re-run this check.`);
  process.exit(1);
}

const browser = await chromium.launch();

async function withPage(run) {
  const page = await browser.newPage({ extraHTTPHeaders: accessHeaders });
  const errors = [];
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`); });
  page.on('response', (res) => { if (res.status() >= 400) errors.push(`[http ${res.status()}] ${res.url()}`); });
  try {
    await run(page, errors);
  } finally {
    await page.close();
  }
  return errors;
}

async function go(page, path, { waitUntil = 'networkidle' } = {}) {
  await page.goto(base + path, { waitUntil });
  await page.waitForTimeout(200);
}

// Clerk shows a "development mode" badge (a small data:image/svg+xml logo)
// whenever a pk_test_ key is used on a non-localhost hostname — expected on
// dev.paibot.app, which intentionally uses Clerk's development instance. The
// badge sets its own CSP unrelated to ours (confirmed: curling our own /ja
// response shows img-src already covers data:, so this isn't our header),
// so it's not something proxy.ts can fix. Never shows up on localhost, which
// is why this was invisible before the smoke test started hitting the real
// deployed dev Worker.
const isClerkDevBadgeNoise = (e) => /violates the following Content Security Policy/.test(e) && /data:image/.test(e);

// 1. Every tool page renders without a JS/console error, in every locale.
const LANGS = ['ja', 'en', 'zh'];
for (const locale of LANGS) {
  const errors = await withPage(async (page) => {
    await go(page, `/${locale}`);
    for (const slug of tools) await go(page, `/${locale}/${slug}`);
  });
  const relevantErrors = errors.filter(e => !isClerkDevBadgeNoise(e));
  assert.deepEqual(relevantErrors, [], `${locale}: tool pages must render without errors`);
}
console.log(`PASS: all ${tools.length} tool pages render cleanly in ${LANGS.join('/')}`);

// 2. Theme toggle flips data-theme and persists across a reload.
{
  const errors = await withPage(async (page) => {
    await go(page, '/ja');
    // TEMP DEBUG: diagnosing a theme-toggle click timeout seen only against
    // the real deployed dev Worker, never locally. Remove once root-caused.
    console.log('DEBUG url=', page.url(), 'title=', await page.title());
    console.log('DEBUG theme-toggle count=', await page.locator('.theme-toggle').count());
    console.log('DEBUG body snippet=', (await page.evaluate(() => document.body.innerText)).slice(0, 300));
    const initial = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.click('.theme-toggle');
    await page.waitForTimeout(150);
    const toggled = await page.evaluate(() => document.documentElement.dataset.theme);
    assert.notEqual(toggled, initial, 'theme must change after clicking the toggle');
    await page.reload({ waitUntil: 'networkidle' });
    const afterReload = await page.evaluate(() => document.documentElement.dataset.theme);
    assert.equal(afterReload, toggled, 'theme choice must persist (localStorage) across a reload');
  });
  assert.deepEqual(errors, [], 'theme toggle must not raise errors');
  console.log('PASS: theme toggle flips and persists');
}

// 3. Regression guard for the "No intl context found" bug: repeated client-side
// locale switching plus a dev-server HMR (file save) must not break next-intl context.
{
  const errors = await withPage(async (page) => {
    await go(page, '/ja');
    await page.click('.language-toggle');
    await page.waitForTimeout(150);
    await page.click('.language-options a:not([aria-current="page"])');
    await page.waitForLoadState('networkidle');
    for (let i = 0; i < 4; i++) {
      await go(page, '/en/arith');
      await go(page, '/ja/arith');
    }
  });
  const intlErrors = errors.filter(e => /No intl context found/.test(e));
  assert.deepEqual(intlErrors, [], 'locale switching/redirects must not throw "No intl context found"');
  console.log('PASS: repeated locale switching and redirects keep intl context intact');
}

// 4. Regression guard for the Clerk "require is not defined" bug under vinext
// dev (fixed via patches/@clerk+nextjs+*.patch — see CLAUDE.md) and the
// resulting dual @clerk/shared module-instance issue (fixed via
// sign-in-widget.tsx / sign-up-widget.tsx). The <SignIn> widget must actually
// mount and become usable, not just render without a synchronous error —
// Clerk's own widget script loads async, so give it a few seconds.
{
  const errors = await withPage(async (page) => {
    await go(page, '/ja/sign-in', { waitUntil: 'load' });
    await page.waitForSelector('input[name="identifier"], input[type="email"]', { timeout: 8000 });
  });
  // Clerk's own asset loading emits unrelated benign console noise (e.g. a
  // placeholder SVG warning); only fail on errors that indicate our actual bug.
  const relevantErrors = errors.filter(e => /ClerkProvider|useSession|require is not defined|Failed to load url/.test(e));
  assert.deepEqual(relevantErrors, [], '/sign-in must mount a usable form under vinext dev');
  console.log('PASS: /sign-in mounts a usable form under vinext dev');
}

await browser.close();
