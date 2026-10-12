import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addDays, approximate, compact, decades, monthly, niceTicks, percent, records, summarize, timePosition } from './breaches-stats.ts';

const data = JSON.parse(readFileSync(new URL('../../data/breaches.json', import.meta.url), 'utf8'));
const item = (id, date, type = 'leak', count = null) => ({ id, name: id, date, type, count, countNote: '' });

test('months run from the first incident to the end, the quiet ones included, and every incident is counted once', () => {
  const months = monthly([item('a', '2026-01-08'), item('b', '2026-01'), item('c', '2026-04-02', 'ransomware')], '2026-05-20');
  assert.deepEqual(months.map(m => [m.key, m.total]), [['2026-01', 2], ['2026-02', 0], ['2026-03', 0], ['2026-04', 1], ['2026-05', 0]]);
  assert.equal(months[3].byType.ransomware, 1);
  assert.deepEqual(monthly([], '2026-05-01'), []);
  assert.deepEqual(monthly([item('c', '2026-04-02')], '2026-05-20', '2026-02-01').map(m => m.key), ['2026-02', '2026-03', '2026-04', '2026-05'], 'a given start fixes the axis');
  assert.equal(monthly([], '2026-03-01', '2026-01-01').length, 3, 'with nothing to show the months are still there');
});

test('across a year end the months continue', () => {
  assert.deepEqual(monthly([item('a', '2025-12-30'), item('b', '2026-02-01')], '2026-02-10').map(m => m.key), ['2025-12', '2026-01', '2026-02']);
});

test('the real list adds up: the months hold all of its incidents, by type', () => {
  const months = monthly(data.items, data.asOf);
  assert.equal(months.reduce((sum, m) => sum + m.total, 0), data.items.length);
  assert.equal(months.at(-1).key, data.asOf.slice(0, 7));
  for (const m of months) assert.equal(Object.values(m.byType).reduce((a, b) => a + b, 0), m.total);
});

test('a date with only the month goes to the middle of it; a full date to its day', () => {
  assert.equal(timePosition('2026-03'), 2026 * 12 + 2.5);
  assert.equal(timePosition('2026-03-01'), 2026 * 12 + 2);
  assert.ok(Math.abs(timePosition('2026-02-15') - (2026 * 12 + 1 + 14 / 28)) < 1e-9);
});

test('only incidents with a published count are on the record chart, in time order', () => {
  const points = records([item('a', '2026-05-01', 'leak', 10), item('b', '2026-01-01'), item('c', '2026-02-01', 'leak', 5)]);
  assert.deepEqual(points.map(p => p.id), ['c', 'a']);
});

test('axis ticks are round and few', () => {
  assert.deepEqual(niceTicks(7), [0, 2, 4, 6, 8]);
  assert.deepEqual(niceTicks(12, 4), [0, 5, 10, 15]);
  assert.deepEqual(niceTicks(0), [0, 1]);
  assert.deepEqual(decades(10, 1e4), [10, 100, 1000, 10000]);
});

test('big numbers are shortened the way each language writes them', () => {
  assert.equal(compact(1e4, 'ja'), '1万');
  assert.equal(compact(1e6, 'ja'), '100万');
  assert.equal(compact(1e8, 'zh'), '1亿');
  assert.equal(compact(1e8, 'en'), '100M');
  assert.equal(compact(1000, 'en'), '1K');
  assert.equal(compact(1000, 'ja'), '1,000');
});

// ---- the summary at the top of the page ----
const entry = (id, date, o = {}) => ({ id, name: id, date, type: 'leak', count: null, countNote: '', origin: 'attack', verification: 'reported', ...o });

