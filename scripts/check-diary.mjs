// check:all skips this file: needs a running preview and Clerk test keys.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
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
  const email = `paibot-diary-${randomUUID()}+clerk_test@example.com`;
  emails.push(email);
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await setupClerkTestingToken({ page });
  await page.goto(`${base}/en/sign-up`);
  await page.locator('input[name="emailAddress"]').fill(email);
  const passwordValue = `Aa9!${randomUUID()}`;
  const password = page.locator('input[name="password"]');
  if (await password.count()) await password.fill(passwordValue);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('input[autocomplete="one-time-code"]').first().fill('424242');
  await page.waitForFunction(() => Boolean(window.Clerk?.user));
  await clerk.signOut({ page });
  await page.goto(`${base}/en/diary`);
  await page.getByRole('main').getByRole('button', { name: 'Sign in', exact: true }).click();
  const modal = page.locator('.cl-modalContent');
  await modal.waitFor();
  assert.equal(new URL(page.url()).pathname, '/en/diary', 'opening sign-in keeps diary visible');
  await modal.locator('input[name="identifier"]').fill(email);
  await modal.getByRole('button', { name: 'Continue', exact: true }).click();
  await modal.locator('input[name="password"], input[autocomplete="one-time-code"]').first().waitFor();
  if (await modal.locator('input[name="password"]').count()) {
    await modal.locator('input[name="password"]').fill(passwordValue);
    await modal.getByRole('button', { name: 'Continue', exact: true }).click();
  } else {
    await modal.locator('input[autocomplete="one-time-code"]').first().fill('424242');
  }
  await modal.waitFor({ state: 'hidden' });
  await page.locator('textarea').waitFor();
  assert.equal(new URL(page.url()).pathname, '/en/diary', 'sign-in returns to diary');
  console.log('PASS: diary sign-in button returns to diary after authentication');
  return page;
}
async function submit(page, form) {
  return page.evaluate(async form => {
    const response = await fetch('/en/diary.data', { method: 'POST', body: new URLSearchParams(form) });
    return { status: response.status, text: await response.text() };
  }, form);
}
try {
  const guest = await browser.newPage();
  await guest.goto(`${base}/en/diary`);
  assert.equal(await guest.locator('textarea').count(), 0);
  assert.equal((await submit(guest, { intent: 'create', body: 'unauthorized' })).status, 401);
  const owner = await signup();
  const body = `Private diary ${randomUUID()}`;
  await owner.getByLabel('What would you like to remember?').fill(body);
  await owner.getByRole('button', { name: 'Post', exact: true }).click();
  await owner.locator('article').filter({ hasText: body }).waitFor();
  const id = await owner.locator('[data-entry-id]').first().getAttribute('data-entry-id');
  const response = await owner.request.get(`${base}/en/diary`);
  assert.match(response.headers()['cache-control'], /private, no-store/);
  assert.match(response.headers()['x-robots-tag'], /noindex/);
  assert.ok((await response.text()).includes(body), 'authenticated SSR includes saved post');
  await owner.reload();
  assert.equal(await owner.locator('article').count(), 1);
  assert.equal((await submit(owner, { intent: 'create', body: '  ' })).status, 400);
  assert.equal((await submit(owner, { intent: 'create', body: 'a'.repeat(281) })).status, 400);
  const csrf = await owner.request.post(`${base}/en/diary.data`, { headers: { Origin: 'https://other.example' }, form: { intent: 'create', body: 'csrf' } });
  // React Router may reject cross-origin form submissions before the action.
  assert.ok([400, 403].includes(csrf.status()), 'cross-origin write is rejected');
  console.log('PASS: guest write denied, authenticated persistence, no-store, validation and cross-origin rejection');

  const other = await signup();
  for (const suffix of ['', '.data']) {
    const res = await other.request.get(`${base}/en/diary${suffix}`);
    assert.ok(!(await res.text()).includes(body), 'other user cannot read owner post');
    assert.match(res.headers()['cache-control'], /no-store/);
  }
  for (const intent of ['edit', 'delete']) {
    assert.equal((await submit(other, { intent, id, body: 'stolen' })).status, 404);
  }
  assert.equal((await submit(guest, { intent: 'delete', id })).status, 401);
  await owner.reload();
  await owner.locator('article').filter({ hasText: body }).waitFor();
  console.log('PASS: another account cannot read, edit or delete private posts');

  await owner.locator('article').getByRole('button', { name: 'Edit', exact: true }).click();
  await owner.locator('article textarea').fill(`${body} edited`);
  await owner.getByRole('button', { name: 'Save', exact: true }).click();
  await owner.waitForFunction(() => !document.querySelector('article textarea'));
  await owner.reload();
  await owner.locator('article').filter({ hasText: `${body} edited` }).waitFor();
  assert.equal(await owner.locator('textarea').count(), 0, 'composer hidden after today’s post');
  assert.equal((await submit(owner, { intent: 'create', body: 'duplicate' })).status, 409);
  const post = owner.locator('article').filter({ hasText: `${body} edited` });
  await post.getByRole('button', { name: 'Delete', exact: true }).click();
  await post.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await owner.locator('article').count(), 1);
  await post.getByRole('button', { name: 'Delete', exact: true }).click();
  await post.getByRole('button', { name: 'Delete', exact: true }).click();
  await post.waitFor({ state: 'detached' });
  await owner.reload();
  assert.equal(await owner.locator('textarea').count(), 1, 'deleting today allows a replacement');
  const literal = '<img src=x onerror="window.diaryXss=true">';
  const concurrent = await Promise.all([submit(owner, { intent: 'create', body: literal }), submit(owner, { intent: 'create', body: literal })]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409], 'atomic daily limit');
  await owner.reload();
  assert.equal(await owner.locator('article').count(), 1);
  assert.equal(await owner.locator('article img').count(), 0);
  assert.equal(await owner.evaluate(() => window.diaryXss), undefined);
  await clerk.loaded({ page: owner });
  const userId = await owner.evaluate(() => window.Clerk.user.id);
  assert.match(userId, /^user_[A-Za-z0-9]+$/);
  // Seed eight earlier calendar days directly; never alter the server clock.
  const values = Array.from({ length: 8 }, (_, n) => {
    const date = new Date(Date.now() - (n + 1) * 86400000).toISOString();
    return `('${randomUUID()}', '${userId}', 'Older fixture ${n}', '${date}', '${date}')`;
  });
  const seed = spawnSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--local', '--command', `INSERT INTO diary_entries (id,user_id,body,created_at,updated_at) VALUES ${values.join(',')}`], { encoding: 'utf8' });
  assert.equal(seed.status, 0);
  await owner.reload();
  assert.equal(await owner.locator('article').count(), 1);
  assert.ok(await owner.getByRole('button', { name: 'Newer posts' }).isDisabled());
  for (let n = 0; n < 8; n++) {
    await owner.getByRole('link', { name: 'Older posts' }).click();
    await owner.waitForURL(`**/diary?page=${n + 1}`);
    await owner.locator('article').filter({ hasText: `Older fixture ${n}` }).waitFor();
    assert.equal(await owner.locator('article').count(), 1, 'only the selected post is visible');
  }
  assert.ok(await owner.getByRole('button', { name: 'Older posts' }).isDisabled());
  await owner.getByRole('link', { name: 'Newer posts' }).click();
  await owner.waitForURL('**/diary?page=7');
  await owner.locator('article').filter({ hasText: 'Older fixture 6' }).waitFor();
  assert.equal(await owner.locator('article').count(), 1);
  await owner.setViewportSize({ width: 390, height: 844 });
  assert.ok(await owner.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log('PASS: one post per JST day, concurrent rejection, replacement after delete, one entry at a time, forward/back navigation and disabled end buttons');
  await clerk.signOut({ page: owner });
  await owner.goto(`${base}/en/diary`);
  assert.equal(await owner.locator('article').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: edit, delete confirmation, daily limit, escaped text, mobile layout and sign-out');
} finally {
  await browser.close();
  for (const email of emails) {
    const { data } = await backend.users.getUserList({ emailAddress: [email] });
    for (const user of data) {
      assert.match(user.id, /^user_[A-Za-z0-9]+$/);
      const cleanup = spawnSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--local', '--command', `DELETE FROM diary_entries WHERE user_id = '${user.id}'`], { encoding: 'utf8' });
      await backend.users.deleteUser(user.id);
      assert.equal(cleanup.status, 0, 'local diary fixture cleanup');
    }
  }
  console.log('Cleaned up diary test users and local rows');
}
