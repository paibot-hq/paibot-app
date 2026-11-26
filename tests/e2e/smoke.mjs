// Needs: a running preview.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { appFetch, configureAccess } from '../../scripts/lib/access.mjs';
import { locales } from '../../src/i18n/routing.ts';
import { pathLocales, publicPaths } from '../../src/lib/seo.ts';
import { APP_CATALOG, GRADIENT_DESCENT_PATH } from '../../src/lib/app-catalog.ts';

const base = new URL(process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002').origin;
const siteOrigin = new URL(process.env.CHECK_SITE_URL ?? 'https://dev.paibot.app').origin;
// Every public page but the math drills' unit and item pages (hundreds, covered by the math flow and the catalog check):
// the math list and a few of them stand for the rest.
const MATH_SAMPLE = ['/math', '/math/arith', '/math/signed', '/math/factorization', '/math/pythagoras', '/math/arith/order-of-operations', '/math/signed/four-operations', '/math/factorization/trinomial', '/math/pythagoras/sides'];
const paths = publicPaths.filter(path => !path.startsWith('/math/') || MATH_SAMPLE.includes(path));
const indexable = process.env.CHECK_SITE_INDEXABLE === 'true';
// Clerk settings are independent of Worker releases. Production uses Google only;
// the development instance retains email authentication for isolated test users.
const authMode = process.env.CHECK_AUTH_MODE ?? (base === 'https://paibot.app' ? 'google-only' : 'email');
assert.ok(['google-only', 'email'].includes(authMode), 'CHECK_AUTH_MODE must be google-only or email');
const authPaths = ['sign-in', 'sign-up', 'diary', 'profile', 'legal/commerce'];
const browser = await chromium.launch();
try {
  // Parse the actual server response, without allowing hydration to repair it.
  const parser = await browser.newPage();
  async function readHead(html) {
    return parser.evaluate(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return {
        lang: doc.documentElement.lang,
        titles: [...doc.head.querySelectorAll('title')].map(el => el.textContent),
        canonical: [...doc.querySelectorAll('link[rel="canonical"]')].map(el => el.getAttribute('href')),
        alternates: [...doc.querySelectorAll('link[rel="alternate"][hreflang]')].map(el => [el.getAttribute('hreflang'), el.getAttribute('href')]),
        robotsTags: [...doc.querySelectorAll('meta[name="robots"]')].map(el => el.content),
        adsenseAccount: doc.querySelector('meta[name="google-adsense-account"]')?.content,
        adScripts: [...doc.querySelectorAll('script[src]')].filter(el => el.src.includes('adsbygoogle.js')).length,
        robots: doc.querySelector('meta[name="robots"]')?.content,
        description: doc.querySelector('meta[name="description"]')?.content,
        ogTitle: doc.querySelector('meta[property="og:title"]')?.content,
        ogUrl: doc.querySelector('meta[property="og:url"]')?.content,
        ogImage: doc.querySelector('meta[property="og:image"]')?.content,
        twitterTitle: doc.querySelector('meta[name="twitter:title"]')?.content,
      };
    }, html);
  }
  function checkReviewHead(head, path) {
    assert.equal(head.robotsTags.length, 1, `${path}: one unambiguous robots directive`);
    assert.equal(head.adScripts, 0, `${path}: no global ad serving while awaiting approval`);
    assert.equal(head.adsenseAccount, indexable ? 'ca-pub-8043848570527700' : undefined, `${path}: production ownership verification`);
  }
  function checkTitle(head, path) {
    assert.equal(head.titles.length, 1, `${path}: exactly one SSR title`);
    assert.ok(head.titles[0].trim(), `${path}: nonempty SSR title`);
  }
  // Scripts run only by the page's nonce, a new one each time (src/entry.server.tsx): every script the HTML names carries
  // it (JSON-LD is data, not run), and nothing inline is allowed besides.
  function checkNonce(res, html, path) {
    const scriptSrc = /(?:^|; )script-src ([^;]*)/.exec(res.headers.get('content-security-policy') ?? '')?.[1] ?? '';
    const nonce = /'nonce-([A-Za-z0-9+/=]+)'/.exec(scriptSrc)?.[1];
    assert.ok(nonce, `${path}: script-src has a nonce`);
    assert.match(scriptSrc, /'strict-dynamic'/, `${path}: script-src 'strict-dynamic'`);
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(([tag]) => tag).filter(tag => !/type="application\/ld\+json"/.test(tag));
    assert.ok(scripts.length > 0, `${path}: scripts`);
    for (const tag of scripts) assert.ok(tag.includes(`nonce="${nonce}"`), `${path}: ${tag} carries the nonce`);
  }
  function checkHeaders(res, path, auth = false) {
    const csp = res.headers.get('content-security-policy') ?? '';
    assert.match(csp, /(?:^|; )default-src 'self'(?:;|$)/, `${path}: CSP`);
    assert.match(csp, /(?:^|; )frame-ancestors 'none'(?:;|$)/);
    assert.match(csp, /(?:^|; )img-src [^;]*data:/);
    assert.match(csp, /(?:^|; )img-src [^;]*blob:/, 'a photo chosen by the visitor can be shown (the photo checker)');
    // GA loads only when indexable (production), which no browser check here
    // exercises - so guard the hosts it needs at the header level instead.
    if (indexable) {
      assert.match(csp, /(?:^|; )img-src [^;]*https:\/\/www\.googletagmanager\.com/, `${path}: GA img-src`);
      assert.match(csp, /(?:^|; )img-src [^;]*https:\/\/\*\.google-analytics\.com/, `${path}: GA img-src`);
      assert.match(csp, /(?:^|; )connect-src [^;]*https:\/\/\*\.google-analytics\.com/, `${path}: GA connect-src`);
    }
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    if (!indexable || auth) assert.match(res.headers.get('x-robots-tag') ?? '', /noindex/);
    else assert.doesNotMatch(res.headers.get('x-robots-tag') ?? '', /noindex/);
  }
  async function request(path, options) {
    return appFetch(base, path, options);
  }
  const alternatesOf = path => [...pathLocales(path).map(l => [l, `${siteOrigin}/${l}${path}`]), ['x-default', `${siteOrigin}${path || '/'}`]];
  let publicPages = 0;
  for (const locale of locales) {
    for (const path of paths) {
      const pathname = `/${locale}${path}`;
      if (!pathLocales(path).includes(locale)) {
        // A page served in other locales only (a Japan-only exam) 404s here.
        const res = await request(pathname);
        assert.equal(res.status, 404, pathname);
        await res.body?.cancel();
        continue;
      }
      publicPages++;
      const res = await request(pathname);
      assert.equal(res.status, 200, pathname);
      assert.equal(new URL(res.url).pathname, pathname, `${pathname}: must land on app`);
      checkHeaders(res, pathname);
      const html = await res.text();
      checkNonce(res, html, pathname);
      const head = await readHead(html);
      checkTitle(head, pathname);
      checkReviewHead(head, pathname);
      assert.equal(head.lang, locale);
      assert.equal(head.robots, indexable ? 'index, follow' : 'noindex, nofollow');
      assert.deepEqual(head.canonical, [`${siteOrigin}${pathname}`]);
      assert.deepEqual(head.alternates, alternatesOf(path));
      assert.ok(head.description?.trim());
      assert.equal(head.ogUrl, head.canonical[0]);
      assert.equal(head.ogImage, `${siteOrigin}/opengraph-image.png`);
      assert.equal(head.ogTitle, head.titles[0]);
      assert.equal(head.twitterTitle, head.titles[0]);
    }
    for (const auth of authPaths) {
      const path = `/${locale}/${auth}`;
      const res = await request(path);
      assert.equal(res.status, 200, path);
      checkHeaders(res, path, true);
      const html = await res.text();
      checkNonce(res, html, path);
      const head = await readHead(html);
      checkTitle(head, path);
      checkReviewHead(head, path);
      assert.equal(head.robots, 'noindex, nofollow');
      assert.deepEqual(head.canonical, [], `${path}: no public canonical`);
    }
  }
  console.log(`PASS: ${publicPages} public pages and ${authPaths.length * locales.length} non-indexable pages: SSR titles, SEO tags and security headers`);

  for (const path of ['/', ...paths.filter(Boolean), '/diary', '/profile', '/legal/commerce', '/sign-in', '/sign-up', '/sign-in/factor-one', '/sign-up/verify-email-address']) {
    const query = '?redirect_url=%2Fen%2Fwc&source=smoke';
    const res = await request(`${path}${query}`, { redirect: 'manual' });
    assert.equal(res.status, 307, `${path}: locale redirect`);
    assert.equal(res.headers.get('location'), `/ja${path === '/' ? '' : path}${query}`);
  }
  // Signed out, a locale-less URL follows the language picked in the menu
  // (cookie), then the browser's language; no header (crawlers) means ja.
  for (const [headers, expected] of [
    [{ 'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8' }, 'en'],
    [{ 'Accept-Language': 'zh-TW,zh;q=0.9' }, 'zh'],
    [{ 'Accept-Language': 'fr-FR,fr;q=0.9' }, 'ja'],
    [{ 'Accept-Language': 'en-US', Cookie: 'locale=zh' }, 'zh'],
  ]) {
    const res = await request('/about?x=1', { redirect: 'manual', headers });
    assert.equal(res.status, 307);
    assert.equal(res.headers.get('location'), `/${expected}/about?x=1`, JSON.stringify(headers));
    assert.match(res.headers.get('vary') ?? '', /Accept-Language/);
  }
  // Locale URLs never redirect by language, so crawlers can reach every one.
  const pinned = await request('/ja/about', { redirect: 'manual', headers: { 'Accept-Language': 'en' } });
  assert.equal(pinned.status, 200);
  await pinned.body?.cancel();
  for (const path of ['/invalid/wc', '/ja/missing', '/api/missing', '/missing']) {
    const res = await request(path, { redirect: 'manual' });
    assert.equal(res.status, 404, path);
    const head = await readHead(await res.text());
    checkTitle(head, path);
    assert.deepEqual(head.robotsTags, ['noindex, nofollow'], `${path}: errors are not indexable`);
    assert.equal(head.adScripts, 0);
  }
  for (const path of ['/ja/math/test', '/en/math/test/placement']) {
    const res = await request(path);
    assert.equal(res.status, 200, path);
    const head = await readHead(await res.text());
    checkReviewHead(head, path);
    assert.deepEqual(head.robotsTags, ['noindex, nofollow'], `${path}: practice tests have only a noindex directive`);
  }
  for (const path of ['/icon.svg', '/apple-icon.png', '/opengraph-image.png']) {
    const asset = await request(path);
    assert.equal(asset.status, 200, path);
    assert.match(asset.headers.get('content-type'), /^image\//);
    await asset.body?.cancel();
  }
  const robots = await (await request('/robots.txt')).text();
  assert.equal(robots, indexable
    ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${siteOrigin}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n');
  const sitemapResponse = await request('/sitemap.xml');
  assert.equal(sitemapResponse.status, 200);
  assert.match(sitemapResponse.headers.get('content-type'), /application\/xml/);
  const sitemap = await sitemapResponse.text();
  assert.ok(sitemap.split('<url>').slice(1).every(url => /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(url)), 'every sitemap entry has the build date as lastmod');
  const entries = await parser.evaluate(xml => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Malformed sitemap XML');
    return [...doc.querySelectorAll('url')].map(url => ({
      loc: url.querySelector('loc')?.textContent,
      alternates: [...url.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')].map(el => [el.getAttribute('hreflang'), el.getAttribute('href')]),
    }));
  }, sitemap);
  assert.deepEqual(entries, publicPaths.flatMap(path => pathLocales(path).map(locale => ({
    loc: `${siteOrigin}/${locale}${path}`,
    alternates: alternatesOf(path),
  }))));
  await parser.close();
  console.log('PASS: locale redirects preserve queries and follow the language cookie and Accept-Language; 404s, robots and sitemap');

  if (process.env.CHECK_SSR_ONLY === 'true') process.exitCode = 0;
  else {
  const page = await browser.newPage({ serviceWorkers: 'block' });
  await configureAccess(page, base);
  const pageErrors = [];
  const consoleErrors = [];
  const cspViolations = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  // Errors of our own pages only. Production loads ads, whose frames (www.google.com and others) log their own messages, such as the
  // report-only notice "Framing 'https://www.google.com/' violates ... frame-ancestors 'self'": nothing on our side to fix. A violation of our
  // own policy is caught below (securitypolicyviolation), not from the console.
  page.on('console', message => {
    if (message.type() !== 'error') return;
    let origin = base;
    try { origin = new URL(message.location().url).origin; } catch { /* no location: count it */ }
    if (origin !== base || /violates the following report-only Content Security Policy directive/.test(message.text())) return;
    consoleErrors.push(message.text());
  });
  await page.exposeFunction('reportCspViolation', violation => cspViolations.push(violation));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', event => {
      // Keep queries/tokens out of diagnostics.
      let blocked = event.blockedURI;
      try { blocked = new URL(blocked).origin; } catch { /* inline/eval */ }
      void window.reportCspViolation({ directive: event.effectiveDirective, blocked });
    });
  });
  async function go(path) {
    const response = await page.goto(`${base}${path}`);
    assert.equal(response?.status(), 200, path);
    assert.equal(new URL(page.url()).origin, base, `${path}: unexpected external redirect`);
    assert.equal(new URL(page.url()).pathname, path);
    // Set by the preferences effect after React has hydrated the shared UI.
    await page.waitForFunction(() => ['light', 'dark'].includes(document.documentElement.dataset.theme));
    assert.equal(await page.locator('title').count(), 1, `${path}: hydrated title`);
    assert.ok((await page.title()).trim());
  }
  // New visitors can reach each directory and discover its apps without searching.
  for (const locale of locales) {
    await go(`/${locale}`);
    await page.locator(`main a[href="/${locale}/apps?tag=game"]`).click();
    await page.waitForURL(`**/${locale}/apps?tag=game`);
    const games = page.locator('main[data-app-list]');
    await games.locator('[data-app-tags] button[data-tag="game"][aria-pressed="true"]').waitFor();
    await games.locator(`a[href="/${locale}/puchi"]`).waitFor();
    await go(`/${locale}`);
    const overview = page.locator('[data-search="overview"]');
    assert.deepEqual(await overview.locator('h2').allTextContents(), ['Learn', 'Lab', 'Tools', 'Play']);
    await overview.locator('[data-shelf="play"]').click();
    await page.waitForURL(`**/${locale}/play`);
    const play = page.locator('main[data-section="play"]');
    await play.locator('[data-topic="games"] a[href$="/puchi"]').waitFor();
    await play.locator('[data-topic="quizzesAndFortune"] a[href$="/quiz"]').waitFor();
    await play.locator('[data-topic="quizzesAndFortune"] a[href$="/personality"]').waitFor();
    await play.locator('[data-topic="watchAndRelax"] a[href$="/goldfish"]').waitFor();
    await page.locator(`header.topbar .site-switcher a[href="/${locale}/play"][aria-current="page"]`).waitFor();
    await go(`/${locale}`);
    await overview.locator(`[data-section="lab"] a[href="/${locale}/sql"]`).waitFor();
    await overview.locator('[data-shelf="learn"]').click();
    await page.waitForURL(`**/${locale}/learn`);
    // /learn is its own hub (src/components/learn-hub.tsx): a card per book, each opening that book, with shortcuts into it.
    const learn = page.locator('main[data-section="learn"]');
    await learn.locator(`[data-course] a[href="/${locale}/ai-ds"]`).first().waitFor();
    await learn.locator(`[data-course] a[href="/${locale}/math"]`).first().waitFor();
    await learn.locator(`[data-course] a[href="/${locale}/ai-ds/arch/transformer"]`).waitFor();
    for (const slug of ['arith', 'linux', 'code-runner']) {
      assert.equal(await learn.locator(`a[href="/${locale}/${slug}"]`).count(), 0, `${slug} is not a learning book`);
    }
    const nav = page.locator('header.topbar .site-switcher');
    await nav.locator(`a[href="/${locale}/lab"]`).click();
    await page.waitForURL(`**/${locale}/lab`);
    const lab = page.locator('main[data-section="lab"]');
    for (const slug of ['sql', 'linux']) {
      await lab.locator(`[data-topic="computingExperiments"] a[href="/${locale}/${slug}"]`).waitFor();
    }
    await lab.locator('[data-search="start"] summary').click();
    await lab.locator(`[data-search="start"] a[href="/${locale}/sql"]`).waitFor();
    await lab.locator(`[data-topic="mathAndAi"] a[href="/${locale}${GRADIENT_DESCENT_PATH}"]`).click();
    await page.waitForURL(`**/${locale}${GRADIENT_DESCENT_PATH}`);
    await page.locator('#gradient-descent').waitFor();
    await nav.locator(`a[href="/${locale}/tools"]`).click();
    await page.waitForURL(`**/${locale}/tools`);
    await nav.locator(`a[href="/${locale}/tools"][aria-current="page"]`).waitFor();
    const tools = page.locator('main[data-section="tools"]');
    await tools.locator(`a[href="/${locale}/apps"][data-search="all-apps"]`).waitFor();
    await tools.locator(`[data-topic="calculationsAndTime"] a[href="/${locale}/arith"]`).waitFor();
    await tools.locator(`[data-topic="developmentAndData"] a[href="/${locale}/code-runner"]`).waitFor();
    const start = page.locator('[data-search="start"]');
    await start.locator('summary').click();
    assert.equal(await start.locator('article').count(), 2);
    for (const target of ['/metadata', '/mosaic', '/wc', '/date-calc']) {
      await start.locator(`a[href="/${locale}${target}"]`).waitFor();
    }
    await start.locator(`a[href="/${locale}/wc"]`).click();
    await page.waitForURL(`**/${locale}/wc`);
    await page.locator('[data-tool-example]').waitFor();
    assert.equal(await page.locator('[data-tool-example]').count(), 1);
    await page.locator('[data-tool-about] a[href$="/about#contact"]').click();
    await page.waitForURL(`**/${locale}/about#contact`);
    await page.locator('#contact a[href="mailto:support@paibot.app"]').waitFor();
  }
  // The top page is a search: it finds an app by its name or keywords, and says so when nothing matches.
  for (const [locale, query, href] of [['ja', 'json', '/ja/json'], ['en', 'json', '/en/json'], ['zh', 'json', '/zh/json'], ['ja', '文字数', '/ja/wc'], ['en', 'password', '/en/password'], ['ja', '勾配降下法', `/ja${GRADIENT_DESCENT_PATH}`], ['en', 'gradient descent', `/en${GRADIENT_DESCENT_PATH}`], ['zh', '梯度下降', `/zh${GRADIENT_DESCENT_PATH}`]]) {
    await go(`/${locale}`);
    const box = page.getByRole('combobox');
    await box.fill(query);
    await page.locator(`a[href="${href}"]`).first().waitFor();
    assert.ok((await page.locator('[data-search="results"] a').count()) > 0, `${locale} ${query}: results`);
  }
  await go('/ja');
  await page.getByRole('combobox').fill('no-such-app-987654');
  await page.getByText('見つかりませんでした').waitFor();
  assert.equal(await page.locator('[data-search="results"] a').count(), 0);
  // The keyboard: arrows move through the results and Enter opens the chosen one.
  await page.getByRole('combobox').fill('json');
  await page.locator('[data-search="results"] a').first().waitFor();
  // The Enter that confirms a Japanese or Chinese conversion is the input method's, not a choice: it opens nothing
  // (composing, and Safari's after the composition, keyCode 229).
  for (const init of [{ isComposing: true }, { keyCode: 229 }]) {
    await page.getByRole('combobox').evaluate((box, init) => box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init })), init);
    await page.waitForTimeout(300);
    assert.equal(new URL(page.url()).pathname, '/ja', `an input method's Enter (${JSON.stringify(init)}) opened a result`);
  }
  await page.getByRole('combobox').press('Enter');
  await page.waitForURL(/\/ja\/json$/);
  // Every published app can be found by its name.
  await go('/ja');
  const apps = APP_CATALOG.filter(app => app.status === 'published' && app.href);
  assert.ok(apps.length >= 10);
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ['/ja', '/ja/learn', '/ja/lab', '/ja/tools', '/ja/play']) {
    await go(path);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path} fits mobile width`);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  console.log('PASS: the top page search finds apps and topics in three locales, by keyboard, and fits mobile width');
  // The ranking page lists every app (this run's browser is not counted, so the views may all be nought).
  await go('/ja/ranking');
  // Every published app is listed, each once, viewed or not.
  const listed = await page.locator('[data-ranking="list"] li').evaluateAll(items => items.map(li => li.dataset.slug));
  assert.deepEqual([...listed].sort(), APP_CATALOG.filter(app => app.status === 'published' && app.href && !app.private).map(app => app.slug).sort());
  console.log('PASS: the ranking page lists every app');
  for (const locale of locales) {
    await go(`/${locale}/wc`);
    // fill auto-waits for the textarea to become enabled after hydration.
    await page.locator('textarea').fill('Aあ😀');
    await page.waitForFunction(() => document.querySelector('[aria-live="polite"]')?.textContent === '3');
  }
  console.log('PASS: character counting including emoji in three locales');
  await go('/ja/age');
  await page.locator('.language-toggle').click();
  await page.getByRole('menuitem', { name: 'English', exact: true }).click();
  await page.waitForURL(`${base}/en/age`);
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  // Remembered for locale-less URLs (see the redirect checks above).
  assert.equal((await page.context().cookies()).find(cookie => cookie.name === 'locale')?.value, 'en');
  assert.equal(await page.locator('title').count(), 1);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `${siteOrigin}/en/age`);
  const beforeTheme = await page.locator('html').getAttribute('data-theme');
  const theme = beforeTheme === 'dark' ? 'light' : 'dark';
  await page.locator('.theme-toggle').click();
  await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, theme);
  await page.reload();
  await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, theme);
  console.log('PASS: client-side locale navigation and persisted theme');
  for (const auth of ['sign-in', 'sign-up']) {
    await go(`/ja/${auth}`);
    if (authMode === 'google-only') {
      const google = page.getByRole('button', { name: 'Googleで続ける', exact: true });
      await google.waitFor({ timeout: 20000 });
      assert.equal(await google.isEnabled(), true, `${auth}: Google authentication is available`);
      assert.equal(await page.locator('.cl-socialButtonsBlockButton').count(), 1, `${auth}: Google is the only social provider`);
      assert.equal(await page.locator('input:not([type="hidden"])').count(), 0, `${auth}: no email, password, phone or username form`);
    } else {
      const field = auth === 'sign-in' ? 'identifier' : 'emailAddress';
      await page.locator(`input[name="${field}"]`).waitFor({ timeout: 20000 });
    }
  }
  assert.deepEqual(pageErrors, [], 'uncaught browser errors');
  assert.deepEqual(consoleErrors, [], 'browser console errors');
  assert.deepEqual(cspViolations, [], 'CSP violations');
  console.log('PASS: Clerk sign-in/sign-up forms; no browser errors or CSP violations');
  }
} finally {
  await browser.close();
}
