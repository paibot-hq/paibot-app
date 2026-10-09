import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compact, decades, monthly, niceTicks, records, timePosition } from './breaches-stats.ts';

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
