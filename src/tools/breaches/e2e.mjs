// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ main, go }) {
  await go('breaches');
  const cards = main.locator('[data-breach]');
  assert.ok(await cards.count() >= 40, 'the incidents are listed');
  assert.equal(await cards.first().getAttribute('data-breach'), 'bookoff', 'newest first');
  await main.getByRole('button', { name: 'Most records', exact: true }).click();
  assert.equal(await cards.first().getAttribute('data-breach'), 'gyazo', 'largest first');
  // A type narrows the list to it.
  const all = await cards.count();
  await main.locator('button[data-kind="ransomware"]').click();
  const ransomware = await cards.count();
  assert.ok(ransomware > 0 && ransomware < all, 'ransomware is a part of the list');
  assert.equal(await main.locator('[data-breach] [data-kind]:not([data-kind="ransomware"])').count(), 0);
  await main.getByRole('button', { name: 'All', exact: true }).click();
  // The search finds a name, and says so when nothing matches.
  await main.locator('[data-breaches="query"]').fill('タイムズ');
  assert.equal(await cards.count(), 1);
  await main.locator('[data-breaches="query"]').fill('ぬるぽがっ');
  assert.equal(await cards.count(), 0);
  await main.getByText('No incidents match.').waitFor();
  await main.locator('[data-breaches="query"]').fill('');
  for (const link of await main.locator('[data-breach] a').all()) {
    assert.match(await link.getAttribute('href'), /^https:\/\//);
    assert.match(await link.getAttribute('rel'), /noopener/);
  }
  console.log('PASS: breaches list, sorting, type filter, search, safe source links');
}
