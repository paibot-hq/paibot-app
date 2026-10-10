// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('breaches');
  const cards = main.locator('[data-breach]');
  const columns = main.locator('[data-chart="column"]');
  const dotsOf = () => main.locator('[data-chart="point"]');

  // The list is the first tab, with the incidents newest first and no charts.
  assert.ok(await cards.count() >= 60, 'the incidents are listed');
  assert.equal(await main.locator('[data-chart="root"]').count(), 0, 'no charts on the list tab');
  assert.equal(await cards.first().getAttribute('data-breach'), 'bookoff', 'newest first');
  await main.getByRole('button', { name: 'Most records', exact: true }).click();
  assert.equal(await cards.first().getAttribute('data-breach'), 'gyazo', 'largest first');

  // The explanations of the labels are folded away, and open on request.
  const help = main.locator('[data-breaches="help"]');
  assert.equal(await help.evaluate(el => el.open), false, 'folded at first');
  await help.locator('summary').click();
  assert.equal(await help.evaluate(el => el.open), true);
  assert.match(await help.innerText(), /外部からの攻撃|Attack from outside/);
  await help.locator('summary').click();

  // A type narrows the list to it.
  const all = await cards.count();
  await main.locator('button[data-kind="ransomware"]').click();
  const ransomware = await cards.count();
  assert.ok(ransomware > 0 && ransomware < all, 'ransomware is a part of the list');
  assert.equal(await main.locator('[data-breach] [data-kind]:not([data-kind="ransomware"])').count(), 0);

  // The statistics are a tab of their own, the address keeps it, and they follow the filters: a column for every month (the axis does not move), a
  // dot for every incident with a published count, a tooltip on hover and on keyboard focus, and a table with the same numbers.
  await main.locator('[data-breaches="tab-stats"]').click();
  assert.match(page.url(), /tab=stats/);
  assert.equal(await cards.count(), 0, 'no list on the statistics tab');
  const months = await columns.count();
  assert.ok(months >= 9, 'a column for each month so far');
  const ransomwareDots = await dotsOf().count();
  await main.getByRole('button', { name: 'All', exact: true }).first().click();
  const dots = await dotsOf().count();
  assert.ok(dots >= 40 && ransomwareDots < dots, 'a dot for each incident with a count, fewer under a filter');
  assert.equal(await columns.count(), months, 'the filter does not move the axis');
  await columns.last().hover();
  await main.locator('[data-chart="tip"]').waitFor();
  assert.match(await main.locator('[data-chart="tip"]').innerText(), /2026/);
  await dotsOf().first().focus();
  assert.match(await main.locator('[data-chart="tip"]').last().innerText(), /2026-/);
  await main.locator('[data-chart="root"] summary').click();
  assert.equal(await main.locator('[data-chart="root"] tbody tr').count(), months, 'the table has the same months');

  // A reload keeps the tab; the list is back with its own tab.
  await page.reload();
  await main.locator('[data-chart="root"]').waitFor();
  await main.locator('[data-breaches="tab-list"]').click();
  assert.doesNotMatch(page.url(), /tab=/);
  assert.ok(await cards.count() >= 60);

  // The search finds a name, and says so when nothing matches.
  await main.locator('[data-breaches="query"]').fill('タイムズ');
  assert.equal(await cards.count(), 1);
  await main.locator('[data-breaches="query"]').fill('ぬるぽがっ');
  assert.equal(await cards.count(), 0);
  await main.getByText('No incidents match.').waitFor();
  await main.locator('[data-breaches="query"]').fill('');

  // Where an incident came from: what is not an attack is a part of the list, each says why, and an attack (ransomware) is never among them.
  await main.locator('button[data-origin="mistake"]').click();
  const mistakes = await cards.count();
  assert.ok(mistakes >= 10 && mistakes < 40, 'incidents that are not attacks');
  assert.equal(await cards.locator('[data-breaches="origin-basis"]').count(), mistakes, 'each says why');
  assert.equal(await main.locator('[data-breach] [data-kind="ransomware"]').count(), 0, 'a ransomware is never "not an attack"');
  await main.locator('button[data-origin="insider"]').click();
  assert.ok(await cards.count() >= 2, 'insiders');
  assert.match(await cards.first().locator('[data-breaches="origin-basis"]').innerText(), /内部不正/);
  await main.locator('button[data-origin="attack"]').click();
  assert.equal(await main.locator('[data-breaches="origin-basis"]').count(), 0, 'an attack has no such note');
  assert.ok(await cards.count() > 80, 'most incidents are attacks');
  await main.getByRole('button', { name: 'All', exact: true }).nth(1).click();

  // How well an entry was checked is shown on it, and can be filtered: "official" is a part of the list, and each entry names at least one source.
  const total = await cards.count();
  await main.locator('button[data-verify="official"]').click();
  const official = await cards.count();
  assert.ok(official > 0 && official < total, 'official is a part of the list');
  assert.equal(await main.locator('[data-breach] [data-verification]:not([data-verification="official"])').count(), 0);
  assert.equal(await main.locator('[data-breach]:not(:has([data-source-kind]))').count(), 0, 'every entry shows its sources');
  await main.getByRole('button', { name: 'All', exact: true }).nth(2).click();
  for (const link of await main.locator('[data-breach] a').all()) {
    assert.match(await link.getAttribute('href'), /^https:\/\//);
    assert.match(await link.getAttribute('rel'), /noopener/);
  }
  console.log('PASS: breaches list and statistics tabs (charts, tooltips, table), sorting, filters, search, safe source links');
}
