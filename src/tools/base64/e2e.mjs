// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, result }) {
  const input = 'あ😀', encoded = Buffer.from('あ😀').toString('base64');
  await go('base64');
  await main.locator('textarea').fill(input);
  await result(encoded);
  await main.getByRole('button', { name: 'Copy', exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), encoded);
  await main.getByRole('button', { name: 'Base64 → Text', exact: true }).click();
  await main.locator('textarea').fill(encoded);
  await result(input);
  await main.locator('textarea').fill('!!!');
  await main.getByText(/isn't a valid/).waitFor();
  console.log('PASS: base64 encode/decode, clipboard and invalid input');
}
