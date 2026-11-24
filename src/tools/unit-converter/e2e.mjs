// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('unit-converter');
  await page.waitForFunction(() => /0\.621371/.test(document.querySelector('[data-units="result"]')?.textContent ?? ''));
  // Temperature has an offset; the Japanese area unit is there too.
  await main.getByRole('button', { name: 'Temperature' }).click();
  await main.getByLabel('Value').fill('100');
  await page.waitForFunction(() => /212/.test(document.querySelector('[data-units="result"]')?.textContent ?? ''));
  await main.getByRole('button', { name: 'Area' }).click();
  await main.getByLabel('Value').fill('10');
  await page.waitForFunction(() => /33\.0578/.test(document.querySelector('[data-units="result"]')?.textContent ?? ''));
  await main.getByLabel('Value').fill('abc');
  await main.locator('dl[aria-live="polite"]').getByText('Enter a number', { exact: true }).waitFor();
  assert.equal(await main.locator('[data-units="result"]').textContent(), '–');
  console.log('PASS: unit converter: length, temperature, tsubo, and a bad number');
}
