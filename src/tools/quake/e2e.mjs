// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview. The Agency's files are answered by a stub (shapes as the
// real ones), and the clock is set, so the numbers are known.
import assert from 'node:assert/strict';

const base = { ser: '1', ift: '発表', int: [] };
const LIST = [
  { ...base, ctt: '20261005120000', eid: 'strong', rdt: '2026-10-05T12:00:00+09:00', ttl: '震源・震度情報', at: '2026-10-05T11:55:00+09:00', anm: '福島県沖', en_anm: 'Off the Coast of Fukushima Prefecture', cod: '+37.3+141.6-40000/', mag: '6.1', maxi: '5+', json: 'strong.json' },
  { ...base, ctt: '20261005130500', eid: 'three', rdt: '2026-10-05T13:05:00+09:00', ttl: '震源・震度情報', at: '2026-10-05T13:00:00+09:00', anm: '千葉県北西部', en_anm: 'Northwestern Chiba Prefecture', cod: '+35.7+140.0-70000/', mag: '3.3', maxi: '3', json: 'three.json' },
  { ...base, ctt: '20261005133500', eid: 'one', rdt: '2026-10-05T13:35:00+09:00', ttl: '震源・震度情報', at: '2026-10-05T13:30:00+09:00', anm: '熊本県熊本地方', en_anm: 'Kumamoto Region, Kumamoto Prefecture', cod: '+32.8+130.8-10000/', mag: '2.0', maxi: '1', json: 'one.json' },
  { ...base, ctt: '20261002174234', eid: 'hypo', rdt: '2026-10-02T17:42:00+09:00', ttl: '震源に関する情報', at: '2026-10-02T17:39:00+09:00', anm: '熊本県熊本地方', en_anm: 'Kumamoto Region,  Kumamoto Prefecture', cod: '+32.6+130.7+0/', mag: '3.1', maxi: '', json: 'hypo.json' },
  { ...base, ctt: '20260929054000', eid: 'four', rdt: '2026-09-29T04:54:00+09:00', ttl: '震源・震度情報', at: '2026-09-29T04:45:00+09:00', anm: '茨城県南部', en_anm: 'Southern Ibaraki Prefecture', cod: '+36.1+139.9-50000/', mag: '4.9', maxi: '4', json: 'four.json' },
  { ...base, ctt: '20261003101010', eid: 'far', rdt: '2026-10-03T10:10:00+09:00', ttl: '遠地地震に関する情報', at: '2026-10-03T09:00:00+09:00', anm: 'フィリピン諸島', cod: '+10.0+125.0-30000/', mag: '6.8', maxi: '', json: 'far.json' },
  { ...base, ctt: '20261005120100', eid: 'strong', rdt: '2026-10-05T12:01:00+09:00', ttl: '震度速報', at: '2026-10-05T11:55:00+09:00', anm: '', cod: '', mag: '', maxi: '5+', json: 'quick.json' },
];
const DETAIL = {
  Head: { Headline: { Information: [{ Item: [
    { Kind: { Name: '震度５強' }, Areas: { Area: [{ Name: '福島県中通り' }, { Name: '宮城県南部' }] } },
    { Kind: { Name: '震度４' }, Areas: { Area: [{ Name: '茨城県北部' }] } },
  ] }] } },
  Body: { Comments: { ForecastComment: { Text: 'この地震による津波の心配はありません。', enText: 'This earthquake poses no tsunami risk.\n' } } },
};

// A weak earthquake: no areas in the headline, so they come from the observations.
const WEAK = { Head: { Headline: { Text: '５日１３時３０分ころ、地震がありました。' } }, Body: { Intensity: { Observation: { MaxInt: '1', Pref: [{ Name: '熊本県', Area: [{ Name: '熊本県熊本地方', enName: 'Kumamoto Chiho', MaxInt: '1' }] }] } }, Comments: { ForecastComment: { Text: 'この地震による津波の心配はありません。', enText: 'This earthquake poses no tsunami risk.\n' } } } };

