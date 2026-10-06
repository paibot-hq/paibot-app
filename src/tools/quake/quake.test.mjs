import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCoordinate, parseEntry, parseList, rank, filter, last24h, ago, intensityLabel, project, onMap, MAP_ASPECT, parseDetail, INTENSITIES, COLORS, parseIntensity } from './quake.ts';

// Real reports from the Agency's list (trimmed), and the shapes they come in.
const report = { ctt: '20260929054000', eid: '20260929044513', rdt: '2026-09-29T04:54:00+09:00', ttl: '震源・震度情報', ser: '2', at: '2026-09-29T04:45:00+09:00', anm: '茨城県南部', cod: '+36.1+139.9-50000/', mag: '4.9', maxi: '4', json: 'b_VXSE5k_2.json', en_anm: 'Southern Ibaraki Prefecture' };
const earlier = { ...report, ctt: '20260929044917', ser: '1', mag: '4.8', json: 'a_VXSE5k_1.json' };
const quick = { ctt: '20260929044743', eid: '20260929044513', ttl: '震度速報', at: '2026-09-29T04:45:00+09:00', anm: '', cod: '', mag: '', maxi: '4', json: 'q.json' };
const hypocentre = { ctt: '20261002174234', eid: '20261002173952', rdt: '2026-10-02T17:42:00+09:00', ttl: '震源に関する情報', at: '2026-10-02T17:39:00+09:00', anm: '熊本県熊本地方', cod: '+32.6+130.7+0/', mag: '3.1', maxi: '', json: 'h.json', en_anm: 'Kumamoto Region,  Kumamoto Prefecture' };
const far = { ctt: '20261003101010', eid: '20261003090000', ttl: '遠地地震に関する情報', at: '2026-10-03T09:00:00+09:00', anm: 'フィリピン諸島', cod: '+10.0+125.0-30000/', mag: '6.8', maxi: '', json: 'f.json' };
const strong = { ctt: '20261005120000', eid: '20261005115500', rdt: '2026-10-05T12:00:00+09:00', ttl: '震源・震度情報', at: '2026-10-05T11:55:00+09:00', anm: '福島県沖', cod: '+37.3+141.6-40000/', mag: '6.1', maxi: '5+', json: 's.json' };

test('coordinates: latitude, longitude and depth, with the surface and a missing depth', () => {
  assert.deepEqual(parseCoordinate('+36.1+139.9-50000/'), { lat: 36.1, lon: 139.9, depthKm: 50 });
  assert.deepEqual(parseCoordinate('+32.6+130.7+0/'), { lat: 32.6, lon: 130.7, depthKm: 0 });
  assert.deepEqual(parseCoordinate('+25.1+123.4-150000/'), { lat: 25.1, lon: 123.4, depthKm: 150 });
  assert.deepEqual(parseCoordinate('-10.0-65.5/'), { lat: -10, lon: -65.5, depthKm: null });
  assert.equal(parseCoordinate(''), null);
  assert.equal(parseCoordinate(undefined), null);
  assert.equal(parseCoordinate('nonsense'), null);
});

test('an entry takes the place, magnitude, depth, intensity and time; the English place has its spaces tidied', () => {
  const e = parseEntry(report);
  assert.equal(e.place, '茨城県南部'); assert.equal(e.magnitude, 4.9); assert.equal(e.depthKm, 50); assert.equal(e.intensity, '4'); assert.equal(e.kind, 'report');
  assert.equal(e.at.toISOString(), '2026-09-28T19:45:00.000Z');
  assert.equal(e.placeEn, 'Southern Ibaraki Prefecture');
  assert.equal(parseEntry(hypocentre).placeEn, 'Kumamoto Region, Kumamoto Prefecture');
  const h = parseEntry(hypocentre);
  assert.equal(h.intensity, null); assert.equal(h.kind, 'hypocenter'); assert.equal(h.depthKm, 0);
  assert.equal(parseEntry(far).kind, 'overseas');
  assert.equal(parseEntry({ ...report, mag: 'Ｍ不明' }).magnitude, null);
  assert.equal(parseEntry({ ...report, mag: '' }).magnitude, null);
});

