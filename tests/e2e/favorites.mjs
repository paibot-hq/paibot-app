// Needs: a running preview and Clerk test keys.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { clerkSetup, setupClerkTestingToken, clerk } from '@clerk/testing/playwright';
import { createClerkClient } from '@clerk/backend';

// Same disposable-test-user technique as tests/e2e/auth.mjs (a real Clerk
// sign-up against the dev instance, deleted in `finally`) - favorites needs
// a real signed-in userId, which nothing else in this repo can fake.
const base = new URL(process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002').origin;
assert.ok(/^(localhost|127\.0\.0\.1|[a-z]+\.localhost)$/.test(new URL(base).hostname), 'Auth fixture test is local-only');
assert.ok(process.env.CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_'), 'Development publishable key required');
assert.ok(process.env.CLERK_SECRET_KEY?.startsWith('sk_test_'), 'Development secret key required');
const email = `paibot-e2e-${randomUUID()}+clerk_test@example.com`;
const backend = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
await clerkSetup();
const browser = await chromium.launch();
let userId;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await setupClerkTestingToken({ page });
  await page.goto(`${base}/en/sign-up`);
  await page.locator('input[name="emailAddress"]').fill(email);
  const password = page.locator('input[name="password"]');
  if (await password.count()) await password.fill(`Aa9!${randomUUID()}`);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('input[autocomplete="one-time-code"]').first().fill('424242');
  await page.waitForFunction(() => Boolean(window.Clerk?.user));
  userId = await page.evaluate(() => window.Clerk.user.id);

  // A signed-out visitor sees every star (same as signed-in), but clicking
  // one opens Clerk's sign-in modal instead of writing to D1.
  await page.goto(`${base}/en`);
  await clerk.signOut({ page });
  await page.goto(`${base}/en`);
  await clerk.loaded({ page });
  assert.ok((await page.locator('.favorite-button').count()) > 0, 'signed-out visitors still see favorite buttons');
  await page.locator('[data-slug="wc"]').click();
  await page.locator('.cl-modalContent, [role="dialog"]').first().waitFor();
  await page.keyboard.press('Escape');
  console.log('PASS: favoriting while signed out opens the sign-in modal, not a D1 write');

  await clerk.signIn({ page, signInParams: { strategy: 'email_code', identifier: email } });
  await page.goto(`${base}/en`);
  await clerk.loaded({ page });

  // "wc" (character count) is a stable, always-published tool to key the test on.
  // A favourite is listed twice (first among the favourites, then in its category): the first one is the one checked.
  const card = page.locator('.app-card-wrap').filter({ has: page.locator('a[href="/en/wc"]') }).first();
  const star = card.locator('.favorite-button');
  await star.waitFor();
  assert.equal(await star.getAttribute('aria-pressed'), 'false', 'starts unfavorited');

  await star.click();
  await page.waitForFunction(() => document.querySelector('[data-slug="wc"]')?.getAttribute('aria-pressed') === 'true');
  await page.reload();
  await clerk.loaded({ page });
  assert.equal(await card.locator('.favorite-button').getAttribute('aria-pressed'), 'true', 'favorite persists after reload');
  // The favourites are not moved to the top (the page would jump): a switch shows only them.
  await page.locator('[data-search="only-favorites"]').click();
  assert.deepEqual(await page.locator('[data-search="favorites"] a').evaluateAll(links => links.map(link => link.getAttribute('href'))), ['/en/wc']);
  await page.locator('[data-search="only-favorites"]').click();
  await page.locator('#search-results, nav a[href="/en/json"]').first().waitFor();
  console.log('PASS: favoriting an app persists across reload');

  await card.locator('.favorite-button').click();
  await page.waitForFunction(() => document.querySelector('[data-slug="wc"]')?.getAttribute('aria-pressed') === 'false');
  await page.reload();
  await clerk.loaded({ page });
  assert.equal(await card.locator('.favorite-button').getAttribute('aria-pressed'), 'false', 'unfavorite persists after reload');
  console.log('PASS: unfavoriting an app persists across reload');

  // The same star also shows on the tool's own page (ToolLayout), reading
  // routes/locale.tsx's shared loader, and its fetcher submits cross-route
  // to routes/favorites.ts's action (explicit actionPath, since the current
  // page here is /wc, not the list).
  await page.goto(`${base}/en/wc`);
  const toolStar = page.locator('[data-slug="wc"]');
  await toolStar.waitFor();
  assert.equal(await toolStar.getAttribute('aria-pressed'), 'false', 'tool page reflects unfavorited state too');
  await toolStar.click();
  await page.waitForFunction(() => document.querySelector('[data-slug="wc"]')?.getAttribute('aria-pressed') === 'true');
  await page.goto(`${base}/en`);
  await card.locator('.favorite-button').waitFor();
  assert.equal(await card.locator('.favorite-button').getAttribute('aria-pressed'), 'true', 'favoriting from the tool page reflects on the list of the app');
  await card.locator('.favorite-button').click();
  await page.waitForFunction(() => document.querySelector('[data-slug="wc"]')?.getAttribute('aria-pressed') === 'false');
  console.log('PASS: the favorite star also works from the tool\'s own page');

  // A post from another origin, carrying this visitor's session, writes nothing: the route itself refuses it (403),
  // and its .data address is refused by React Router (400).
  for (const [path, status] of [['/en/favorites', 403], ['/en/favorites.data', 400]]) {
    const refused = await page.request.post(`${base}${path}`, { form: { appSlug: 'wc', intent: 'add' }, headers: { Origin: 'https://attacker.example' }, maxRedirects: 0 });
    assert.equal(refused.status(), status, `${path} from another origin`);
  }
  await page.goto(`${base}/en`);
  await clerk.loaded({ page });
  assert.equal(await card.locator('.favorite-button').getAttribute('aria-pressed'), 'false', 'a post from another origin did not favorite');
  console.log('PASS: a favorite posted from another origin is refused');

  assert.deepEqual(errors, []);
  console.log('PASS: no uncaught browser errors');
} finally {
  await browser.close();
  const { data } = await backend.users.getUserList({ emailAddress: [email] });
  for (const user of data) await backend.users.deleteUser(user.id);
  // Deleting the Clerk user doesn't touch D1 - there's no cascade between
  // the two stores - so this fixture's rows would otherwise linger forever
  // in the local simulation (this test only ever runs against localhost,
  // asserted above, so --local is always the right target). Skipped if the
  // try block failed before sign-up even completed (userId never set).
  if (userId) {
    assert.match(userId, /^user_[A-Za-z0-9]+$/, 'unexpected Clerk user id shape');
    spawnSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--local', '--command', `DELETE FROM favorites WHERE user_id = '${userId}'`], { stdio: 'inherit' });
  }
  console.log('Cleaned up development auth fixture');
}
