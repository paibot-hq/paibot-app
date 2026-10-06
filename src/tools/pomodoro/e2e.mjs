// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('pomodoro');
  const time = main.locator('[data-pomodoro="time"]');
  assert.equal(await time.textContent(), '25:00');
  await main.getByRole('button', { name: 'Start' }).click();
  await page.waitForFunction(() => document.querySelector('[data-pomodoro="time"]')?.textContent === '24:59', undefined, { timeout: 5000 });
  await main.getByRole('button', { name: 'Pause' }).click();
  const paused = await time.textContent();
  await page.waitForTimeout(1500);
  assert.equal(await time.textContent(), paused, 'a paused timer stands still');
  // Skipping goes to the short break; a changed length applies to the phase that is waiting.
  await main.getByRole('button', { name: 'Skip' }).click();
  await main.getByText('Short break').first().waitFor();
  assert.equal(await time.textContent(), '05:00');
  await main.getByLabel('Short break').fill('3');
  await page.waitForFunction(() => document.querySelector('[data-pomodoro="time"]')?.textContent === '03:00');
  await main.getByRole('button', { name: 'Reset' }).click();
  assert.equal(await time.textContent(), '25:00');
  console.log('PASS: pomodoro: start, pause, skip to the break, change the length, reset');
}
