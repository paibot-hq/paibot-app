import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';

// Black-box checks against the built Next.js app. Uses local .env.local keys;
// never creates accounts, signs in, or prints keys and response bodies.
const LANGS = ['ja', 'en', 'zh'];
const catalogs = await Promise.all(LANGS.map(async lang => JSON.parse(await readFile(new URL(`../messages/${lang}.json`, import.meta.url)))));
// Messages nest (e.g. App.dice.title), so compare fully-qualified leaf paths,
// not just the top-level group names — a flat Object.keys() comparison would
// miss a missing key inside an otherwise-present group.
function leafPaths(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? leafPaths(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]);
}
const [baseKeys, ...otherKeys] = catalogs.map(c => leafPaths(c.App).sort());
for (const keys of otherKeys) assert.deepEqual(keys, baseKeys, 'Translation keys must match');

async function withServer(indexable, run) {
  // Runs against the vinext/Cloudflare Workers build (dist/server), not a plain `next build`,
  // since `npm run build` now targets vinext. SITE_INDEXABLE/SITE_URL must be injected as Workers
  // vars (--var), not host process.env values — wrangler's simulated Workers runtime does not
  // inherit process.env directly. Confirmed by hand that --var is read live per run (not baked
  // in at build time): toggling it flips robots.txt/X-Robots-Tag without rebuilding.
  // This always builds the dev config (wrangler.jsonc's top level, not env.production), whose
  // real SITE_URL is https://dev.paibot.app — overridden here to the production domain since
  // this test simulates production-like settings and asserts against https://paibot.app URLs.
  const child = spawn('node_modules/.bin/wrangler', ['dev', '--config', 'dist/server/wrangler.json', '--port', '3197', '--var', `SITE_INDEXABLE:${indexable}`, '--var', 'SITE_URL:https://paibot.app'], {
    cwd: new URL('..', import.meta.url),
    env: process.env,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let diagnostics = '';
  child.stderr.on('data', chunk => { diagnostics += chunk.toString(); });
  const base = 'http://localhost:3197';
  const exited = once(child, 'exit');
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error('Test server exited before becoming ready');
      try { await fetch(`${base}/robots.txt`); ready = true; break; } catch { await delay(100); }
    }
    assert.ok(ready, 'Test server must start');
    const request = (path, extra = {}) => fetch(base + path, { redirect: 'manual', ...extra });
    await run(request);
  } catch (error) {
    const summary = diagnostics.split('\n').filter(line => /Error:|error:/.test(line)).join('\n')
      .replace(/(?:pk|sk)_(?:test|live)_\S+/g, '[redacted key]')
      .replace(/eyJ[A-Za-z0-9_.-]+/g, '[redacted token]');
    if (summary) console.error(summary);
    throw error;
  } finally {
    child.kill('SIGTERM');
    await exited;
  }
}

await withServer(true, async request => {
  for (const [i, lang] of LANGS.entries()) {
    const otherLang = LANGS.find(l => l !== lang);
    const response = await request(`/${lang}`, { headers: { cookie: `NEXT_LOCALE=${otherLang}`, 'Accept-Language': otherLang } });
    assert.equal(response.status, 200, `${lang}: public home accessible without authentication`);
    const html = await response.text();
    assert.ok(html.includes(`<html lang="${lang}"`), `${lang}: initial HTML language`);
    assert.ok(html.includes(catalogs[i].App.lead), `${lang}: translated initial content`);
    assert.ok(html.includes(`rel="canonical" href="https://paibot.app/${lang}"`), `${lang}: self canonical`);
    // Attribute order/casing on the alternate <link> tags differs between plain Next.js and the
    // vinext build (both are valid HTML), so match attributes independently rather than as one
    // fixed substring.
    const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
    const hasAlternate = (hreflang, href) => linkTags.some(tag =>
      tag.includes(`href="${href}"`) && /hreflang="([^"]+)"/i.exec(tag)?.[1] === hreflang);
    for (const other of LANGS) assert.ok(hasAlternate(other, `https://paibot.app/${other}`), `${lang}: alternate ${other}`);
    assert.ok(hasAlternate('x-default', `https://paibot.app/ja`), `${lang}: x-default alternate`);
    // Clerk's signed-out controls mount after its client session state loads.
    // Check public language links here; auth page accessibility is checked below.
    assert.ok(LANGS.every(l => html.includes(`href="/${l}"`)), 'Language links are present in initial HTML');
    assert.ok(html.includes('name="robots" content="index, follow"'), `${lang}: production indexing metadata`);
    for (const authPath of ['sign-in', 'sign-up']) {
      const authResponse = await request(`/${lang}/${authPath}`);
      assert.equal(authResponse.status, 200, `${lang}: ${authPath} works`);
      assert.match(authResponse.headers.get('x-robots-tag') ?? '', /noindex/);
      const authHtml = await authResponse.text();
      assert.ok(authHtml.includes('name="robots" content="noindex, nofollow"'));
      assert.ok(!authHtml.includes('rel="canonical"'), 'Auth pages must not inherit home canonical');
    }
  }
  for (const [from, to] of [['/', '/ja'], ['/sign-in', '/ja/sign-in']]) {
    const response = await request(from);
    assert.ok([307, 308].includes(response.status), `${from}: redirects`);
    assert.equal(new URL(response.headers.get('location'), 'http://localhost:3197').pathname, to);
  }
  const missing = await request('/en/does-not-exist');
  assert.equal(missing.status, 404, 'Unknown pages return 404');
  const api = await request('/api/does-not-exist');
  assert.equal(api.status, 404, 'API paths are not redirected to a locale');
  const sitemap = await request('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  const xml = await sitemap.text();
  for (const lang of LANGS) assert.ok(xml.includes(`<loc>https://paibot.app/${lang}</loc>`));
  assert.ok(!/sign-in|sign-up/.test(xml), 'Sitemap lists public pages only');
  const robots = await (await request('/robots.txt')).text();
  assert.ok(robots.includes('Allow: /'));
  assert.ok(robots.includes('Sitemap: https://paibot.app/sitemap.xml'));
  console.log('PASS: language HTML, canonical/hreflang, auth routes, redirects, 404, sitemap, production robots');
});
await withServer(false, async request => {
  const response = await request('/en');
  assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/);
  assert.ok((await response.text()).includes('name="robots" content="noindex, follow"'));
  assert.ok((await (await request('/robots.txt')).text()).includes('Disallow: /'));
  console.log('PASS: staging noindex and robots');
});
