import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { clerkSetup, setupClerkTestingToken, clerk } from '@clerk/testing/playwright';
import { createClerkClient } from '@clerk/backend';

// Same disposable-test-user technique as check-auth.mjs (a real Clerk
// sign-up against the dev instance, deleted in `finally`) - favorites needs
// a real signed-in userId, which nothing else in this repo can fake.
const base = process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Auth fixture test is local-only');
assert.ok(process.env.CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_'), 'Development publishable key required');
assert.ok(process.env.CLERK_SECRET_KEY?.startsWith('sk_test_'), 'Development secret key required');
const email = `paibot-e2e-${randomUUID()}+clerk_test@example.com`;
const backend = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
await clerkSetup();
const browser = await chromium.launch();
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

  // A signed-out visitor sees no star at all (server-gated, see apps.tsx's loader).
  await page.goto(`${base}/en/apps`);
  await clerk.signOut({ page });
  await page.goto(`${base}/en/apps`);
  await clerk.loaded({ page });
  assert.equal(await page.locator('.favorite-button').count(), 0, 'signed-out visitors see no favorite buttons');
  console.log('PASS: favorite buttons hidden while signed out');

  await clerk.signIn({ page, signInParams: { strategy: 'email_code', identifier: email } });
  await page.goto(`${base}/en/apps`);
  await clerk.loaded({ page });

  // "wc" (character count) is a stable, always-published tool to key the test on.
  const card = page.locator('.app-card-wrap').filter({ has: page.locator('a[href="/en/wc"]') });
  const star = card.locator('.favorite-button');
  await star.waitFor();
  assert.equal(await star.getAttribute('aria-pressed'), 'false', 'starts unfavorited');

  await star.click();
  await page.waitForFunction(() => document.querySelector('[data-slug="wc"]')?.getAttribute('aria-pressed') === 'true');
  await page.reload();
  await clerk.loaded({ page });
  assert.equal(await card.locator('.favorite-button').getAttribute('aria-pressed'), 'true', 'favorite persists after reload');
  console.log('PASS: favoriting an app persists across reload');

  await card.locator('.favorite-button').click();
  await page.waitForFunction(() => document.querySelector('[data-slug="wc"]')?.getAttribute('aria-pressed') === 'false');
  await page.reload();
  await clerk.loaded({ page });
  assert.equal(await card.locator('.favorite-button').getAttribute('aria-pressed'), 'false', 'unfavorite persists after reload');
  console.log('PASS: unfavoriting an app persists across reload');

  assert.deepEqual(errors, []);
  console.log('PASS: no uncaught browser errors');
} finally {
  await browser.close();
  const { data } = await backend.users.getUserList({ emailAddress: [email] });
  for (const user of data) await backend.users.deleteUser(user.id);
  console.log('Cleaned up development auth fixture');
}
