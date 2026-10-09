// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ main, go }) {
  await go('breaches');
  const cards = main.locator('[data-breach]');
  assert.ok(await cards.count() >= 5, 'the incidents are listed');
  assert.equal(await cards.first().getAttribute('data-breach'), 'bookoff', 'newest first');
  await main.getByRole('button', { name: 'Most records', exact: true }).click();
  assert.equal(await cards.first().getAttribute('data-breach'), 'kddi-mail', 'largest first');
  for (const link of await main.locator('[data-breach] a').all()) {
    assert.match(await link.getAttribute('href'), /^https:\/\//);
    assert.match(await link.getAttribute('rel'), /noopener/);
  }
  console.log('PASS: breaches list, sorting, safe source links');
}
