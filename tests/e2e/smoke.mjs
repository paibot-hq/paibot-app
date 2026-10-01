// Needs: a running preview.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { appFetch, configureAccess } from '../../scripts/lib/access.mjs';
import { locales } from '../../src/i18n/routing.ts';
import { pathLocales, publicPaths as paths } from '../../src/lib/seo.ts';
import { APP_CATALOG, APP_CATEGORIES } from '../../src/lib/app-catalog.ts';

const base = new URL(process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002').origin;
const siteOrigin = new URL(process.env.CHECK_SITE_URL ?? 'https://dev.paibot.io').origin;
const indexable = process.env.CHECK_SITE_INDEXABLE === 'true';
const authPaths = ['sign-in', 'sign-up', 'diary', 'profile'];
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
        robots: doc.querySelector('meta[name="robots"]')?.content,
        description: doc.querySelector('meta[name="description"]')?.content,
        ogTitle: doc.querySelector('meta[property="og:title"]')?.content,
        ogUrl: doc.querySelector('meta[property="og:url"]')?.content,
        ogImage: doc.querySelector('meta[property="og:image"]')?.content,
        twitterTitle: doc.querySelector('meta[name="twitter:title"]')?.content,
      };
    }, html);
  }
  function checkTitle(head, path) {
    assert.equal(head.titles.length, 1, `${path}: exactly one SSR title`);
    assert.ok(head.titles[0].trim(), `${path}: nonempty SSR title`);
  }
  function checkHeaders(res, path, auth = false) {
    const csp = res.headers.get('content-security-policy') ?? '';
    assert.match(csp, /(?:^|; )default-src 'self'(?:;|$)/, `${path}: CSP`);
    assert.match(csp, /(?:^|; )frame-ancestors 'none'(?:;|$)/);
    assert.match(csp, /(?:^|; )img-src [^;]*data:/);
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
      const head = await readHead(await res.text());
      checkTitle(head, pathname);
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
      const head = await readHead(await res.text());
      checkTitle(head, path);
      assert.equal(head.robots, 'noindex, nofollow');
      assert.deepEqual(head.canonical, [], `${path}: no public canonical`);
    }
  }
  console.log(`PASS: ${publicPages} public pages and ${authPaths.length * locales.length} non-indexable pages: SSR titles, SEO tags and security headers`);

  for (const path of ['/', ...paths.filter(Boolean), '/diary', '/profile', '/sign-in', '/sign-up', '/sign-in/factor-one', '/sign-up/verify-email-address']) {
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
    const res = await request('/json?x=1', { redirect: 'manual', headers });
    assert.equal(res.status, 307);
    assert.equal(res.headers.get('location'), `/${expected}/json?x=1`, JSON.stringify(headers));
    assert.match(res.headers.get('vary') ?? '', /Accept-Language/);
  }
  // Locale URLs never redirect by language, so crawlers can reach every one.
  const pinned = await request('/ja/json', { redirect: 'manual', headers: { 'Accept-Language': 'en' } });
  assert.equal(pinned.status, 200);
  await pinned.body?.cancel();
  for (const path of ['/invalid/wc', '/ja/missing', '/api/missing', '/missing']) {
    const res = await request(path, { redirect: 'manual' });
    assert.equal(res.status, 404, path);
    checkTitle(await readHead(await res.text()), path);
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
  const entries = await parser.evaluate(xml => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Malformed sitemap XML');
    return [...doc.querySelectorAll('url')].map(url => ({
      loc: url.querySelector('loc')?.textContent,
      alternates: [...url.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')].map(el => [el.getAttribute('hreflang'), el.getAttribute('href')]),
    }));
  }, sitemap);
  assert.deepEqual(entries, paths.flatMap(path => pathLocales(path).map(locale => ({
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
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
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
  // Expected card links per category, straight from the app catalog.
  const categoryApps = Object.fromEntries(APP_CATEGORIES.map(category => [category, APP_CATALOG.filter(app => app.category === category).map(app => app.href)]));
  for (const locale of locales) {
    await go(`/${locale}`);
    assert.deepEqual((await page.locator('.category-item').evaluateAll(links => links.map(link => link.getAttribute('href')))).sort(), Object.keys(categoryApps).map(category => `/${locale}/${category}`).sort());
    for (const [category, hrefs] of Object.entries(categoryApps)) {
      await page.locator(`.category-item[href="/${locale}/${category}"]`).click();
      await page.waitForURL(`${base}/${locale}/${category}`);
      await page.locator(`.category-nav a[aria-current="page"][href="/${locale}/${category}"]`).waitFor();
      assert.equal(await page.locator('main h1').count(), 1);
      assert.deepEqual((await page.locator('.app-card').evaluateAll(links => links.map(link => link.getAttribute('href')))).sort(), hrefs.map(href => `/${locale}${href}`).sort());
      assert.equal(await page.locator('.category-nav [aria-current="page"]').getAttribute('href'), `/${locale}/${category}`);
      await page.getByRole('searchbox').fill('no-such-app-987654');
      await page.locator('.app-empty').waitFor();
      assert.equal(await page.locator('.app-card').count(), 0);
      await page.locator(`.category-nav a[href="/${locale}/apps"]`).click();
      await page.waitForURL(`${base}/${locale}/apps`);
      // React Router can update the URL before React commits the new page.
      // The old category still shows zero search results until that commit.
      await page.locator(`.category-nav a[aria-current="page"][href="/${locale}/apps"]`).waitFor();
      assert.equal(await page.getByRole('searchbox').inputValue(), '', 'all-app navigation resets the category search');
      await page.locator('.app-card').first().waitFor();
      assert.equal(await page.locator('.app-card').count(), APP_CATALOG.length);
      await go(`/${locale}`);
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await go('/ja/network');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'category page fits mobile width');
  await page.setViewportSize({ width: 1280, height: 720 });
  console.log('PASS: six categories in three locales, home links, scoped search, all-app navigation and mobile width');
  for (const locale of locales) {
    await go(`/${locale}/wc`);
    // fill auto-waits for the textarea to become enabled after hydration.
    await page.locator('textarea').fill('Aあ😀');
    await page.waitForFunction(() => document.querySelector('[aria-live="polite"]')?.textContent === '3');
  }
  console.log('PASS: character counting including emoji in three locales');
  await go('/ja/wc');
  await page.locator('.language-toggle').click();
  await page.getByRole('menuitem', { name: 'English', exact: true }).click();
  await page.waitForURL(`${base}/en/wc`);
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  // Remembered for locale-less URLs (see the redirect checks above).
  assert.equal((await page.context().cookies()).find(cookie => cookie.name === 'locale')?.value, 'en');
  assert.equal(await page.locator('title').count(), 1);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `${siteOrigin}/en/wc`);
  const beforeTheme = await page.locator('html').getAttribute('data-theme');
  const theme = beforeTheme === 'dark' ? 'light' : 'dark';
  await page.locator('.theme-toggle').click();
  await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, theme);
  await page.reload();
  await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, theme);
  console.log('PASS: client-side locale navigation and persisted theme');
  for (const auth of ['sign-in', 'sign-up']) {
    await go(`/ja/${auth}`);
    const field = auth === 'sign-in' ? 'identifier' : 'emailAddress';
    await page.locator(`input[name="${field}"]`).waitFor({ timeout: 20000 });
  }
  assert.deepEqual(pageErrors, [], 'uncaught browser errors');
  assert.deepEqual(consoleErrors, [], 'browser console errors');
  assert.deepEqual(cspViolations, [], 'CSP violations');
  console.log('PASS: Clerk sign-in/sign-up forms; no browser errors or CSP violations');
  }
} finally {
  await browser.close();
}
