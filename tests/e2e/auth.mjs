// Needs: a running preview and Clerk test keys.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { clerkSetup, setupClerkTestingToken, clerk } from '@clerk/testing/playwright';
import { createClerkClient } from '@clerk/backend';

const base = new URL(process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002').origin;
assert.ok(/^(localhost|127\.0\.0\.1|[a-z]+\.localhost)$/.test(new URL(base).hostname), 'Auth fixture test is local-only');
assert.ok(process.env.CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_'), 'Development publishable key required');
assert.ok(process.env.CLERK_SECRET_KEY?.startsWith('sk_test_'), 'Development secret key required');
const email = `paibot-e2e-${randomUUID()}+clerk_test@example.com`;
const backend = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
await clerkSetup();
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  const violations = [];
  await page.exposeFunction("recordCsp", directive => violations.push(directive));
  await page.addInitScript(() => document.addEventListener("securitypolicyviolation", event => { void window.recordCsp(event.effectiveDirective); }));
  page.on('pageerror', error => errors.push(error.message));
  await setupClerkTestingToken({ page });
  await page.goto(`${base}/en/sign-up`);
  await page.locator('input[name="emailAddress"]').fill(email);
  const password = page.locator('input[name="password"]');
  if (await password.count()) await password.fill(`Aa9!${randomUUID()}`);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  // Clerk test addresses use 424242 and do not send an actual email.
  await page.locator('input[autocomplete="one-time-code"]').first().fill('424242');
  await page.waitForFunction(() => Boolean(window.Clerk?.user));
  const userId = await page.evaluate(() => window.Clerk.user.id);
  console.log('PASS: sign-up and email verification with a development test address');
  async function assertSsr(signedIn) {
    const response = await page.request.get(`${base}/en`);
    assert.equal(response.status(), 200);
    const html = await response.text();
    // Only inspect server HTML; do not let hydration turn a signed-out SSR
    // response into an apparently successful authenticated page.
    assert.equal(html.includes(userId), signedIn, 'Clerk SSR auth state');
    const hasSignInLink = /<a\b[^>]*href="\/en\/sign-in[?"]/.test(html);
    assert.equal(hasSignInLink, !signedIn, 'SSR header reflects auth state');
  }
  await page.goto(`${base}/en`);
  await clerk.loaded({ page });
  await assertSsr(true);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.Clerk?.user));
  await assertSsr(true);
  console.log('PASS: authenticated SSR and session persistence after reload');
  await clerk.signOut({ page });
  await page.goto(`${base}/en`);
  await clerk.loaded({ page });
  await assertSsr(false);
  console.log('PASS: sign-out reflected in SSR');
  await clerk.signIn({ page, signInParams: { strategy: 'email_code', identifier: email } });
  await page.goto(`${base}/en`);
  await assertSsr(true);
  console.log('PASS: existing-account sign-in');
  // Signing out must land on the page you are on, not the one you signed in
  // from. Navigate client-side: a full load would rebuild the Clerk instance
  // and hide the stale redirect target this guards against.
  await page.goto(`${base}/en`);
  await clerk.loaded({ page });
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await page.waitForURL(`${base}/en/about`);
  await page.locator('.cl-userButtonTrigger').click();
  await page.getByText('Sign out', { exact: true }).click();
  await page.waitForSelector('a[href^="/en/sign-in"]');
  await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).pathname, '/en/about', 'sign-out stays on the current page');
  assert.deepEqual(errors, []);
  assert.deepEqual(violations, [], "auth flow CSP violations");
  console.log('PASS: sign-out returns to the current page; no uncaught browser errors');
} finally {
  await browser.close();
  // Delete only this run's unique fixture; never touch existing users.
  const { data } = await backend.users.getUserList({ emailAddress: [email] });
  for (const user of data) await backend.users.deleteUser(user.id);
  console.log('Cleaned up development auth fixture');
}
