// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, result }) {
  const input = 'あ /?&', encoded = encodeURIComponent('あ /?&');
  await go('urlencode');
  await main.locator('textarea').fill(input);
  await result(encoded);
  await main.getByRole('button', { name: 'Copy', exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), encoded);
  await main.getByRole('button', { name: 'Encoded → Text', exact: true }).click();
  await main.locator('textarea').fill(encoded);
  await result(input);
  await main.locator('textarea').fill('%XX');
  await main.getByText(/isn't a valid/).waitFor();
  console.log('PASS: urlencode encode/decode, clipboard and invalid input');
}