export default async function ({ page, main, go, base: origin }) {
  let listStatus = 200;
  const requested = [];
  await page.route('https://www.jma.go.jp/bosai/quake/data/**', route => {
    const url = route.request().url();
    requested.push(url);
    const cors = { 'access-control-allow-origin': '*' };
    if (url.endsWith('/list.json')) return listStatus === 200 ? route.fulfill({ json: LIST, headers: cors }) : route.fulfill({ status: listStatus, body: 'error', headers: cors });
    if (url.endsWith('/strong.json')) return route.fulfill({ json: DETAIL, headers: cors });
    if (url.endsWith('/one.json')) return route.fulfill({ json: WEAK, headers: cors });
    return route.fulfill({ status: 404, body: 'none', headers: cors });
  });
  await page.clock.install({ time: new Date('2026-10-05T14:00:00+09:00') });
  await go('quake');
  const rows = main.locator('[data-quake-id]');
  await page.waitForFunction(() => document.querySelectorAll('[data-quake-id]').length > 0);
  // One row for each earthquake (the latest report), the overseas one hidden, the preliminary bulletin not counted.
  assert.equal(await rows.count(), 5);
  assert.deepEqual(await rows.evaluateAll(list => list.map(row => row.dataset.quakeId)), ['one', 'three', 'strong', 'hypo', 'four'], 'newest earthquake first');
  // The last 24 hours (to 14:00): three earthquakes, two of intensity 3 or more, and the strongest is named.
  const summary = await main.locator('[data-quake="summary"]').innerText();
  assert.match(summary, /^3\b/, summary);
  assert.match(summary, /\n2\b/, summary);
  assert.match(summary, /Strongest: Off the Coast of Fukushima Prefecture/);
  // Filters: intensity 4 or higher leaves two; with overseas and everything, six.
  await main.getByRole('button', { name: 'Intensity 4 or higher' }).click();
  assert.equal(await rows.count(), 2);
  await main.getByRole('button', { name: 'All', exact: true }).click();
  await main.getByRole('button', { name: 'Show overseas earthquakes' }).click();
  assert.equal(await rows.count(), 6);
  await main.getByRole('button', { name: 'Show overseas earthquakes' }).click();
  // A row opens to show the areas by intensity and the comment on a tsunami (the detail file is fetched then).
  await main.locator('[data-quake-id="strong"] button').first().click();
  await main.getByText('Fukushima Prefecture', { exact: false }).first().waitFor();
  await page.waitForFunction(() => /This earthquake poses no tsunami risk/.test(document.querySelector('[data-quake-id="strong"]').textContent));
  assert.match(await main.locator('[data-quake-id="strong"]').innerText(), /福島県中通り, 宮城県南部/);
  assert.ok(requested.some(url => url.endsWith('/strong.json')));
  // A weak one has its areas from the observations, in English here.
  await main.locator('[data-quake-id="one"] button').first().click();
  await main.getByText('Kumamoto Chiho').waitFor();
  // One whose detail cannot be read says so.
  await main.locator('[data-quake-id="three"] button').first().click();
  await main.getByText('The details could not be loaded.').waitFor();
  // The map is drawn.
  const painted = await main.locator('canvas').evaluate(canvas => { const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height); const [r, g, b] = data; let n = 0; for (let i = 0; i < data.length; i += 4) if (Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b) > 40) n++; return n; });
  assert.ok(painted > 2000, `the map is drawn (${painted})`);
  // When the Agency's list cannot be had, the page says so and can try again.
  listStatus = 503;
  await page.reload();
  await main.getByRole('alert').waitFor();
  assert.match(await main.getByRole('alert').innerText(), /could not be loaded/);
  listStatus = 200;
  await main.locator('[data-quake="retry"]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-quake-id]').length === 5);
  await main.getByRole('alert').waitFor({ state: 'detached' });
  // The page's security policy lets the page read the Agency's files.
  const csp = (await page.request.get(`${origin}/en/quake`)).headers()['content-security-policy'];
  assert.match(csp, /connect-src [^;]*https:\/\/www\.jma\.go\.jp/);
  console.log('PASS: quake: one row for each earthquake, the 24-hour summary, filters, details with areas and the tsunami comment, the map, a failed load and a retry, the CSP');
}
