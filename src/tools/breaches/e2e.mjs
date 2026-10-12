// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export default async function ({ page, main, go }) {
  await go('breaches');
  // Both tabs are in the page (the one not shown is hidden), so "the incidents" are the ones that can be seen.
  const cards = main.locator('[data-breach]:visible');
  const columns = main.locator('[data-chart="column"]');
  const dotsOf = () => main.locator('[data-chart="point"]');

  // The summary at the top. Its numbers are worked out from the data, so they hold whatever the list holds today (it is updated every week).
  const data = JSON.parse(readFileSync(new URL('../../data/breaches.json', import.meta.url), 'utf8'));
  const countOf = test => data.items.filter(test).length;
  const dash = key => main.locator(`[data-dash="${key}"]`);
  assert.equal(await dash('total').textContent(), String(data.items.length));
  assert.equal(await dash('attack').textContent(), String(countOf(item => item.origin === 'attack')));
  assert.equal(await dash('official').textContent(), String(countOf(item => item.verification === 'official')));
  assert.equal(await dash('big').textContent(), String(countOf(item => item.count !== null && item.count >= 1_000_000)));
  for (const group of ['kind', 'origin', 'verify']) {
    const counts = await main.locator(`[data-dash-row^="${group}:"] strong`).allInnerTexts();
    assert.equal(counts.reduce((sum, n) => sum + Number(n), 0), data.items.length, `every incident is under one heading of "${group}"`);
  }
  assert.equal(await main.locator('[data-dash="root"] ol').count(), 2, 'the largest and the latest');
  assert.equal(await main.locator('[data-dash="root"] [data-chart]').count(), 0, 'the summary has no chart of its own');
  assert.equal(await main.locator('[data-breaches="tab-dashboard"]').getAttribute('aria-selected'), 'true', 'the dashboard is the first tab');
  assert.equal(await cards.count(), 0, 'the list is the other tab');

  // The statistics are on the dashboard, under the summary: a column for every month, a dot for every incident with a published count, a tooltip on
  // hover and on keyboard focus, and a table with the same numbers. They show the whole list.
  const months = await columns.count();
  assert.ok(months >= 9, 'a column for each month so far');
  assert.ok(await dotsOf().count() >= 40, 'a dot for each incident with a count');
  await columns.last().hover();
  await main.locator('[data-chart="tip"]').waitFor();
  assert.match(await main.locator('[data-chart="tip"]').innerText(), /2026/);
  await dotsOf().first().focus();
  assert.match(await main.locator('[data-chart="tip"]').last().innerText(), /2026-/);
  await main.locator('[data-chart="root"] summary').click();
  assert.equal(await main.locator('[data-chart="root"] tbody tr').count(), months, 'the table has the same months');

  // A row of the summary is a way into the list: it narrows the list to it, and the filter shows as pressed.
  await main.locator('[data-dash-row="kind:ransomware"]').click();
  assert.equal(await main.locator('[data-breaches="tab-list"]').getAttribute('aria-selected'), 'true', 'the list opens');
  assert.match(page.url(), /tab=list/);
  assert.equal(await cards.count(), countOf(item => item.type === 'ransomware'));
  assert.equal(await main.locator('button[data-kind="ransomware"]').getAttribute('aria-pressed'), 'true');
  await go('breaches');
  await main.locator('[data-dash-row="origin:mistake"]').click();
  assert.equal(await cards.count(), countOf(item => item.origin === 'mistake'));
  await go('breaches');
  // An incident of the "latest" list opens the list at that incident (a search for its name).
  const latest = main.locator('[data-dash="root"] ol').nth(1).locator('button').first();
  const name = await latest.locator('span[lang="ja"]').textContent();
  await latest.click();
  assert.ok(await main.locator('[data-breach] h2', { hasText: name }).count() >= 1, 'the incident is in the list');
  await go('breaches');

  // The list is the second tab, with the incidents newest first and no charts.
  await main.locator('[data-breaches="tab-list"]').click();
  assert.ok(await cards.count() >= 60, 'the incidents are listed');
  assert.equal(await main.locator('[data-chart="root"]:visible').count(), 0, 'no charts on the list tab');
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

  // The address keeps the list tab over a reload, and the dashboard is back with its own tab (the old ?tab=stats opens the dashboard too).
  await main.locator('button[data-kind="ransomware"]').click();
  await page.reload();
  await main.locator('[data-breaches="panel-list"]').waitFor();
  assert.equal(await main.locator('[data-breaches="tab-list"]').getAttribute('aria-selected'), 'true', 'a reload keeps the list tab');
  await main.getByRole('button', { name: 'All', exact: true }).first().click();
  await main.locator('[data-breaches="tab-dashboard"]').click();
  assert.doesNotMatch(page.url(), /tab=/);
  assert.ok(await main.locator('[data-chart="root"]:visible').count() === 1, 'the statistics are on the dashboard');
  assert.equal(await cards.count(), 0);
  await page.goto(`${page.url().split('?')[0]}?tab=stats`);
  assert.equal(await main.locator('[data-breaches="tab-dashboard"]').getAttribute('aria-selected'), 'true', 'an old link to the statistics opens the dashboard');
  await main.locator('[data-breaches="tab-list"]').click();
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
  console.log('PASS: breaches dashboard (summary, charts, tooltips, table) and list tabs, sorting, filters, search, safe source links');
}
