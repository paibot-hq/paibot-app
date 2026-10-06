// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. The Agency's files are answered by a stub (shapes as the real ones).
import assert from 'node:assert/strict';

const AREA = {
  class10s: { '011000': { name: '宗谷地方', enName: 'Soya', parent: '011000' }, '130010': { name: '東京地方', enName: 'Tokyo Region', parent: '130000' }, '130020': { name: '伊豆諸島北部', enName: 'Northern Izu Islands', parent: '130000' }, '130030': { name: '伊豆諸島南部', parent: '130000' }, '130040': { name: '小笠原諸島', enName: 'Ogasawara Islands', parent: '130000' }, '270000': { name: '大阪府', enName: 'Osaka Prefecture', parent: '270000' }, '400010': { name: '福岡地方', enName: 'Fukuoka Region', parent: '400000' }, '471010': { name: '沖縄本島中南部', enName: 'Central and Southern Okinawa', parent: '471000' }, '472000': { name: '大東島地方', enName: 'Daito Islands', parent: '472000' } },
};
// Reports as the Agency writes them since 28 May 2026: one kind each (the dataTypeCode) for each office; the districts are the first kind of area.
const towns = [{ areaCode: '0110000', kinds: [{ code: '14', status: '発表' }] }];
const none = { status: '発表警報・注意報はなし' };
const report = (type, stamp, items) => ({ controlDatetime: stamp, reportDatetime: stamp.replace('Z', '+00:00'), dataTypeCode: type, infoType: '発表', warning: { class10Items: items.map(([areaCode, ...kinds]) => ({ areaCode, kinds })), class20Items: towns } });
const MAP = [
  report('VPWW58', '2026-10-01T00:00:00Z', [['011000', { code: '15', status: '解除' }]]),
  report('VPWW58', '2026-10-06T00:48:00Z', [['011000', { code: '15', status: '発表' }]]),
  report('VPWW61', '2026-10-06T00:30:00Z', [['011000', { code: '14', status: '発表' }, { code: '20', status: '解除' }]]),
  report('VPWW58', '2026-10-06T07:02:00Z', [['130010', { code: '15', status: '発表' }], ['130020', none], ['130030', { code: '15', status: '継続' }], ['130040', { code: '15', status: '解除' }]]),
  report('VPWW59', '2026-10-06T07:02:00Z', [['130010', { code: '16', status: '発表' }], ['130020', { code: '16', status: '継続' }], ['130030', { code: '07', status: '継続' }], ['130040', { code: '16', status: '警報から注意報' }]]),
  report('VPWW55', '2026-10-06T05:00:00Z', [['270000', { code: '43', status: '発表' }]]),
  report('VPWW56', '2026-10-06T05:10:00Z', [['270000', { code: '29', status: '継続' }]]),
  report('VPWW55', '2026-10-06T03:00:00Z', [['400010', { code: '33', status: '発表' }]]),
  report('VPWW59', '2026-10-06T04:13:00Z', [['471010', { code: '16', status: '継続' }]]),
  report('VPWW56', '2026-10-06T06:00:00Z', [['472000', { code: '29', status: '発表' }]]),
];

