// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('dice');
  await main.locator('select').selectOption('3');
  await main.getByRole('button', { name: 'Roll', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('main button').disabled);
  const total = Number(await main.locator('strong').textContent());
  assert.ok(total >= 3 && total <= 18);
  console.log('PASS: dice count and total');
}