test('dates move by days without the time zone getting in the way', () => {
  assert.equal(addDays('2026-10-12', -29), '2026-09-13');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('the summary counts each incident once under every heading', () => {
  const s = summarize([
    entry('a', '2026-10-10', { type: 'leak', count: 2_000_000, verification: 'official' }),
    entry('b', '2026-10-01', { type: 'ransomware', count: 999_999, origin: 'insider' }),
    entry('c', '2026-08-15', { type: 'fraud', origin: 'mistake', verification: 'single' }),
    entry('d', '2026-09', { type: 'other', count: 1_000_000 }),
  ], '2026-10-12');
  assert.equal(s.total, 4);
  assert.deepEqual(s.byKind, { leak: 1, ransomware: 1, outage: 0, fraud: 1, other: 1 });
  assert.deepEqual(s.byOrigin, { attack: 2, insider: 1, mistake: 1 });
  assert.deepEqual(s.byVerification, { official: 1, reported: 2, single: 1 });
  assert.equal(s.withCount, 3, 'one has no published number');
  assert.equal(s.big, 2, 'a million counts, 999,999 does not');
});

test('"recent" is the last 30 days up to the date of the list, and a date with only the month cannot say', () => {
  const s = summarize([entry('edge', '2026-09-13'), entry('before', '2026-09-12'), entry('today', '2026-10-12'), entry('future', '2026-10-13'), entry('month', '2026-10')], '2026-10-12');
  assert.equal(s.recent, 2, 'the 13th of September and today');
  // The window is `days` days counting today: 7 days is the 6th to the 12th, 6 days the 7th to the 12th.
  assert.equal(summarize([entry('a', '2026-10-06')], '2026-10-12', { days: 7 }).recent, 1);
  assert.equal(summarize([entry('a', '2026-10-05')], '2026-10-12', { days: 7 }).recent, 0);
  assert.equal(summarize([entry('a', '2026-10-06')], '2026-10-12', { days: 6 }).recent, 0);
});

test('the largest and the latest are in order, ties go to the newer date and then the id, and the empty list is all zeros', () => {
  const s = summarize([
    entry('x', '2026-05-01', { count: 500 }), entry('y', '2026-06-01', { count: 900 }), entry('z', '2026-07-01', { count: 900 }), entry('w', '2026-07-01'),
  ], '2026-10-12', { top: 3 });
  assert.deepEqual(s.largest.map(i => i.id), ['z', 'y', 'x']);
  assert.deepEqual(s.latest.map(i => i.id), ['w', 'z', 'y']);
  assert.deepEqual(summarize([], '2026-10-12'), { total: 0, byKind: { leak: 0, ransomware: 0, outage: 0, fraud: 0, other: 0 }, byOrigin: {}, byVerification: {}, withCount: 0, big: 0, recent: 0, largest: [], latest: [] });
});

test('percentages round and a whole of zero is zero', () => {
  assert.equal(percent(113, 130), 87);
  assert.equal(percent(23, 130), 18);
  assert.equal(percent(0, 0), 0);
});

test('the summary of the real list adds up, whatever the list holds today', () => {
  const s = summarize(data.items, data.asOf);
  assert.equal(s.total, data.items.length);
  assert.equal(Object.values(s.byKind).reduce((a, b) => a + b, 0), s.total, 'every incident has a known type');
  assert.equal(Object.values(s.byOrigin).reduce((a, b) => a + b, 0), s.total);
  assert.equal(Object.values(s.byVerification).reduce((a, b) => a + b, 0), s.total);
  assert.ok(s.big <= s.withCount && s.withCount <= s.total && s.recent <= s.total);
  assert.equal(s.largest.length, 5);
  assert.ok(s.largest.every((v, i, all) => i === 0 || all[i - 1].count >= v.count), 'largest first');
  assert.ok(s.latest.every((v, i, all) => i === 0 || all[i - 1].date >= v.date), 'newest first');
});

test('a number of records is rounded the way each language says it', () => {
  assert.equal(approximate(23_620_000, 'ja'), '2,362万');
  assert.equal(approximate(10_788_963, 'ja'), '1,079万');
  assert.equal(approximate(8_853_839, 'ja'), '885万');
  assert.equal(approximate(54_321, 'ja'), '5.4万');
  assert.equal(approximate(1_000_000, 'ja'), '100万');
  assert.equal(approximate(140_000_000, 'ja'), '1.4億');
  assert.equal(approximate(140_000_000, 'zh'), '1.4亿');
  assert.equal(approximate(9_999, 'ja'), '9,999');
  assert.equal(approximate(23_620_000, 'en'), '23.6M');
  assert.equal(approximate(1_078_8963, 'en'), '10.8M');
  assert.equal(approximate(54_321, 'en'), '54K');
  assert.equal(approximate(1_400_000_000, 'en'), '1.4B');
});
