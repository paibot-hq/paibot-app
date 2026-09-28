import assert from 'node:assert/strict';
import { formatDay, holidaysOfYear, monthGrid, toDay } from '../../src/lib/japanese-holidays.ts';

const named = year => {
  const out = {};
  for (const [day, key] of holidaysOfYear(year)) out[formatDay(day)] = key;
  return out;
};

// Fixed dates and happy-Monday holidays.
const y2026 = named(2026);
assert.equal(y2026['2026-01-01'], 'newYear');
assert.equal(y2026['2026-01-12'], 'comingOfAge', '2nd Monday of January');
assert.equal(y2026['2026-02-11'], 'nationalFoundation');
assert.equal(y2026['2026-02-23'], 'emperorBirthday');
assert.equal(y2026['2026-04-29'], 'showa');
assert.equal(y2026['2026-05-04'], 'greenery');
assert.equal(y2026['2026-07-20'], 'marine', '3rd Monday of July');
assert.equal(y2026['2026-08-11'], 'mountain');
assert.equal(y2026['2026-09-21'], 'respectForAged', '3rd Monday of September');
assert.equal(y2026['2026-10-12'], 'sports', '2nd Monday of October');
assert.equal(y2026['2026-11-23'], 'labor');

// Equinoxes shift year to year.
assert.equal(y2026['2026-03-20'], 'vernalEquinox');
assert.equal(y2026['2026-09-23'], 'autumnalEquinox');
assert.equal(named(2025)['2025-03-20'], 'vernalEquinox');
assert.equal(named(2024)['2024-03-20'], 'vernalEquinox');
assert.equal(named(2023)['2023-03-21'], 'vernalEquinox');
assert.equal(named(2024)['2024-09-22'], 'autumnalEquinox');
console.log('PASS: fixed, happy-Monday and equinox holidays');

// A holiday on a Sunday moves to the next free day.
assert.equal(named(2025)['2025-02-24'], 'substitute', 'Feb 23 2025 fell on a Sunday');
assert.equal(named(2024)['2024-05-06'], 'substitute', 'May 5 2024 fell on a Sunday');
assert.equal(named(2023)['2023-01-02'], 'substitute', 'Jan 1 2023 fell on a Sunday');
// A weekday wedged between two holidays becomes one.
assert.equal(named(2026)['2026-09-22'], 'citizens', 'between Respect-for-the-Aged Day and the equinox');
assert.equal(named(2015)['2015-09-22'], 'citizens');
assert.ok(!named(2025)['2025-09-22'], 'no citizens holiday when the days do not line up');
console.log('PASS: substitute and citizens holidays');

// Rules that changed, and the one-off years.
assert.equal(named(1999)['1999-01-15'], 'comingOfAge', 'before the happy-Monday move');
assert.equal(named(2000)['2000-01-10'], 'comingOfAge', 'after it');
assert.equal(named(2006)['2006-04-29'], 'greenery', 'April 29 before Showa Day existed');
assert.equal(named(2007)['2007-04-29'], 'showa');
assert.equal(named(2018)['2018-12-23'], 'emperorBirthday', 'the previous emperor');
assert.ok(!named(2019)['2019-12-23'], 'no emperor birthday in the accession year');
assert.equal(named(2019)['2019-05-01'], 'enthronement');
assert.equal(named(2019)['2019-10-22'], 'enthronementCeremony');
assert.equal(named(2020)['2020-07-23'], 'marine', 'moved for the Olympics');
assert.equal(named(2021)['2021-08-08'], 'mountain');
assert.ok(!named(2015)['2015-08-11'], 'Mountain Day did not exist yet');
assert.equal(Object.keys(named(1948)).length, 0, 'outside the supported range');
console.log('PASS: rule changes, the accession year and the Olympic moves');

// The grid always covers whole Sunday-first weeks.
const grid = monthGrid(2026, 9);
assert.ok(grid.every(week => week.length === 7));
assert.equal(grid[0][0].weekday, 0, 'weeks start on Sunday');
assert.equal(formatDay(grid[0][0].day), '2026-08-30', 'leading days come from the previous month');
assert.equal(grid[0][0].month, 8);
assert.equal(formatDay(grid.at(-1).at(-1).day), '2026-10-03', 'trailing days come from the next');
assert.ok(grid.flat().some(cell => cell.month === 9 && cell.date === 22 && cell.holiday === 'citizens'));
// A month starting on a Sunday and ending on a Saturday needs no padding.
const exact = monthGrid(2026, 2);
assert.equal(formatDay(exact[0][0].day), '2026-02-01');
assert.equal(formatDay(exact.at(-1).at(-1).day), '2026-02-28');
// Holidays either side of a month boundary still show up.
assert.equal(monthGrid(2027, 1)[0].find(cell => cell.month === 12)?.holiday ?? null, null);
assert.equal(toDay(2026, 13, 1), toDay(2027, 1, 1), 'month overflow rolls into the next year');
console.log('PASS: month grid shape and boundaries');
