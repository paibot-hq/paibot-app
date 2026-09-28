// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ main, go }) {
  await go('arith');
  await main.locator('input').waitFor();
  const equation = await main.locator('[aria-live]').allTextContents();
  const match = equation.map(text => text.match(/^(\d+) ([+\-×÷]) (\d+)$/)).find(Boolean);
  assert.ok(match, 'arithmetic equation visible');
  const a = Number(match[1]), b = Number(match[3]);
  const answer = { '+': a + b, '-': a - b, '×': a * b, '÷': a / b }[match[2]];
  await main.locator('input').fill(String(answer));
  await main.getByRole('button', { name: 'Submit', exact: true }).click();
  await main.getByText('Question 2 of 10', { exact: true }).waitFor();
  console.log('PASS: arithmetic answer advances question');
}
