import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { bank } from './check-quiz.mjs';
import { appFetch, configureAccess } from './lib/access.mjs';

const base = new URL(process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002').origin;
for (const locale of ['ja', 'en', 'zh']) {
  const response = await appFetch(base, `/api/quiz?locale=${locale}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const { questions } = await response.json();
  assert.equal(questions.length, 5);
  assert.equal(new Set(questions.map(q => q.id)).size, 5);
  for (const q of questions) {
    const source = bank.questions.find(item => item.id === q.id && item.published);
    assert.ok(source);
    assert.deepEqual(q, { id: source.id, ...source.translations[locale], answerIndex: source.answerIndex, source: source.source });
  }
}
assert.equal((await appFetch(base, '/api/quiz?locale=bad')).status, 400);
console.log('PASS: real D1 returns five distinct published questions in each locale, invalid locale rejected');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await configureAccess(page, base);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/en/apps`);
  await page.locator('a[href="/en/quiz"]').click();
  await page.waitForURL(`${base}/en/quiz`);
  await page.getByRole('button', { name: 'Start quiz', exact: true }).click();
  const seen = new Set();
  for (let index = 0; index < 5; index++) {
    const heading = page.locator('[data-quiz-question]');
    await heading.waitFor();
    const id = await heading.getAttribute('data-quiz-question');
    assert.ok(!seen.has(id)); seen.add(id);
    const q = bank.questions.find(q => q.id === id);
    assert.equal(await heading.textContent(), q.translations.en.prompt);
    const next = page.getByRole('button', { name: index === 4 ? 'See results' : 'Next question', exact: true });
    assert.ok(await next.isDisabled());
    const answer = index === 0 ? (q.answerIndex + 1) % 4 : q.answerIndex;
    await page.locator(`[data-quiz-choice="${answer}"]`).click();
    assert.equal(await page.locator('[data-quiz-choice]:disabled').count(), 4);
    const feedback = await page.getByRole('status').textContent();
    assert.ok(feedback.includes(q.translations.en.explanation));
    assert.ok(feedback.includes(`Correct answer: ${q.translations.en.choices[q.answerIndex]}`));
    await next.click();
  }
  await page.locator('[data-quiz-score]').waitFor();
  assert.equal(await page.locator('[data-quiz-score]').textContent(), '4 of 5 correct');
  assert.equal(await page.locator('article').count(), 1);
  await page.getByRole('button', { name: 'Play again', exact: true }).click();
  await page.locator('[data-quiz-question]').waitFor();
  assert.equal(await page.locator('[data-quiz-choice]:disabled').count(), 0);
  assert.equal(await page.locator('progress').getAttribute('value'), '0');
  console.log('PASS: scoring, locked answers, explanations, mistake review, retry');
  for (const [locale, label, correct] of [['ja', 'クイズをはじめる', 'せいかい！'], ['zh', '开始答题', '答对了！']]) {
    await page.goto(`${base}/${locale}/quiz`);
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.locator('[data-quiz-question]').waitFor();
    const id = await page.locator('[data-quiz-question]').getAttribute('data-quiz-question');
    const q = bank.questions.find(q => q.id === id);
    assert.equal(await page.locator('[data-quiz-question]').textContent(), q.translations[locale].prompt);
    await page.locator(`[data-quiz-choice="${q.answerIndex}"]`).click();
    assert.ok((await page.getByRole('status').textContent()).includes(correct));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/ja/quiz`);
  await page.route('**/api/quiz?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Quiz unavailable"}' }));
  await page.getByRole('button', { name: 'クイズをはじめる', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('[data-quiz-question]').count(), 0);
  await page.unroute('**/api/quiz?*');
  await page.getByRole('button', { name: 'クイズをはじめる', exact: true }).click();
  await page.locator('[data-quiz-question]').waitFor();
  await page.locator('[data-quiz-choice="0"]').click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: '/tmp/paibot-quiz-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: Japanese/Chinese feedback, mobile layout, failed request recovery, no browser exceptions');
} finally { await browser.close(); }
