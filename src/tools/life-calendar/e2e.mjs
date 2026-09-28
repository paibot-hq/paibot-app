// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, errors }) {
  // Back to the date the life calendar below is written against.
  await page.clock.setFixedTime(new Date('2026-12-31T15:00:00Z'));
  await go('life-calendar');
  await main.getByLabel('Date of birth').fill('2026-12-25');
  await page.locator('[data-life-grid]').waitFor();
  assert.equal(await page.locator('[data-life-grid] [data-state="past"]').count(), 1);
  assert.equal(await page.locator('[data-life-grid] [data-state="current"]').count(), 1);
  const initialWeeks = await page.locator('[data-life-grid] [data-state]').count();
  await main.getByRole('combobox', { name: /Display range/ }).selectOption('10');
  assert.ok((await page.locator('[data-life-grid] [data-state]').count()) < initialWeeks);
  assert.equal(await page.locator('[data-current-age]').textContent(), 'Age 0');
  assert.equal(await page.locator('[data-remaining-weeks]').textContent(), '520 weeks');
  await main.getByLabel('Date of birth').fill('2030-01-01');
  await main.getByRole('alert').waitFor();
  assert.equal(await page.locator('[data-life-grid]').count(), 0);
  await main.getByLabel('Date of birth').fill('1990-06-15');
  await main.getByRole('combobox', { name: /Display range/ }).selectOption('90');
  await page.locator('[data-life-grid]').waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: '/tmp/paibot-life-calendar-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  await main.getByRole('combobox', { name: /Display range/ }).selectOption('120');
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.equal(await main.getByRole('button', { name: 'View entire calendar' }).count(), 0);
  const calendarGrid = page.locator('[data-life-grid]');
  assert.ok(await calendarGrid.locator('[data-state]').count() > 6000);
  await calendarGrid.locator('[data-age="0"]').waitFor();
  assert.equal(await calendarGrid.locator('[data-age="120"]').textContent(), 'Age 120');
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => document.querySelector('[data-life-grid]').getBoundingClientRect().height <= innerHeight * .7);
    assert.ok(await calendarGrid.evaluate(grid => grid.scrollHeight <= grid.clientHeight + 2), 'all rows fit inside compact grid');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/paibot-life-inline.png', fullPage: true });
  console.log('PASS: life calendar shows every week inline without an overview button');
}
