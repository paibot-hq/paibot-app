import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overview, counts, listed, inForce, staleDays, mapUrls, KINDS, kindName, severity, warningPageUrl } from './warnings.ts';
import { PREFECTURES, GRID } from './prefectures.ts';

// Shapes as the Agency writes them since 28 May 2026 (trimmed): reports of one kind each (the dataTypeCode), for each office; the districts
// are the first kind of area (class10Items), the municipalities the second (class20Items, not used).
const area = {
  class10s: { '011000': { name: '宗谷地方', enName: 'Soya', parent: '011000' }, '130010': { name: '東京地方', enName: 'Tokyo Region', parent: '130000' }, '130020': { name: '伊豆諸島北部', enName: 'Northern Izu Islands', parent: '130000' }, '130030': { name: '伊豆諸島南部', parent: '130000' }, '130040': { name: '小笠原諸島', parent: '130000' }, '270000': { name: '大阪府', enName: 'Osaka Prefecture', parent: '270000' }, '400010': { name: '福岡地方', parent: '400000' }, '471010': { name: '沖縄本島中南部', enName: 'Central and Southern Okinawa', parent: '471000' }, '472000': { name: '大東島地方', parent: '472000' } },
};
const towns = [{ areaCode: '0110000', kinds: [{ code: '14', status: '発表' }] }];
const none = { status: '発表警報・注意報はなし' };
const report = (type, stamp, items) => ({ controlDatetime: stamp, reportDatetime: stamp.replace('Z', '+00:00'), dataTypeCode: type, infoType: '発表', warning: { class10Items: items.map(([areaCode, ...kinds]) => ({ areaCode, kinds })), class20Items: towns } });
const reports = [
  report('VPWW58', '2026-10-01T00:00:00Z', [['011000', { code: '15', status: '解除' }]]),                  // an older wind report, replaced by the next
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
const by = states => Object.fromEntries(states.map(s => [s.code, s]));

test('only warnings in force count: issued, continuing and lowered to a lesser one; not lifted, none issued, or unknown codes', () => {
  assert.deepEqual(inForce([{ code: '14', status: '発表' }, { code: '15', status: '継続' }, { code: '16', status: '警報から注意報' }, { code: '20', status: '解除' }, { code: '99', status: '発表' }, none]).map(w => w.code), ['14', '15', '16']);
  assert.deepEqual(inForce(undefined), []);
  assert.deepEqual(inForce([{ code: '14', status: '発表' }, { code: '33', status: '発表' }, { code: '03', status: '継続' }, { code: '43', status: '発表' }]).map(w => w.code), ['33', '43', '03', '14'], 'emergency, urgent, warning, advisory');
});

test('the 47 prefectures come out in order, each with a state; those the file does not mention are unknown', () => {
  const states = overview(reports, area);
  assert.equal(states.length, 47);
  assert.deepEqual(states.map(s => s.code), PREFECTURES.map(p => p.code));
  const named = by(states);
  assert.equal(named['40'].level, 'special');
  assert.equal(named['27'].level, 'urgent');
  assert.equal(named['13'].level, 'warning');
  assert.equal(named['01'].level, 'advisory');
  assert.equal(named['47'].level, 'advisory', 'Okinawa has two offices; both count');
  assert.equal(named['23'].level, 'unknown');
  assert.deepEqual(named['23'].areas, []);
});

test('the reports of an office, one for each kind, add up: the newest of each kind, all kinds together', () => {
  const tokyo = by(overview(reports, area))['13'];
  assert.deepEqual(tokyo.areas.map(a => [a.code, a.level, a.warnings.map(w => w.code)]), [
    ['130030', 'warning', ['07', '15']], ['130010', 'advisory', ['15', '16']], ['130020', 'advisory', ['16']], ['130040', 'advisory', ['16']],
  ]);
  const hokkaido = by(overview(reports, area))['01'];
  assert.deepEqual(hokkaido.warnings.map(w => w.code), ['14', '15'], 'the old lifted wind report is replaced by the newer one; the lifted fog is not counted');
  assert.deepEqual(by(overview([...reports].reverse(), area))['01'].warnings.map(w => w.code), ['14', '15'], 'the order of the reports does not matter');
});

test('a prefecture\'s warnings are the kinds in force anywhere in it, strongest first, with how many districts', () => {
  const named = by(overview(reports, area));
  assert.deepEqual(named['13'].warnings.map(w => [w.code, w.level, w.areas]), [['07', 'warning', 1], ['16', 'advisory', 3], ['15', 'advisory', 2]], 'by strength, then by how many districts');
  assert.deepEqual(named['27'].warnings.map(w => [w.code, w.level]), [['43', 'urgent'], ['29', 'advisory']]);
  assert.deepEqual(named['40'].warnings.map(w => w.code), ['33']);
  assert.deepEqual(named['47'].warnings.map(w => w.code), ['16', '29']);
});

test('the districts have their names, English where there is one; the municipalities are not listed', () => {
  const named = by(overview(reports, area));
  assert.equal(named['13'].areas.find(a => a.code === '130010').enName, 'Tokyo Region');
  assert.equal(named['13'].areas.find(a => a.code === '130030').enName, '伊豆諸島南部', 'the Japanese name stands in when there is no English one');
  assert.equal(named['01'].areas.length, 1);
  assert.equal(named['47'].areas.length, 2);
  assert.deepEqual(named['47'].areas.map(a => a.name).sort(), ['大東島地方', '沖縄本島中南部'].sort());
});

test('the report time of a prefecture is the latest of its reports; unknown districts keep their codes', () => {
  const named = by(overview(reports, area));
  assert.equal(named['13'].reported.toISOString(), '2026-10-06T07:02:00.000Z');
  assert.equal(named['47'].reported.toISOString(), '2026-10-06T06:00:00.000Z');
  assert.equal(named['23'].reported, null);
  const loose = overview([{ reportDatetime: 'nonsense', dataTypeCode: 'VPWW58', warning: { class10Items: [{ areaCode: '270000', kinds: [{ code: '14', status: '発表' }] }, { areaCode: '270099', kinds: [] }] } }], area);
  assert.equal(by(loose)['27'].reported, null);
  assert.equal(by(loose)['27'].areas.find(a => a.code === '270099').name, '270099');
  assert.equal(by(loose)['27'].level, 'advisory');
});

test('without data every prefecture is unknown; with only quiet districts it is "none"; reports without areas say nothing', () => {
  assert.ok(overview(null, null).every(s => s.level === 'unknown'));
  assert.ok(overview([], area).every(s => s.level === 'unknown'));
  const quiet = overview([report('VPWW58', '2026-10-06T00:00:00Z', [['270000', none]])], area);
  assert.equal(by(quiet)['27'].level, 'none');
  assert.deepEqual(by(quiet)['27'].warnings, []);
  assert.equal(overview([{ dataTypeCode: 'VPWW58', warning: { class10Items: [] } }, {}], area).filter(s => s.level !== 'unknown').length, 0);
});

test('counting and listing: by level, the strongest first, with the "warning or more" and "advisory or more" views', () => {
  const states = overview(reports, area);
  assert.deepEqual(counts(states), { special: 1, urgent: 1, warning: 1, advisory: 2, none: 0, unknown: 42 });
  assert.deepEqual(listed(states, 'warning').map(s => s.code), ['40', '27', '13']);
  assert.deepEqual(listed(states, 'advisory').map(s => s.code), ['40', '27', '13', '01', '47']);
  assert.equal(listed(states, 'all').length, 47);
  assert.equal(listed(states, 'all')[0].code, '40');
  assert.equal(listed(states, 'all').at(-1).level, 'unknown');
});

test('the data is flagged as stale when the newest report is two days old or more', () => {
  const states = overview(reports, area);
  assert.equal(staleDays(states, new Date('2026-10-06T12:00:00+09:00')), 0);
  assert.equal(staleDays(states, new Date('2026-10-07T12:00:00+09:00')), 0);
  assert.equal(staleDays(states, new Date('2026-10-08T17:00:00+09:00')), 2);
  assert.equal(staleDays(states, new Date('2026-10-13T17:00:00+09:00')), 7);
  assert.equal(staleDays(overview(null, null), new Date()), 0);
});

test('the map file is looked for in this year\'s folder, then 2026\'s; the old file that stopped on 28 May 2026 is not used', () => {
  assert.deepEqual(mapUrls(2026), ['https://www.jma.go.jp/bosai/warning/data/r8/map.json']);
  assert.deepEqual(mapUrls(2027), ['https://www.jma.go.jp/bosai/warning/data/r9/map.json', 'https://www.jma.go.jp/bosai/warning/data/r8/map.json']);
  for (const year of [2026, 2027, 2030]) assert.ok(mapUrls(year).every(url => !url.includes('/warning/map.json')));
});

test('every kind has a level and names in three languages, and the codes are grouped as the Agency groups them', () => {
  for (const [code, k] of Object.entries(KINDS)) { assert.match(code, /^\d\d$/); for (const key of ['ja', 'en', 'zh']) assert.ok(k[key].length > 1, `${code} ${key}`); }
  for (const code of ['02', '03', '04', '05', '06', '07', '08', '09']) assert.equal(KINDS[code].level, 'warning', code);
  for (const code of ['43', '48', '49']) assert.equal(KINDS[code].level, 'urgent', code);
  for (const code of ['32', '33', '35', '36', '37', '38', '39']) assert.equal(KINDS[code].level, 'special', code);
  for (const code of ['10', '14', '15', '20', '21', '24', '29']) assert.equal(KINDS[code].level, 'advisory', code);
  assert.equal(kindName('43', 'ja'), '大雨危険警報'); assert.equal(kindName('49', 'en'), 'Landslide Urgent Warning'); assert.equal(kindName('29', 'zh'), '土砂灾害注意报'); assert.equal(kindName('99', 'ja'), '99');
  for (const code of ['43', '48', '49']) assert.ok(KINDS[code].ja.includes('危険警報'));
  assert.ok(severity('special') > severity('urgent') && severity('urgent') > severity('warning') && severity('warning') > severity('advisory') && severity('advisory') > severity('none') && severity('none') > severity('unknown'));
});

test('the tile map has a place for each prefecture, none shared, inside the grid, and names in three languages', () => {
  assert.equal(PREFECTURES.length, 47);
  assert.equal(new Set(PREFECTURES.map(p => `${p.col},${p.row}`)).size, 47);
  assert.deepEqual(PREFECTURES.map(p => p.code), Array.from({ length: 47 }, (_, i) => String(i + 1).padStart(2, '0')));
  for (const p of PREFECTURES) {
    assert.ok(p.col >= 0 && p.col < GRID.cols && p.row >= 0 && p.row < GRID.rows, p.code);
    for (const key of ['ja', 'en', 'zh', 'shortJa', 'shortEn', 'shortZh']) assert.ok(p[key].length > 0, `${p.code} ${key}`);
  }
  const at = code => PREFECTURES.find(p => p.code === code);
  assert.ok(at('01').row < at('13').row && at('13').row < at('47').row, 'north is up');
  assert.ok(at('13').col > at('27').col && at('27').col > at('40').col, 'east is right');
  assert.match(warningPageUrl('1310100'), /^https:\/\/www\.jma\.go\.jp\/bosai\/warning\/#area_type=class20s&area_code=1310100$/);
});
