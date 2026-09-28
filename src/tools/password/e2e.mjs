// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('password');
  await page.waitForFunction(() => document.querySelector('main [aria-live]')?.textContent?.length === 16);
  const password = await main.locator('[aria-live]').textContent();
  assert.match(password, /[a-z]/); assert.match(password, /[A-Z]/); assert.match(password, /[0-9]/);
  await main.getByRole('slider').fill('32');
  await page.waitForFunction(() => document.querySelector('main [aria-live]')?.textContent?.length === 32);
  for (const checkbox of await main.getByRole('checkbox').all()) await checkbox.uncheck();
  await main.getByText('Select at least one character type').waitFor();
  console.log('PASS: password generation, length and empty selection');
}
