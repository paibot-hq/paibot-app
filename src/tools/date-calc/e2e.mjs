// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('date-calc');
  await main.getByLabel('From', { exact: true }).fill('2026-10-05');
  await main.getByLabel('To', { exact: true }).fill('2026-10-15');
  await page.waitForFunction(() => document.querySelector('[data-date="days"]')?.textContent === '10 days');
  assert.equal(await main.locator('[data-date="weekdays"]').textContent(), '8 days');
  await main.getByLabel('Count the first day as day 1').check();
  await page.waitForFunction(() => document.querySelector('[data-date="days"]')?.textContent === '11 days');
  // Adding a month to the 31st lands on the last day of a shorter month.
  await main.getByRole('button', { name: 'Add or subtract' }).click();
  await main.getByLabel('Date', { exact: true }).fill('2026-01-31');
  await main.getByLabel('Amount', { exact: true }).fill('1');
  await main.getByLabel('Unit', { exact: true }).selectOption('month');
  await page.waitForFunction(() => document.querySelector('[data-date="added"]')?.textContent === '2026-02-28');
  await main.getByRole('button', { name: 'Weekday & era' }).click();
  await main.getByLabel('Date', { exact: true }).fill('2026-10-05');
  await page.waitForFunction(() => document.querySelector('[data-date="weekday"]')?.textContent === 'Monday');
  await main.getByText('Reiwa 8').waitFor();
  console.log('PASS: date calculator: days between, adding a month, weekday and era');
}