test('the preliminary intensity bulletin and other kinds are left out, and so are broken entries', () => {
  assert.equal(parseEntry(quick), null);
  assert.equal(parseEntry({ ...report, ttl: '南海トラフ地震関連解説情報' }), null);
  assert.equal(parseEntry({ ...report, at: 'not a date' }), null);
  assert.equal(parseEntry({ ...report, eid: undefined }), null);
  assert.equal(parseEntry({}), null);
});

test('a list has one entry for each earthquake: its latest report, newest quake first', () => {
  const list = parseList([earlier, quick, hypocentre, report, strong, far]);
  assert.deepEqual(list.map(e => e.id), ['20261005115500', '20261003090000', '20261002173952', '20260929044513']);
  assert.equal(list.find(e => e.id === '20260929044513').magnitude, 4.9, 'the later report (4.9) wins over the earlier one (4.8)');
  assert.deepEqual(parseList([]), []);
  assert.deepEqual(parseList([report, report]).length, 1);
});

test('the scale of intensity is in order, and labels read as the Agency writes them', () => {
  assert.deepEqual(INTENSITIES.map(i => rank(i)), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(rank(null), 0);
  assert.equal(parseIntensity('5-'), '5-'); assert.equal(parseIntensity(''), null); assert.equal(parseIntensity('8'), null);
  assert.equal(intensityLabel('5-', 'ja'), '5弱'); assert.equal(intensityLabel('6+', 'ja'), '6強'); assert.equal(intensityLabel('3', 'ja'), '3');
  assert.equal(intensityLabel('5+', 'en'), '5 upper'); assert.equal(intensityLabel('6-', 'en'), '6 lower');
  assert.equal(intensityLabel('5+', 'zh'), '5强'); assert.equal(intensityLabel('5-', 'zh'), '5弱');
  for (const i of INTENSITIES) assert.match(COLORS[i].fill, /^#[0-9a-f]{6}$/);
});

test('filtering by intensity, with the overseas earthquakes only when asked for', () => {
  const list = parseList([report, hypocentre, strong, far]);
  assert.equal(filter(list, { minIntensity: null, overseas: false }).length, 3);
  assert.equal(filter(list, { minIntensity: null, overseas: true }).length, 4);
  assert.deepEqual(filter(list, { minIntensity: '4', overseas: false }).map(e => e.id), ['20261005115500', '20260929044513']);
  assert.deepEqual(filter(list, { minIntensity: '5-', overseas: true }).map(e => e.id), ['20261005115500']);
  assert.equal(filter(list, { minIntensity: '6-', overseas: true }).length, 0);
});

test('the last 24 hours: how many, how many felt at 3 or more, and the strongest', () => {
  const now = new Date('2026-10-05T14:00:00+09:00');
  const list = parseList([report, hypocentre, strong, far, { ...report, eid: 'x1', at: '2026-10-05T13:00:00+09:00', maxi: '3', mag: '3.3', json: 'x1.json' }, { ...report, eid: 'x2', at: '2026-10-05T13:30:00+09:00', maxi: '1', mag: '2.0', json: 'x2.json' }]);
  const s = last24h(list, now);
  assert.equal(s.total, 3);
  assert.equal(s.felt3, 2);
  assert.equal(s.strongest.id, '20261005115500');
  assert.deepEqual(last24h([], now), { total: 0, felt3: 0, strongest: null });
  assert.equal(last24h(list, new Date('2026-10-07T00:00:00+09:00')).total, 0);
});

test('how long ago: minutes, then hours, then days', () => {
  const now = new Date('2026-10-05T12:00:00Z');
  assert.deepEqual(ago(now, new Date('2026-10-05T11:55:00Z')), { unit: 'minutes', value: 5 });
  assert.deepEqual(ago(now, new Date('2026-10-05T11:00:00Z')), { unit: 'hours', value: 1 });
  assert.deepEqual(ago(now, new Date('2026-10-05T01:30:00Z')), { unit: 'hours', value: 10 });
  assert.deepEqual(ago(now, new Date('2026-10-02T12:00:00Z')), { unit: 'days', value: 3 });
  assert.deepEqual(ago(now, new Date('2026-10-05T12:05:00Z')), { unit: 'minutes', value: 0 });
});

test('the map: the corners, an epicentre, and what is on it', () => {
  assert.deepEqual(project(46, 122, 400, 380), { x: 0, y: 0 });
  assert.deepEqual(project(24, 150, 400, 380), { x: 400, y: 380 });
  const tokyo = project(35.7, 139.7, 1000, 900);
  assert.ok(tokyo.x > 600 && tokyo.x < 700 && tokyo.y > 400 && tokyo.y < 500);
  assert.ok(project(36, 139, 100, 100).y < project(34, 139, 100, 100).y, 'north is up');
  assert.ok(MAP_ASPECT > 0.9 && MAP_ASPECT < 1.2);
  assert.equal(onMap(35, 139), true); assert.equal(onMap(10, 125), false); assert.equal(onMap(35, 160), false);
});

test('a detail file: the areas by intensity, in the order given, and the comment on a tsunami', () => {
  const detail = {
    Head: { Headline: { Information: [{ Item: [
      { Kind: { Name: '震度５強' }, Areas: { Area: [{ Name: '福島県中通り' }, { Name: '宮城県南部' }] } },
      { Kind: { Name: '震度４' }, Areas: { Area: [{ Name: '茨城県北部' }] } },
      { Kind: { Name: '震度５弱' }, Areas: { Area: [{ Name: '福島県浜通り' }] } },
      { Kind: { Name: 'その他' }, Areas: { Area: [{ Name: '無視' }] } },
    ] }, { Item: [{ Kind: { Name: '震度４' }, Areas: { Area: [{ Name: '郡山市' }] } }] }] } },
    Body: { Comments: { ForecastComment: { Text: 'この地震による津波の心配はありません。', enText: 'This earthquake poses no tsunami risk.\n' } } },
  };
  const d = parseDetail(detail);
  assert.deepEqual(d.areas, [{ intensity: '5+', names: ['福島県中通り', '宮城県南部'], namesEn: null }, { intensity: '4', names: ['茨城県北部'], namesEn: null }, { intensity: '5-', names: ['福島県浜通り'], namesEn: null }]);
  assert.deepEqual(d.tsunami, { ja: 'この地震による津波の心配はありません。', en: 'This earthquake poses no tsunami risk.' });
  assert.deepEqual(parseDetail({ Body: { Comments: {} } }), { areas: [], tsunami: null });
  // A weak earthquake has no areas in its headline: they come from the observations, strongest first, with their English names.
  const weak = { Head: { Headline: { Text: '６日１０時４８分ころ、地震がありました。' } }, Body: { Intensity: { Observation: { MaxInt: '2', Pref: [
    { Name: '北海道', Area: [{ Name: '胆振地方中東部', enName: 'Iburi Chiho Chutobu', MaxInt: '1' }, { Name: '日高地方中部', enName: 'Hidaka Chiho Chubu', MaxInt: '2' }] },
    { Name: '青森県', Area: [{ Name: '青森県三八上北', MaxInt: '1' }, { Name: '不明', MaxInt: '' }] },
  ] } } } };
  assert.deepEqual(parseDetail(weak).areas, [{ intensity: '2', names: ['日高地方中部'], namesEn: ['Hidaka Chiho Chubu'] }, { intensity: '1', names: ['胆振地方中東部', '青森県三八上北'], namesEn: ['Iburi Chiho Chutobu', '青森県三八上北'] }]);
  assert.equal(parseDetail(null), null);
  assert.equal(parseDetail('x'), null);
});
