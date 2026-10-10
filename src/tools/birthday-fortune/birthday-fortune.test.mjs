import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_STARS, SIGNS, daysIn, lifePath, personalDay, personalMonth, personalYear, read, reduce, signOf, validDate } from './reading.ts';

const today = { year: 2026, month: 10, day: 10 };

test('the sign of a day, at the start and the end of each sign', () => {
  const cases = [
    [3, 20, 'pisces'], [3, 21, 'aries'], [4, 19, 'aries'], [4, 20, 'taurus'], [5, 20, 'taurus'], [5, 21, 'gemini'], [6, 21, 'gemini'], [6, 22, 'cancer'],
    [7, 22, 'cancer'], [7, 23, 'leo'], [8, 22, 'leo'], [8, 23, 'virgo'], [9, 22, 'virgo'], [9, 23, 'libra'], [10, 23, 'libra'], [10, 24, 'scorpio'],
    [11, 22, 'scorpio'], [11, 23, 'sagittarius'], [12, 21, 'sagittarius'], [12, 22, 'capricorn'], [1, 1, 'capricorn'], [1, 19, 'capricorn'],
    [1, 20, 'aquarius'], [2, 18, 'aquarius'], [2, 19, 'pisces'], [12, 31, 'capricorn'],
  ];
  for (const [month, day, sign] of cases) assert.equal(signOf(month, day), sign, `${month}/${day}`);
});

test('every day of a leap year has a sign, and all twelve are used', () => {
  const used = new Set();
  for (let month = 1; month <= 12; month++) for (let day = 1; day <= daysIn(2024, month); day++) used.add(signOf(month, day));
  assert.deepEqual([...used].sort(), [...SIGNS].sort());
});

test('digits are added down to one, keeping 11, 22 and 33 only when asked', () => {
  assert.equal(reduce(30), 3);
  assert.equal(reduce(38), 2); // 3 + 8 = 11, which goes on to 2 when the masters are not kept
  assert.equal(reduce(38, true), 11);
  assert.equal(reduce(11), 2);
  assert.equal(reduce(11, true), 11);
  assert.equal(reduce(44, true), 8, '44 is not a master number');
  assert.equal(reduce(9999), 9);
});

test('the life path number: the digits of the date added down, with 11, 22 and 33 kept', () => {
  assert.equal(lifePath({ year: 1990, month: 5, day: 15 }), 3); // 1+9+9+0+5+1+5 = 30
  assert.equal(lifePath({ year: 1985, month: 11, day: 29 }), 9); // 1+9+8+5+1+1+2+9 = 36
  assert.equal(lifePath({ year: 1992, month: 11, day: 2 }), 7);
  assert.equal(lifePath({ year: 2000, month: 1, day: 1 }), 4);
});

test('over every day since 1900 the life path is 1 to 9, 11, 22 or 33, and all twelve occur', () => {
  const seen = new Set();
  for (let year = 1900; year <= 2026; year++) for (let month = 1; month <= 12; month++) for (let day = 1; day <= daysIn(year, month); day++) seen.add(lifePath({ year, month, day }));
  assert.deepEqual([...seen].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]);
});

test('the personal year, month and day follow from the birthday and the day asked', () => {
  const birth = { year: 1990, month: 5, day: 15 };
  assert.equal(personalYear(birth, 2026), 3); // 5+15+2026 = 2046 -> 12 -> 3
  assert.equal(personalMonth(3, 10), 4); // 13 -> 4
  assert.equal(personalDay(4, 10), 5); // 14 -> 5
  const reading = read(birth, today);
  assert.deepEqual([reading.year, reading.month, reading.day], [3, 4, 5]);
  assert.equal(reading.sign, 'taurus');
  assert.equal(reading.element, 'earth');
  assert.equal(reading.lifePath, 3);
  assert.deepEqual(reading.stars, DAY_STARS[5]);
});

test('the same birth date gives the same reading on a day, and the day after gives another personal day', () => {
  const birth = { year: 1988, month: 2, day: 29 };
  assert.deepEqual(read(birth, today), read(birth, today));
  assert.notEqual(read(birth, today).day, read(birth, { ...today, day: 11 }).day);
});

test('every personal number is 1 to 9 and has its stars, from one to five', () => {
  for (let n = 1; n <= 9; n++) for (const value of Object.values(DAY_STARS[n])) assert.ok(Number.isInteger(value) && value >= 1 && value <= 5);
  for (let year = 1900; year <= 2026; year += 7) for (let month = 1; month <= 12; month++) {
    const reading = read({ year, month, day: 1 }, today);
    for (const n of [reading.year, reading.month, reading.day]) assert.ok(n >= 1 && n <= 9);
  }
});

test('a birth date must be a real day from 1900 up to today', () => {
  assert.equal(validDate({ year: 1990, month: 5, day: 15 }, today), true);
  assert.equal(validDate({ year: 2024, month: 2, day: 29 }, today), true);
  assert.equal(validDate({ year: 2023, month: 2, day: 29 }, today), false);
  assert.equal(validDate({ year: 1990, month: 4, day: 31 }, today), false);
  assert.equal(validDate({ year: 1899, month: 12, day: 31 }, today), false);
  assert.equal(validDate({ year: 2026, month: 10, day: 10 }, today), true);
  assert.equal(validDate({ year: 2026, month: 10, day: 11 }, today), false, 'tomorrow');
  assert.equal(validDate({ year: NaN, month: 1, day: 1 }, today), false);
});

import { readFileSync } from 'node:fs';

test('every word the page asks for is in the messages of all three languages', () => {
  const text = (value, where) => assert.ok(typeof value === 'string' && value.trim().length > 0, `${where} is a text`);
  for (const locale of ['ja', 'en', 'zh']) {
    const messages = JSON.parse(readFileSync(new URL(`../../../messages/${locale}.json`, import.meta.url), 'utf8')).App.birthdayFortune;
    for (const sign of SIGNS) for (const part of ['name', 'range', 'text']) text(messages.sign[sign][part], `${locale} sign.${sign}.${part}`);
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]) for (const part of ['title', 'text']) text(messages.lifePath[n][part], `${locale} lifePath.${n}.${part}`);
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) for (const group of ['year', 'day']) for (const part of ['title', 'text']) text(messages[group][n][part], `${locale} ${group}.${n}.${part}`);
    for (const element of ['fire', 'earth', 'air', 'water']) text(messages.element[element], `${locale} element.${element}`);
    for (const row of ['overall', 'love', 'work', 'money']) text(messages.stars[row], `${locale} stars.${row}`);
    for (const key of ['title', 'description', 'about', 'keywords', 'intro', 'birthDate', 'read', 'invalid', 'todayTitle', 'cycleTitle', 'yearLabel', 'monthLabel', 'dayLabel', 'signTitle', 'pathTitle', 'starsOf', 'share', 'copied', 'shareText', 'forget', 'note']) text(messages[key], `${locale} ${key}`);
  }
});
