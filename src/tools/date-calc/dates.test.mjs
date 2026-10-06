import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, addMonths, addYears, daysBetween, era, formatDate, parseDate, span, today, weekday, weekdaysBetween } from './dates.ts';

const d = text => parseDate(text);

test('dates are parsed strictly and shown back the same', () => {
  assert.equal(formatDate(d('2026-10-05')), '2026-10-05');
  assert.equal(d('2026-02-31'), null);
  assert.equal(d('2026-13-01'), null);
  assert.equal(d('2026/10/05'), null);
  assert.equal(d(''), null);
  assert.notEqual(d('2024-02-29'), null);
  assert.equal(d('2025-02-29'), null);
});

test('the days between two dates, either way round, across a leap day', () => {
  assert.equal(daysBetween(d('2026-10-05'), d('2026-10-06')), 1);
  assert.equal(daysBetween(d('2026-10-06'), d('2026-10-05')), -1);
  assert.equal(daysBetween(d('2024-02-28'), d('2024-03-01')), 2);
  assert.equal(daysBetween(d('2025-02-28'), d('2025-03-01')), 1);
  assert.equal(daysBetween(d('2026-01-01'), d('2027-01-01')), 365);
});

test('days are added and taken away', () => {
  assert.equal(formatDate(addDays(d('2026-12-31'), 1)), '2027-01-01');
  assert.equal(formatDate(addDays(d('2026-03-01'), -1)), '2026-02-28');
  assert.equal(formatDate(addDays(d('2026-10-05'), 100)), '2027-01-13');
});

test('a month later keeps the day, or the last day of a shorter month', () => {
  assert.equal(formatDate(addMonths(d('2026-01-31'), 1)), '2026-02-28');
  assert.equal(formatDate(addMonths(d('2024-01-31'), 1)), '2024-02-29');
  assert.equal(formatDate(addMonths(d('2026-10-05'), 3)), '2027-01-05');
  assert.equal(formatDate(addMonths(d('2026-03-31'), -1)), '2026-02-28');
  assert.equal(formatDate(addMonths(d('2026-01-15'), -2)), '2025-11-15');
  assert.equal(formatDate(addYears(d('2024-02-29'), 1)), '2025-02-28');
});

test('weekdays', () => {
  assert.equal(weekday(d('2026-10-05')), 1);
  assert.equal(weekday(d('2000-01-01')), 6);
  assert.equal(weekdaysBetween(d('2026-10-05'), d('2026-10-12'), false), 5);
  assert.equal(weekdaysBetween(d('2026-10-05'), d('2026-10-12'), true), 6);
  assert.equal(weekdaysBetween(d('2026-10-10'), d('2026-10-11'), true), 0);
  assert.equal(weekdaysBetween(d('2026-10-12'), d('2026-10-05'), false), 5);
});

test('the difference as years, months and days', () => {
  assert.deepEqual(span(d('2000-01-31'), d('2026-10-05')), { years: 26, months: 8, days: 5 });
  assert.deepEqual(span(d('2026-01-31'), d('2026-03-01')), { years: 0, months: 1, days: 1 });
  assert.deepEqual(span(d('2026-10-05'), d('2026-10-05')), { years: 0, months: 0, days: 0 });
  assert.deepEqual(span(d('2026-10-05'), d('2025-10-04')), { years: 1, months: 0, days: 1 });
  // From a leap day, a year later is Feb 28 (the same rule as adding a month: the last day of a shorter month).
  assert.deepEqual(span(d('2024-02-29'), d('2025-02-28')), { years: 1, months: 0, days: 0 });
});

test('Japanese eras, with the first year as 1', () => {
  assert.deepEqual(era(d('2026-10-05')), { id: 'reiwa', year: 8 });
  assert.deepEqual(era(d('2019-05-01')), { id: 'reiwa', year: 1 });
  assert.deepEqual(era(d('2019-04-30')), { id: 'heisei', year: 31 });
  assert.deepEqual(era(d('1989-01-08')), { id: 'heisei', year: 1 });
  assert.deepEqual(era(d('1989-01-07')), { id: 'showa', year: 64 });
  assert.deepEqual(era(d('1912-07-30')), { id: 'taisho', year: 1 });
  assert.deepEqual(era(d('1912-07-29')), { id: 'meiji', year: 45 });
  assert.equal(era(d('1800-01-01')), null);
});

test("today is the local date at midnight UTC, so it matches the calendar a person sees", () => {
  const now = new Date(2026, 9, 5, 23, 59);
  assert.equal(formatDate(today(now)), '2026-10-05');
});