export default async function ({ page, main, go }) {
  let status = 200, text = JSON.stringify(MAP);
  await page.route('https://www.jma.go.jp/bosai/**', route => {
    const url = route.request().url();
    const cors = { 'access-control-allow-origin': '*' };
    if (url.endsWith('/area.json')) return route.fulfill({ json: AREA, headers: cors });
    if (url.endsWith('/warning/data/r8/map.json')) return status === 200 ? route.fulfill({ body: text, contentType: 'application/json', headers: cors }) : route.fulfill({ status, body: 'error', headers: cors });
    return route.fulfill({ status: 404, body: '', headers: cors });
  });
  await page.clock.install({ time: new Date('2026-10-06T12:00:00+09:00') });
  await go('warnings');
  const level = code => main.locator(`[data-warnings="tiles"] [data-prefecture="${code}"]`).getAttribute('data-level');
  await page.waitForFunction(() => document.querySelector('[data-warnings="tiles"] [data-prefecture="40"]')?.dataset.level === 'special');
  // The tile map: 47 tiles, coloured by the strongest in each prefecture; the ones the file does not mention are unknown.
  assert.equal(await main.locator('[data-warnings="tiles"] [data-prefecture]').count(), 47);
  assert.deepEqual([await level('40'), await level('27'), await level('13'), await level('01'), await level('47'), await level('23')], ['special', 'urgent', 'warning', 'advisory', 'advisory', 'unknown']);
  // Counts of prefectures at each level, then the list, strongest first (advisories and up).
  const summary = await main.locator('[data-warnings="summary"]').innerText();
  assert.match(summary, /1\s+Emergency warning/); assert.match(summary, /1\s+Urgent warning/); assert.match(summary, /1\s+Warning/); assert.match(summary, /2\s+Advisory/);
  const order = () => main.locator('[data-warnings="list"] > li').evaluateAll(list => list.map(row => row.dataset.prefecture));
  assert.deepEqual(await order(), ['40', '27', '13', '01', '47']);
  await main.getByRole('button', { name: 'Warnings and up' }).click();
  assert.deepEqual(await order(), ['40', '27', '13']);
  await main.getByRole('button', { name: 'All', exact: true }).click();
  assert.equal((await order()).length, 47);
  await main.getByRole('button', { name: 'Advisories and up' }).click();
  // A row opens to its areas (in English here), the strongest first, each with its warnings; quiet ones say so.
  await main.locator('[data-warnings="list"] [data-prefecture="13"] button').first().click();
  const tokyo = await main.locator('[data-warnings="list"] [data-prefecture="13"]').innerText();
  assert.match(tokyo, /伊豆諸島南部[\s\S]*High Wave Warning[\s\S]*Strong Wind Advisory[\s\S]*Tokyo Region[\s\S]*High Wave Advisory/);
  assert.match(tokyo, /Ogasawara Islands[\s\S]*High Wave Advisory/, 'a warning lowered to an advisory is still in force');
  // A tile opens its prefecture, widening the list if it is not in it: Fukuoka is not in the file.
  await main.locator('[data-warnings="tiles"] [data-prefecture="23"]').click();
  await page.waitForFunction(() => document.querySelector('[data-warnings="list"] [data-prefecture="23"]'));
  assert.match(await main.locator('[data-warnings="list"] [data-prefecture="23"]').innerText(), /not in the Agency's data/);
  assert.equal(await main.locator('[data-warnings="tiles"] [data-prefecture="23"]').getAttribute('aria-pressed'), 'true');
  // Nothing stale yet; when the file's reports are days old, the page says so.
  assert.equal(await main.locator('[data-warnings="stale"]').count(), 0);
  text = JSON.stringify(MAP).replaceAll('2026-10-06', '2026-10-01');
  await page.reload();
  await main.locator('[data-warnings="stale"]').waitFor();
  assert.match(await main.locator('[data-warnings="stale"]').innerText(), /4 days or more/);
  // When the Agency's file cannot be had, the page says so and can try again.
  status = 503;
  await page.reload();
  await main.getByRole('alert').waitFor();
  assert.equal(await level('40'), 'unknown');
  status = 200; text = JSON.stringify(MAP);
  await main.locator('[data-warnings="retry"]').click();
  await page.waitForFunction(() => document.querySelector('[data-warnings="tiles"] [data-prefecture="40"]')?.dataset.level === 'special');
  await main.getByRole('alert').waitFor({ state: 'detached' });
  console.log('PASS: warnings: 47 tiles by strongest level (including the urgent warning), reports of several kinds added up, counts, the list and its filters, areas of a prefecture, a tile opening its row, stale data, a failed load and a retry');
}
