// check:all skips this file: needs a running preview and Clerk test keys.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { clerkSetup, setupClerkTestingToken, clerk } from '@clerk/testing/playwright';
import { createClerkClient } from '@clerk/backend';

const base = new URL(process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002').origin;
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local targets only');
assert.ok(process.env.CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_'));
assert.ok(process.env.CLERK_SECRET_KEY?.startsWith('sk_test_'));
const backend = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const emails = [];
const errors = [];
await clerkSetup();
const browser = await chromium.launch();

async function signup() {
  const email = `paibot-profile-${randomUUID()}+clerk_test@example.com`;
  emails.push(email);
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await setupClerkTestingToken({ page });
  await page.goto(`${base}/en/sign-up`);
  await page.locator('input[name="emailAddress"]').fill(email);
  const password = page.locator('input[name="password"]');
  if (await password.count()) await password.fill(`Aa9!${randomUUID()}`);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('input[autocomplete="one-time-code"]').first().fill('424242');
  await page.waitForFunction(() => Boolean(window.Clerk?.user));
  return page;
}

// Posts straight at the action, bypassing the UI, to exercise its guards.
// Goes through Playwright's request context rather than page.fetch, because a
// browser refuses to let scripts set Origin.
const post = async (page, form, origin = base) =>
  (await page.request.post(`${base}/en/profile.data`, { headers: { Origin: origin }, form, maxRedirects: 0 })).status();

try {
  const guest = await browser.newPage();
  guest.on('pageerror', error => errors.push(error.message));
  await guest.goto(`${base}/en/profile`);
  assert.equal(await guest.locator('input[type="date"]').count(), 0, 'guests see no form');
  assert.equal(await post(guest, { intent: "birthDate", value: "1990-04-10" }), 401, 'guest write rejected');
  console.log('PASS: signed-out visitors cannot read or write a profile');

  const page = await signup();
  await page.goto(`${base}/en/profile`);
  const birthInput = page.locator('#profile-birth-date');
  await birthInput.waitFor();
  await birthInput.fill('1990-04-10');
  await page.getByText('Saved', { exact: true }).waitFor();

  const stored = await page.request.get(`${base}/en/profile`);
  assert.equal(stored.headers()['cache-control'], 'private, no-store', 'profile is never shared');
  assert.match(stored.headers()['x-robots-tag'] ?? '', /noindex/, 'profile stays out of search');
  assert.match(await stored.text(), /1990-04-10/, 'the saved date survives a reload');
  console.log('PASS: birth date saves, persists and stays private');

  for (const value of ['not-a-date', '1899-12-31', '3000-01-01', '1990-13-40']) {
    assert.equal(await post(page, { intent: 'birthDate', value }, base), 400, `rejects ${value}`);
  }
  assert.equal(await post(page, { intent: 'nonsense', value: 'x' }, base), 400, 'rejects unknown intent');
  assert.ok([400, 403].includes(await post(page, { intent: 'birthDate', value: '1991-01-01' }, 'https://other.example')),
    'rejects a cross-origin write');
  console.log('PASS: invalid values and cross-origin writes are refused');

  // Language and appearance ride along with the header controls.
  assert.equal(await post(page, { intent: 'locale', value: 'xx' }, base), 400, 'rejects an unknown locale');
  assert.equal(await post(page, { intent: 'theme', value: 'neon' }, base), 400, 'rejects an unknown theme');
  assert.equal(await post(page, { intent: 'locale', value: 'en' }, base), 200);
  assert.equal(await post(page, { intent: 'theme', value: 'light' }, base), 200);

  const redirected = await page.request.get(`${base}/`, { maxRedirects: 0 });
  assert.equal(redirected.status(), 307);
  assert.equal(redirected.headers()['location'], '/en', 'a saved language steers the locale-less URL');
  assert.equal(redirected.headers()['cache-control'], 'private, no-store', 'that redirect is never shared');
  console.log('PASS: saved language redirects only this visitor');

  // Both settings must be reversible, not one-way.
  assert.equal(await post(page, { intent: 'locale', value: '' }, base), 200, 'language can be unset');
  const unset = await page.request.get(`${base}/`, { maxRedirects: 0 });
  assert.equal(unset.headers()['location'], '/ja', 'unsetting the language restores the default');
  await page.goto(`${base}/en/profile`);
  assert.equal(await page.locator('#profile-locale').inputValue(), '', 'the language shows as unset');
  await page.locator('#profile-theme').selectOption('');
  await page.waitForFunction(() => !document.documentElement.dataset.theme || ['light', 'dark'].includes(document.documentElement.dataset.theme));
  await page.reload();
  assert.equal(await page.locator('#profile-theme').inputValue(), '', 'the appearance shows as unset');
  // Put both back for the checks below.
  await post(page, { intent: 'locale', value: 'en' }, base);
  await post(page, { intent: 'theme', value: 'light' }, base);
  console.log('PASS: language and appearance can both be set back to unset');

  // A second browser context proves the theme travels with the account, not
  // with this browser's localStorage.
  const elsewhere = await browser.newPage();
  elsewhere.on('pageerror', error => errors.push(error.message));
  await setupClerkTestingToken({ page: elsewhere });
  await elsewhere.goto(`${base}/en`);
  await clerk.loaded({ page: elsewhere });
  await clerk.signIn({ page: elsewhere, signInParams: { strategy: 'email_code', identifier: emails[0] } });
  await elsewhere.goto(`${base}/en/life-calendar`);
  await elsewhere.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  assert.equal(await elsewhere.locator('input[type="date"]').inputValue(), '1990-04-10', 'the life calendar starts from the profile');
  console.log('PASS: theme and birth date follow the account to a fresh session');

  // Editing inside the tool is for that visit only.
  await elsewhere.locator('input[type="date"]').fill('1970-01-01');
  await elsewhere.waitForTimeout(500);
  await elsewhere.goto(`${base}/en/profile`);
  assert.equal(await elsewhere.locator('#profile-birth-date').inputValue(), '1990-04-10', 'the tool never writes the profile');
  console.log('PASS: changing the date in a tool does not overwrite the profile');

  const other = await signup();
  await other.goto(`${base}/en/profile`);
  assert.equal(await other.locator('#profile-birth-date').inputValue(), '', 'another account sees nothing');
  assert.doesNotMatch(await (await other.request.get(`${base}/en/life-calendar`)).text(), /1990-04-10/, 'no leak between accounts');
  console.log('PASS: profiles are isolated between accounts');

  await page.reload();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remove' }).click();
  await page.waitForFunction(() => document.querySelector('#profile-birth-date')?.value === '');
  assert.doesNotMatch(await (await page.request.get(`${base}/en/profile`)).text(), /1990-04-10/, 'the date is gone');
  const kept = await page.request.get(`${base}/`, { maxRedirects: 0 });
  assert.equal(kept.headers()['location'], '/en', 'removing the date keeps the other settings');
  console.log('PASS: the birth date can be removed without losing language or theme');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow at 390px');
  assert.deepEqual(errors, [], 'no uncaught browser errors');
  console.log('PASS: mobile width and no browser errors');
} finally {
  await browser.close();
  for (const email of emails) {
    const { data } = await backend.users.getUserList({ emailAddress: [email] });
    for (const user of data) await backend.users.deleteUser(user.id);
  }
  console.log('Cleaned up development profile fixtures');
}
