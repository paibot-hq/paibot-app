// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, go, errors }) {
  await page.clock.setFixedTime(new Date('2026-12-31T14:59:59Z'));
  await go('clock');
  await page.waitForFunction(() => document.querySelector('[data-clock-time]')?.textContent === '23:59:59');
  assert.match(await page.locator('[data-clock-date]').textContent(), /December 31, 2026/);
  await page.clock.setFixedTime(new Date('2026-12-31T15:00:00Z'));
  await page.waitForFunction(() => document.querySelector('[data-clock-time]')?.textContent === '00:00:00');
  assert.match(await page.locator('[data-clock-date]').textContent(), /January 1, 2027/);
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await page.locator('[data-expanded]').waitFor();
  await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
  await page.locator('[data-expanded]').waitFor({ state: 'detached' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: '/tmp/paibot-clock-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: clock, local date rollover, fullscreen and mobile width');
}
