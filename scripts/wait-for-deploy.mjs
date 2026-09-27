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
  if (streak >= needed) {
    console.log(`PASS: ${base} served ${expected} ${needed} times in a row`);
    process.exit(0);
  }
  await delay(3000);
}
console.error(`Timed out waiting for ${base} to serve ${expected} (last: ${last})`);
process.exit(1);
