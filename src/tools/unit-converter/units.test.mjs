import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, CATEGORY_IDS, convert, format } from './units.ts';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * tolerance + 1e-12, `${actual} vs ${expected}`);

test('length', () => {
  close(convert('length', 'mi', 'km', 1), 1.609344);
  close(convert('length', 'ft', 'cm', 1), 30.48);
  close(convert('length', 'in', 'mm', 1), 25.4);
  close(convert('length', 'shaku', 'cm', 1), 30.30303, 1e-6);
  close(convert('length', 'km', 'm', 2.5), 2500);
});

test('weight', () => {
  close(convert('weight', 'lb', 'kg', 1), 0.45359237);
  close(convert('weight', 'oz', 'g', 1), 28.349523125);
  close(convert('weight', 'kan', 'kg', 1), 3.75);
  close(convert('weight', 'momme', 'g', 1), 3.75);
});

test('area, including the tsubo and the tatami', () => {
  close(convert('area', 'tsubo', 'm2', 1), 3.305785, 1e-6);
  close(convert('area', 'jo', 'm2', 6), 9.72);
  close(convert('area', 'ha', 'm2', 1), 10000);
  close(convert('area', 'acre', 'ha', 1), 0.40468564224);
});

test('volume, including the go and the sho', () => {
  close(convert('volume', 'sho', 'L', 1), 1.8039);
  close(convert('volume', 'go', 'mL', 1), 180.39);
  close(convert('volume', 'cup', 'mL', 1), 236.5882365);
  close(convert('volume', 'm3', 'L', 1), 1000);
});

test('speed', () => {
  close(convert('speed', 'km/h', 'm/s', 36), 10);
  close(convert('speed', 'mph', 'km/h', 60), 96.56064);
  close(convert('speed', 'kn', 'km/h', 1), 1.852);
});

test('temperature has an offset, and goes both ways', () => {
  close(convert('temperature', 'C', 'F', 100), 212);
  close(convert('temperature', 'F', 'C', 32), 0, 1e-9);
  close(convert('temperature', 'C', 'K', 0), 273.15);
  close(convert('temperature', 'F', 'C', -40), -40);
  close(convert('temperature', 'K', 'F', 0), -459.67);
});

test('data, decimal and binary', () => {
  assert.equal(convert('data', 'kB', 'B', 1), 1000);
  assert.equal(convert('data', 'KiB', 'B', 1), 1024);
  close(convert('data', 'GiB', 'GB', 1), 1.073741824);
  assert.equal(convert('data', 'B', 'bit', 1), 8);
});

test('converting to the same unit, and back again, gives the same number', () => {
  for (const category of CATEGORY_IDS) {
    const units = CATEGORIES[category].units.map(unit => unit.id);
    for (const from of units) for (const to of units) {
      close(convert(category, from, from, 7.5), 7.5);
      close(convert(category, to, from, convert(category, from, to, 12.5)), 12.5, 1e-9);
    }
  }
});

test('an unknown unit is refused', () => {
  assert.throws(() => convert('length', 'parsec', 'm', 1));
});

test('numbers are shown without float noise or trailing zeros', () => {
  assert.equal(format(0.1 + 0.2), '0.3');
  assert.equal(format(1234.5, 'en'), '1,234.5');
  assert.equal(format(1000), '1,000');
  assert.equal(format(0), '0');
  assert.equal(format(0.0000001234), '1.234e-7');
  assert.equal(format(Number.NaN), '');
  assert.equal(format(1e20), '1e+20');
});
