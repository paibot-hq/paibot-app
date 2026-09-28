// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, result }) {
  await go('stopwatch');
  await main.getByRole('button', { name: 'Start', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('main [aria-live]').textContent !== '00:00.00');
  await main.getByRole('button', { name: 'Lap', exact: true }).click();
  assert.equal(await main.locator('li').count(), 1);
  await main.getByRole('button', { name: 'Stop', exact: true }).click();
  await main.getByRole('button', { name: 'Reset', exact: true }).click();
  await result('00:00.00');
  console.log('PASS: stopwatch start/lap/stop/reset');
}
