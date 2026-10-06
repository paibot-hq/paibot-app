// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('roulette');
  const names = ['Ramen', 'Curry', 'Sushi', 'Udon', 'Burger'];
  const result = main.locator('[data-roulette="result"]');
  await main.locator('[data-roulette="spin"]').click();
  await page.waitForFunction(() => /wins$/.test(document.querySelector('[data-roulette="result"]')?.textContent ?? ''), undefined, { timeout: 9000 });
  const winner = (await result.textContent()).replace(/ wins$/, '');
  assert.ok(names.includes(winner), `the winner (${winner}) is one of the choices`);
  // With "remove the winner", the winner leaves the list.
  await main.getByLabel('Remove the winner').check();
  await main.locator('[data-roulette="spin"]').click();
  await page.waitForFunction(() => /wins$/.test(document.querySelector('[data-roulette="result"]')?.textContent ?? '') && !document.querySelector('[data-roulette="spin"]').disabled, undefined, { timeout: 9000 });
  const second = (await result.textContent()).replace(/ wins$/, '');
  assert.ok(!(await main.getByLabel('Choices (one per line)').inputValue()).split('\n').includes(second), 'the removed winner is gone');
  await main.getByLabel('Choices (one per line)').fill('Only one');
  await main.getByText('Enter at least two choices').waitFor();
  console.log('PASS: roulette: a spin ends on one of the choices, the winner can be removed, one choice is refused');
}
