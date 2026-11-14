import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { CS_CATALOG, CS_EXAMS, findCsItem, isUnpublishedCsPath } from './catalog.ts';

const messages = Object.fromEntries(['ja', 'en', 'zh'].map(locale =>
  [locale, JSON.parse(readFileSync(new URL(`../../../messages/${locale}.json`, import.meta.url), 'utf8')).App.cs]));
const dataDir = new URL('./data/', import.meta.url);
const banks = Object.fromEntries(readdirSync(dataDir).filter(name => name.endsWith('.json'))
  .map(name => [name.slice(0, -5), JSON.parse(readFileSync(new URL(name, dataDir), 'utf8')).problems]));

test('every unit and item has a unique id, known exams and its names in all three languages', () => {
  const units = new Set();
  for (const unit of CS_CATALOG) {
    assert.ok(!units.has(unit.id), `duplicate unit ${unit.id}`);
    units.add(unit.id);
    const items = new Set();
    for (const item of unit.items) {
      assert.ok(!items.has(item.id), `duplicate item ${unit.id}/${item.id}`);
      items.add(item.id);
      assert.ok(item.exams.length > 0 && item.exams.every(exam => CS_EXAMS.includes(exam)), `${unit.id}/${item.id}: exams`);
      for (const [locale, m] of Object.entries(messages)) {
        assert.ok(m.units[unit.id]?.title, `${locale}: ${unit.id} title`);
        assert.ok(m.units[unit.id].items[item.id]?.title && m.units[unit.id].items[item.id]?.topics, `${locale}: ${unit.id}/${item.id}`);
      }
    }
    for (const [locale, m] of Object.entries(messages)) {
      assert.deepEqual(Object.keys(m.units[unit.id].items).sort(), [...items].sort(), `${locale}: ${unit.id} has no extra items`);
    }
  }
  for (const m of Object.values(messages)) assert.deepEqual(Object.keys(m.units).sort(), [...units].sort());
});

test('every unit has a bank, and every problem belongs to a set of the catalog', () => {
  assert.deepEqual(Object.keys(banks).sort(), CS_CATALOG.map(unit => unit.id).sort());
  for (const [unit, problems] of Object.entries(banks)) {
    const seen = new Set();
    for (const p of problems) {
      assert.ok(!seen.has(p.id), `duplicate ${p.id}`);
      seen.add(p.id);
      const item = findCsItem(unit, p.item);
      assert.ok(item?.sets.some(set => set.id === p.setId), `${p.id}: no set ${p.item}/${p.setId}`);
      assert.equal(typeof p.published, 'boolean', `${p.id}: published`);
      if (p.published) assert.match(p.reviewedAt ?? '', /^\d{4}-\d{2}-\d{2}$/, `${p.id}: a published problem was reviewed`);
      if (item.check === 'calc') assert.ok(p.check, `${p.id}: a calculation item's problem carries a check`);
    }
    // Positions within a set are unique.
    const positions = problems.map(p => `${p.item}/${p.setId}/${p.position}`);
    assert.equal(new Set(positions).size, positions.length, `${unit}: duplicate positions`);
  }
});

test('every lesson belongs to an item and is shown only once reviewed', () => {
  const lessons = JSON.parse(readFileSync(new URL('./lessons.json', import.meta.url), 'utf8'));
  for (const [key, lesson] of Object.entries(lessons)) {
    const [unit, item] = key.split('/');
    assert.ok(findCsItem(unit, item), `${key}: no such item`);
    assert.match(lesson.reviewedAt ?? '', /^\d{4}-\d{2}-\d{2}$/, `${key}: only reviewed lessons are kept`);
    assert.ok(lesson.sections.length >= 2 && lesson.examples.length >= 2, `${key}: sections and examples`);
  }
});

test('the pages stay out of search results until the tool is registered', () => {
  assert.ok(isUnpublishedCsPath('/ja/cs'));
  assert.ok(isUnpublishedCsPath('/en/cs/algorithms/sorting/1'));
  assert.ok(isUnpublishedCsPath('/zh/cs.data'));
  assert.ok(!isUnpublishedCsPath('/ja/csv'));
  assert.ok(!isUnpublishedCsPath('/ja/math'));
});
