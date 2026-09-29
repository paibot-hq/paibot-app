import { setTimeout as delay } from 'node:timers/promises';
import { appFetch } from './lib/access.mjs';

// Replaces a fixed sleep after deploy: an edge that still serves the previous
// version can 404 a brand-new route. Waits until the site reports the expected
// X-App-Version several times in a row, then lets the post-deploy checks run.
const base = process.env.CHECK_BROWSER_BASE_URL;
const expected = process.env.EXPECTED_APP_VERSION;
const needed = Number(process.env.WAIT_CONSECUTIVE ?? 5);
const deadline = Date.now() + Number(process.env.WAIT_TIMEOUT_MS ?? 180000);
if (!base || !expected) throw new Error('CHECK_BROWSER_BASE_URL and EXPECTED_APP_VERSION are required');
let streak = 0;
let last = null;
while (Date.now() < deadline) {
  try {
    const response = await appFetch(base, `/robots.txt?deploy-check=${Date.now()}`, { redirect: 'manual' });
    await response.body?.cancel();
    last = `${response.status} ${response.headers.get('x-app-version')}`;
    streak = response.headers.get('x-app-version') === expected ? streak + 1 : 0;
  } catch (error) {
    last = error.message;
    streak = 0;
  }
  if (streak >= needed) break;
  await delay(3000);
}
if (streak < needed) {
  console.error(`Timed out waiting for ${base} to serve ${expected} (last: ${last})`);
  process.exit(1);
}
console.log(`PASS: ${base} served ${expected} ${needed} times in a row`);

// The version header can come from an edge that already runs the new code
// while others still serve the previous version and 404 a brand-new page
// (run 36512726421: /ja/business-card). So also wait until every page in the
// sitemap answers 200 before the post-deploy checks - and search crawlers -
// are told the release is done.
const sitemap = await (await appFetch(base, `/sitemap.xml?deploy-check=${Date.now()}`)).text();
let pending = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname);
const total = pending.length;
while (pending.length && Date.now() < deadline) {
  const results = await Promise.all(pending.map(async path => {
    try {
      const response = await appFetch(base, `${path}?deploy-check=${Date.now()}`, { redirect: 'manual' });
      await response.body?.cancel();
      return response.status === 200;
    } catch { return false; }
  }));
  pending = pending.filter((_, index) => !results[index]);
  if (pending.length) await delay(3000);
}
if (pending.length) {
  console.error(`Timed out waiting for ${pending.length}/${total} sitemap pages to answer 200 (e.g. ${pending.slice(0, 3).join(', ')})`);
  process.exit(1);
}
console.log(`PASS: all ${total} sitemap pages answer 200`);
