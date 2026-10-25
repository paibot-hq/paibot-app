import assert from 'node:assert/strict';
import test from 'node:test';
import { bodyLines, eraYear, formatDate, kanjiNumber, parseDate, positionalKanji } from './letter.ts';

test('kanji numerals', () => {
  assert.deepEqual([1, 10, 11, 20, 30, 31, 8].map(kanjiNumber), ['一', '十', '十一', '二十', '三十', '三十一', '八']);
  assert.equal(positionalKanji(2026), '二〇二六');
});

test('dates are parsed strictly', () => {
  assert.deepEqual(parseDate('2026-11-30'), { year: 2026, month: 11, day: 30 });
  assert.equal(parseDate('2026-02-30'), null);
  assert.equal(parseDate(''), null);
});

test('era boundaries', () => {
  assert.deepEqual(eraYear(parseDate('2019-04-30')), { era: '平成', year: 31 });
  assert.deepEqual(eraYear(parseDate('2019-05-01')), { era: '令和', year: 1 });
  assert.deepEqual(eraYear(parseDate('1989-01-07')), { era: '昭和', year: 64 });
  assert.equal(eraYear(parseDate('1900-01-01')), null);
});

test('dates in kanji', () => {
  assert.equal(formatDate('2026-11-30', 'era'), '令和八年十一月三十日');
  assert.equal(formatDate('2019-05-01', 'era'), '令和元年五月一日');
  assert.equal(formatDate('2026-11-30', 'western'), '二〇二六年十一月三十日');
  assert.equal(formatDate('', 'era'), '令和　年　月　日');
});

test('the body differs by kind and falls back to the usual reason', () => {
  const base = { kind: 'notice', calendar: 'era', retireDate: '2026-11-30', submitDate: '', reason: ' ', department: '', name: '', company: '', recipientTitle: '', recipientName: '' };
  assert.deepEqual(bodyLines(base), ['私事', 'このたび一身上の都合により、', '令和八年十一月三十日をもって', '退職いたします。']);
  assert.equal(bodyLines({ ...base, kind: 'request', reason: '家庭の事情' }).at(-1), 'ここにお願い申し上げます。');
  assert.equal(bodyLines({ ...base, reason: '家庭の事情' })[1], 'このたび家庭の事情により、');
});
