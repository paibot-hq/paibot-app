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

// One shared page for the whole run (not a fresh page per test): against
// dev.paibot.app, each newPage() re-runs the Cloudflare Access service-token
// handshake as a brand new session. Doing that 6 times in quick succession
// tripped some Access-side limit after ~36 requests — the 4th fresh session
// (the theme-toggle test) got silently redirected to the Access login page
// instead of the app, even though the Service Token itself was still valid
// (confirmed: earlier fresh sessions in the same run succeeded). A single
// shared session avoids relying on undocumented Access session limits.
// Navigating within one page resets DOM/JS state between tests anyway.
const page = await browser.newPage({ extraHTTPHeaders: accessHeaders });
let errors = [];
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`); });
page.on('response', (res) => { if (res.status() >= 400) errors.push(`[http ${res.status()}] ${res.url()}`); });

async function withPage(run) {
  errors = [];
  await run(page, errors);
  return errors;
}

const baseHost = new URL(base).hostname;

// A missing/rejected Access service token doesn't throw — it silently
// 302s to Cloudflare's login page, which is itself a normal 200 response,
// so nothing here fails loudly on its own. Every navigation must be checked
// against this instead of trusting that "no console error" means the app
// actually loaded. header.topbar (src/components/header.tsx) renders on
// every locale page unconditionally, so its presence also rules out other
// silent failures (a 500 page, an empty shell, etc.), not just Access.
async function assertLandedOnApp(page, path) {
  const landedHost = new URL(page.url()).hostname;
  if (landedHost !== baseHost) {
    throw new Error(
      `Expected to be on ${baseHost}${path} but landed on ${page.url()}. ` +
      `If this is Cloudflare's login page, the CF_ACCESS_CLIENT_ID/` +
      `CF_ACCESS_CLIENT_SECRET service token was not honored for this request.`
    );
  }
  await page.locator('header.topbar').first().waitFor({ state: 'attached', timeout: 5000 });
}

async function go(page, path, { waitUntil = 'networkidle' } = {}) {
  await page.goto(base + path, { waitUntil });
  await assertLandedOnApp(page, path);
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
    const initial = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.click('.theme-toggle');
    await page.waitForTimeout(150);
    const toggled = await page.evaluate(() => document.documentElement.dataset.theme);
    assert.notEqual(toggled, initial, 'theme must change after clicking the toggle');
    await page.reload({ waitUntil: 'networkidle' });
    await assertLandedOnApp(page, '/ja (reload)');
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
