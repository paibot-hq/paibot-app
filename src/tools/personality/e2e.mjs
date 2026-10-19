// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview (with the local D1 database migrated).
import assert from 'node:assert/strict';

// Extraversion's items (1, 6, 11, 16 in order; 6 and 16 keyed the other way) answered to its top, the rest "neither".
const ANSWERS = Array.from({ length: 20 }, (_, i) => ({ 0: 5, 5: 1, 10: 5, 15: 1 })[i] ?? 3);

export default async function ({ page, main, go }) {
  await go('personality');
  const quiz = main.locator('[data-personality="quiz"]');
  await main.locator('[data-personality="start"]').click();

  // Twenty statements, five answers each, by mouse and by the number keys; "Back" returns to the one before, its
  // answer still marked.
  for (let i = 0; i < 20; i++) {
    assert.equal(await quiz.getAttribute('data-item'), String(i + 1));
    assert.equal(await quiz.locator('[data-personality-answer]').count(), 5);
    if (i === 3) {
      await main.locator('[data-personality="back"]').click();
      assert.equal(await quiz.getAttribute('data-item'), '3');
      assert.equal(await quiz.locator('[data-personality-answer="3"]').getAttribute('aria-checked'), 'true');
      await quiz.locator('[data-personality-answer="3"]').click();
    }
    if (i % 2) await page.keyboard.press(String(ANSWERS[i]));
    else await quiz.locator(`[data-personality-answer="${ANSWERS[i]}"]`).click();
  }

  // The result: extraversion at the top makes a dolphin; the five traits, each placed among everyone; sharing.
  const result = main.locator('[data-personality="result"]');
  await result.waitFor();
  assert.equal(await main.locator('[data-personality="animal"]').getAttribute('data-animal'), 'dolphin');
  assert.match(await main.locator('[data-personality="animal"]').innerText(), /Lively dolphin/);
  const values = await main.locator('[data-trait]').evaluateAll(items => Object.fromEntries(items.map(li => [li.dataset.trait, Number(li.dataset.value)])));
  assert.deepEqual(values, { extraversion: 100, agreeableness: 50, conscientiousness: 50, stability: 50, openness: 50 });
  // The result was kept: the "saving" note goes and no error is shown (the ranks show once there is more than one result).
  await page.waitForFunction(() => !/Saving your result|could not be saved|Too many results/.test(document.querySelector('[data-personality="result"]').innerText));
  const x = new URL(await main.locator('[data-share] [data-network="x"]').getAttribute('href'));
  assert.match(x.searchParams.get('text'), /"Lively dolphin"\. Extraversion 100, agreeableness 50/);
  assert.match(x.searchParams.get('url'), /\/en\/personality$/);

  // Again starts from the first statement.
  await main.locator('[data-personality="again"]').click();
  assert.equal(await quiz.getAttribute('data-item'), '1');
  console.log('PASS: personality: twenty statements by mouse and keys, back keeps the answer, the dolphin for top extraversion, five traits, sharing, again');
}
