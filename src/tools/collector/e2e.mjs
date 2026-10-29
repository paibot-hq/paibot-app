// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('collector');
  const text = name => main.locator(`[data-collector="${name}"]`).innerText();
  // A die: 6 × (1 + 1/2 + … + 1/6) = 14.7 draws, half are done by 13.
  assert.equal(await text('mean'), '14.7 draws');
  assert.equal(await text('median'), '13 draws');
  // After 6 draws the chance is 6!/6^6 = 1.54%.
  await main.locator('[data-collector="draws"]').fill('6');
  assert.equal(await text('within'), '1.54%');
  // Fifty kinds, one already owned, wanting all: the mean drops by one draw (from 224.96 to 223.96).
  await main.locator('[data-collector="kinds"]').fill('50');
  await page.waitForFunction(() => document.querySelector('[data-collector="mean"]').textContent === '224.96 draws');
  await main.locator('[data-collector="have"]').fill('1');
  await page.waitForFunction(() => document.querySelector('[data-collector="mean"]').textContent === '223.96 draws');
  assert.match(await text('question'), /You own 1 of 50 kinds/);
  // A price gives the cost.
  await main.locator('[data-collector="price"]').fill('2');
  assert.equal(await text('cost'), 'Average cost: 448');
  // The collection: one draw, then draw until complete; it stops on the draw that completes it.
  await main.locator('[data-collector="draw1"]').click();
  await page.waitForFunction(() => /^1 draws, /.test(document.querySelector('[data-collector="status"]').textContent));
  await main.locator('[data-collector="drawAll"]').click();
  await page.waitForFunction(() => document.querySelector('[data-collector="status"]').dataset.done !== undefined);
  assert.match(await text('status'), /50 \/ 50 kinds.*Complete in \d+ draws!/s);
  assert.equal(await main.locator('[data-collector="grid"] li[data-got]').count(), 50);
  assert.ok(await main.locator('[data-collector="draw1"]').isDisabled());
  await main.locator('[data-collector="reset"]').click();
  assert.match(await text('status'), /^0 draws, 1 \/ 50 kinds/);
  // A thousand tries average close to the exact answer.
  await main.locator('[data-collector="trials"]').click();
  const average = Number((await text('trialResult')).match(/Average of 1,000 tries: ([\d.,]+) draws/)[1].replace(',', ''));
  assert.ok(Math.abs(average - 223.96) < 12, `average ${average}`);
  // A preset sets the kinds back to all of a die.
  await main.getByRole('button', { name: 'A die (6)' }).click();
  await page.waitForFunction(() => document.querySelector('[data-collector="mean"]').textContent === '14.7 draws');
  console.log('PASS: collector: exact mean, median and chance for a die, owned kinds and price, drawing until complete, a thousand tries, presets');
}
