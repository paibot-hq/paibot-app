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
  // Leaving right after entering (the browser is slow to enter fullscreen) must really leave: a late start must not bring the page back to fullscreen.
  await page.waitForFunction(() => !document.fullscreenElement);
  await page.waitForTimeout(300);
  assert.equal(await page.locator('[data-expanded]').count(), 0, 'it stays left');
  // The width of a phone is checked on a page of its own: a window that has been fullscreen cannot always be resized at once (headless Chromium is not
  // quick to leave fullscreen), and that made this flow fail now and then.
  const phone = await page.context().newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(page.url());
  await phone.waitForFunction(() => document.querySelector('[data-clock-time]')?.textContent);
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await phone.screenshot({ path: '/tmp/paibot-clock-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: clock, local date rollover, fullscreen and mobile width');
}
