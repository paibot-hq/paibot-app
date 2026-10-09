// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ main, go }) {
  await go('breaches');
  const cards = main.locator('[data-breach]');
  assert.ok(await cards.count() >= 60, 'the incidents are listed');
  assert.equal(await cards.first().getAttribute('data-breach'), 'bookoff', 'newest first');
  await main.getByRole('button', { name: 'Most records', exact: true }).click();
  assert.equal(await cards.first().getAttribute('data-breach'), 'gyazo', 'largest first');
  // The charts: a column for every month (the axis does not move with the filters), a dot for every incident with a published count, a tooltip on
  // hover and on keyboard focus, and a table with the same numbers.
  const columns = main.locator('[data-chart="column"]');
  const months = await columns.count();
  assert.ok(months >= 9, 'a column for each month so far');
  const dots = await main.locator('[data-chart="point"]').count();
  assert.ok(dots >= 40, 'a dot for each incident with a count');
  await columns.last().hover();
  await main.locator('[data-chart="tip"]').waitFor();
  assert.match(await main.locator('[data-chart="tip"]').innerText(), /2026/);
  await main.locator('[data-chart="point"]').first().focus();
  assert.match(await main.locator('[data-chart="tip"]').last().innerText(), /2026-/);
  await main.locator('[data-chart="root"] summary').click();
  assert.equal(await main.locator('[data-chart="root"] tbody tr').count(), months, 'the table has the same months');
  // A type narrows the list to it.
  const all = await cards.count();
  await main.locator('button[data-kind="ransomware"]').click();
  const ransomware = await cards.count();
  assert.ok(ransomware > 0 && ransomware < all, 'ransomware is a part of the list');
  assert.equal(await columns.count(), months, 'the filter does not move the axis');
  assert.ok(await main.locator('[data-chart="point"]').count() < dots, 'the dots follow the filter');
  assert.equal(await main.locator('[data-breach] [data-kind]:not([data-kind="ransomware"])').count(), 0);
  await main.getByRole('button', { name: 'All', exact: true }).first().click();
  // The search finds a name, and says so when nothing matches.
  await main.locator('[data-breaches="query"]').fill('タイムズ');
  assert.equal(await cards.count(), 1);
  await main.locator('[data-breaches="query"]').fill('ぬるぽがっ');
  assert.equal(await cards.count(), 0);
  await main.getByText('No incidents match.').waitFor();
  await main.locator('[data-breaches="query"]').fill('');
  // How well an entry was checked is shown on it, and can be filtered: "official" is a part of the list, and each entry names at least one source.
  const total = await cards.count();
  await main.locator('button[data-verify="official"]').click();
  const official = await cards.count();
  assert.ok(official > 0 && official < total, 'official is a part of the list');
  assert.equal(await main.locator('[data-breach] [data-verification]:not([data-verification="official"])').count(), 0);
  assert.equal(await main.locator('[data-breach]:not(:has([data-source-kind]))').count(), 0, 'every entry shows its sources');
  await main.getByRole('button', { name: 'All', exact: true }).last().click();
  for (const link of await main.locator('[data-breach] a').all()) {
    assert.match(await link.getAttribute('href'), /^https:\/\//);
    assert.match(await link.getAttribute('rel'), /noopener/);
  }
  console.log('PASS: breaches list, charts (months, dots, tooltips, table), sorting, filters, search, safe source links');
}
