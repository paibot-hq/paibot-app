import assert from 'node:assert/strict';
import { buildLifeCalendar, parseCalendarDay, localToday } from '../src/lib/life-calendar.ts';
assert.equal(parseCalendarDay('2025-02-29'), null);
assert.equal(buildLifeCalendar('2027-01-01', '2026-01-01', 90), null);
assert.equal(buildLifeCalendar('1899-12-31', '2026-01-01', 90), null);
assert.equal(buildLifeCalendar('2000-01-01', '2026-01-01', 121), null);
const first = buildLifeCalendar('2026-01-01', '2026-01-01', 90);
assert.equal(first.elapsedDays, 0);
assert.equal(first.rows[0][0].state, 'current');
const week = buildLifeCalendar('2026-01-01', '2026-01-08', 90);
assert.equal(week.completedWeeks, 1);
assert.equal(week.rows[0][0].state, 'past');
assert.equal(week.rows[0][1].state, 'current');
const leap = buildLifeCalendar('2000-02-29', '2024-03-01', 90);
assert.equal(new Date(leap.end).toISOString().slice(0, 10), '2090-02-28');
assert.equal(leap.rows.flat().length, leap.totalWeeks);
assert.equal(leap.rows.flat().filter(w => w.state === 'current').length, 1);
assert.equal(leap.rows.flat().at(-1).end, leap.end - 86400000);
const outside = buildLifeCalendar('2000-01-01', '2020-01-01', 10);
assert.equal(outside.outside, true);
assert.ok(outside.rows.flat().every(w => w.state === 'past'));
assert.equal(localToday(new Date(2026, 8, 26, 23, 59)), '2026-09-26');
console.log('PASS: life calendar dates, leap days, week boundaries and display range');

assert.equal(leap.ages[0].week, 0);
assert.equal(leap.ages[1].week, 365 / 7);
assert.equal(leap.ages[4].week, 1461 / 7);

assert.equal(buildLifeCalendar('2000-06-15', '2026-06-14', 90).currentAge, 25);
assert.equal(buildLifeCalendar('2000-06-15', '2026-06-15', 90).currentAge, 26);
assert.equal(buildLifeCalendar('2000-02-29', '2025-02-28', 90).currentAge, 25);
const lastDays = buildLifeCalendar('2000-01-01', '2009-12-24', 10);
assert.equal(lastDays.remainingDays, 8);
// A part-week at the end rounds down: 8 days left is 1 whole week.
assert.equal(lastDays.remainingWeeks, 1);
assert.equal(outside.currentAge, 20);
assert.equal(outside.remainingDays, 0);
assert.equal(outside.remainingWeeks, 0);
console.log('PASS: current age, birthday boundary, remaining days and weeks');
