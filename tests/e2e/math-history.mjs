// Needs: a running preview, Clerk test keys and local D1.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { clerkSetup, setupClerkTestingToken, clerk } from '@clerk/testing/playwright';
import { createClerkClient } from '@clerk/backend';

// Same disposable-test-user technique as tests/e2e/favorites.mjs. Needs arithmetic
// set order-of-operations/a published in the local D1 the target server reads (see CLAUDE.md), and
// removes the test user's attempts and Clerk account afterwards.
const base = process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Auth fixture test is local-only');
assert.ok(process.env.CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_'), 'Development publishable key required');
assert.ok(process.env.CLERK_SECRET_KEY?.startsWith('sk_test_'), 'Development secret key required');
const ITEM = 'order-of-operations', SET = 'a';
const problems = JSON.parse(readFileSync(new URL('../../src/data/math-arith.json', import.meta.url), 'utf8'))
  .problems.filter(problem => problem.item === ITEM && problem.setId === SET).sort((a, b) => a.position - b.position);
const email = `paibot-e2e-${randomUUID()}+clerk_test@example.com`;
const backend = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
await clerkSetup();
const browser = await chromium.launch();
let userId;

// Answers the first `correct` problems right and the rest wrong, then returns
// the save status line shown under the score.
async function play(page, correct) {
  await page.goto(`${base}/en/math/arith/${ITEM}/${SET}`);
  const main = page.locator('main');
  for (const [index, problem] of problems.entries()) {
    await main.getByText(`${index + 1} / ${problems.length}`, { exact: true }).waitFor();
    const pick = index < correct ? problem.answerIndex : (problem.answerIndex + 1) % 4;
    await main.locator('[role=group] button').nth(pick).click();
    await main.getByRole('button', { name: 'Answer' }).click();
    await main.getByRole('button', { name: 'Next question' }).click();
  }
  await main.getByText(`${correct} / ${problems.length} correct`).waitFor();
  const status = main.locator('[role=status]');
  await page.waitForFunction(() => document.querySelector('main [role=status]')?.textContent?.trim());
  return (await status.textContent()).trim();
}
// The set's card on its learning item's page shows the latest and best score.
async function cardRecord(page) {
  await page.goto(`${base}/en/math/arith/${ITEM}`);
  const card = page.locator(`main a[href="/en/math/arith/${ITEM}/${SET}"]`);
  await card.waitFor();
  return (await card.textContent()).match(/Last .*$/)?.[0] ?? null;
}

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

  await clerk.signOut({ page });
  assert.equal(await play(page, 3), 'Sign in to keep a record of your scores.');
  assert.equal(await cardRecord(page), null, 'signed-out visitors see no records');
  console.log('PASS: signed-out attempts are not saved and point to signing in');

  await clerk.signIn({ page, signInParams: { strategy: 'email_code', identifier: email } });
  assert.equal(await cardRecord(page), null, 'a new user starts with no records');
  assert.equal(await play(page, 4), 'Your score has been saved.');
  assert.equal(await cardRecord(page), 'Last 4 / 5 · Best 4 / 5');
  assert.equal(await play(page, 5), 'Your score has been saved.');
  assert.equal(await play(page, 1), 'Your score has been saved.');
  assert.equal(await cardRecord(page), 'Last 1 / 5 · Best 5 / 5');
  console.log('PASS: finished sets are saved; the item page shows the latest and the best score');

  // The server rescores and refuses anything that is not an attempt at the set as served.
  const url = `${base}/en/math/arith/${ITEM}/${SET}.data`;
  const origin = new URL(base).origin;
  const post = (form, headers = { Origin: origin }) => page.request.post(url, { form, headers, maxRedirects: 0 });
  const ids = JSON.stringify(problems.map(problem => problem.id));
  assert.equal((await post({ problemIds: JSON.stringify(['arith-s1-q1', ...problems.slice(1).map(p => p.id)]), answers: '[0,0,0,0,0]' })).status(), 409);
  assert.equal((await post({ problemIds: ids, answers: '[0,0,0,0,9]' })).status(), 400);
  // React Router aborts cross-origin actions (400) before saveAttemptAction's own 403 check runs.
  assert.equal((await post({ problemIds: ids, answers: '[0,0,0,0,0]' }, { Origin: 'https://example.com' })).status(), 400);
  assert.equal(await cardRecord(page), 'Last 1 / 5 · Best 5 / 5', 'refused posts change nothing');
  console.log('PASS: stale problem ids, out-of-range answers and cross-origin posts are refused');

  const response = await page.request.get(`${base}/en/math/arith/${ITEM}`);
  assert.equal(response.headers()['cache-control'], 'private, no-store');
  assert.deepEqual(errors, []);
  console.log('PASS: item pages are private, no-store; no browser errors');
} finally {
  await browser.close();
  if (userId) {
    assert.match(userId, /^user_[A-Za-z0-9]+$/);
    const cleanup = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local',
      '--command', `DELETE FROM math_attempts WHERE user_id = '${userId}'`], { stdio: 'ignore' });
    if (cleanup.status !== 0) { console.error(`Could not remove local attempts for ${userId}`); process.exitCode = 1; }
    await backend.users.deleteUser(userId);
  }
}
