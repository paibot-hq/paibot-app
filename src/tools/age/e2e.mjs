// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ main, go }) {
  await go('age');
  await main.locator('select').selectOption('30');
  await main.getByRole('button', { name: 'Already came', exact: true }).click();
  assert.match(await main.locator('[aria-live]').textContent(), new RegExp(String(new Date().getFullYear() - 30)));
  console.log('PASS: birth year lookup');
}
