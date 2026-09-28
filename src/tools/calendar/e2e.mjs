// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, go, errors }) {
  // Fixed to a month whose holidays exercise all three kinds at once.
  await page.clock.setFixedTime(new Date('2026-09-26T03:00:00Z'));
  await go('calendar');
  await page.locator('[data-calendar-grid]').waitFor();
  assert.match(await page.locator('[data-calendar-label]').textContent(), /September 2026/);
  assert.equal(await page.locator('[data-calendar-grid] td[data-today]').textContent(), '26');
  assert.deepEqual(await page.locator('[data-calendar-grid] td[data-holiday]').allTextContents(),
    ['21Respect-for-the-Aged Day', '22Citizens\' holiday', '23Autumnal Equinox Day']);
  await page.getByRole('button', { name: 'Next month' }).click();
  await page.waitForFunction(() => document.querySelector('[data-calendar-label]')?.textContent?.includes('October'));
  assert.equal(await page.locator('[data-calendar-grid] td[data-today]').count(), 0, 'today only marks its own month');
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-calendar-label]')?.textContent?.includes('September'));
  await page.getByRole('button', { name: 'Previous month' }).click();
  await page.waitForFunction(() => document.querySelector('[data-calendar-label]')?.textContent?.includes('August'));
  assert.deepEqual(await page.locator('[data-calendar-grid] td[data-holiday]').allTextContents(), ['11Mountain Day'],
    'August 2026 has Mountain Day only');
  // Year view: twelve months at once, the whole year's holidays, and a month
  // heading that opens that month.
  await page.getByRole('button', { name: 'Year', exact: true }).click();
  await page.locator('[data-calendar-year]').waitFor();
  assert.equal(await page.locator('[data-calendar-label]').textContent(), '2026');
  assert.equal(await page.locator('[data-calendar-year] table').count(), 12);
  assert.equal(await page.locator('[data-calendar-year] td[data-holiday]').count(), 18, '2026 has 18 public holidays');
  await page.getByRole('button', { name: 'September', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-calendar-label]')?.textContent?.includes('September 2026'));
  assert.equal(await page.locator('[data-calendar-year]').count(), 0, 'picking a month leaves the year view');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: calendar month navigation, today and Japanese holidays');
}
