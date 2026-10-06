// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('tax');
  const included = main.locator('[data-tax="included"]');
  await page.waitForFunction(() => /1,100/.test(document.querySelector('[data-tax="included"]')?.textContent ?? ''));
  assert.match(await main.locator('[data-tax="tax"]').textContent(), /100/);
  // The reduced rate, a discount that is taken off before the tax, and the other direction.
  await main.getByLabel('Tax rate').selectOption('8');
  await page.waitForFunction(() => /1,080/.test(document.querySelector('[data-tax="included"]')?.textContent ?? ''));
  await main.getByLabel('Discount (%)').fill('50');
  await page.waitForFunction(() => /540/.test(document.querySelector('[data-tax="included"]')?.textContent ?? ''));
  await main.getByLabel('Discount (%)').fill('');
  await main.getByRole('button', { name: 'With tax → without tax' }).click();
  await main.getByLabel('Tax rate').selectOption('10');
  await main.getByLabel('Price with tax').fill('1100');
  await page.waitForFunction(() => /1,000/.test(document.querySelector('[data-tax="excluded"]')?.textContent ?? ''));
  assert.match(await included.textContent(), /1,100/);
  console.log('PASS: tax: with and without tax, the reduced rate, a discount, rounding');
}
