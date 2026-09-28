// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ main, go }) {
  await go('timing');
  await main.getByRole('button', { name: 'Click to start', exact: true }).click();
  await main.getByRole('button', { name: 'Timing...', exact: true }).click();
  await main.getByRole('button', { name: 'Try again', exact: true }).waitFor();
  assert.match(await main.locator('[aria-live]').textContent(), /Time: \d+\.\d+s/);
  console.log('PASS: timing game');
}
