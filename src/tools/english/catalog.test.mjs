import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENGLISH_CATALOG, ENGLISH_GRADES, ENGLISH_UNITS, findEnglishItem, isUnpublishedEnglishPath } from './catalog.ts';

const messages = Object.fromEntries(['ja', 'en', 'zh'].map(locale => [locale, JSON.parse(readFileSync(new URL(`../../../messages/${locale}.json`, import.meta.url), 'utf8')).App.english]));

test('item ids are unique within each unit and every set id within each item', () => {
  for (const unit of ENGLISH_UNITS) {
    const ids = ENGLISH_CATALOG[unit].map(item => item.id);
    assert.equal(new Set(ids).size, ids.length, unit);
    for (const item of ENGLISH_CATALOG[unit]) assert.equal(new Set(item.sets.map(set => set.id)).size, item.sets.length, item.id);
  }
});

test('every level from grade 5 to grade 1 has items, and items are listed easiest first', () => {
  for (const grade of ENGLISH_GRADES) assert.ok(ENGLISH_UNITS.some(unit => ENGLISH_CATALOG[unit].some(item => item.grade === grade)), grade);
  for (const unit of ENGLISH_UNITS) {
    const order = ENGLISH_CATALOG[unit].map(item => ENGLISH_GRADES.indexOf(item.grade));
    assert.deepEqual(order, [...order].sort((a, b) => a - b), unit);
  }
});

test('every unit, item and level has a name in all three languages', () => {
  for (const [locale, english] of Object.entries(messages)) {
    for (const grade of ENGLISH_GRADES) assert.ok(english.grades[grade], `${locale} ${grade}`);
    for (const unit of ENGLISH_UNITS) {
      assert.ok(english.units[unit].title, `${locale} ${unit}`);
      for (const item of ENGLISH_CATALOG[unit]) assert.ok(english.units[unit].items[item.id], `${locale} ${unit}.${item.id}`);
      assert.equal(Object.keys(english.units[unit].items).length, ENGLISH_CATALOG[unit].length, `${locale} ${unit}: no names for items that are not in the catalog`);
    }
  }
});

test('items are found by unit and id only', () => {
  assert.equal(findEnglishItem('grammar', 'be-verb')?.grade, 'e5');
  assert.equal(findEnglishItem('vocab', 'be-verb'), undefined);
  assert.equal(findEnglishItem('math', 'be-verb'), undefined);
});

test('every /english page, .data included, is kept out of search results; other pages are not', () => {
  for (const path of ['/ja/english', '/en/english.data', '/zh/english/grammar/be-verb', '/ja/english/grammar/be-verb/1.data']) assert.ok(isUnpublishedEnglishPath(path), path);
  for (const path of ['/ja/math', '/ja/englishx', '/english', '/ja/quiz']) assert.ok(!isUnpublishedEnglishPath(path), path);
});
