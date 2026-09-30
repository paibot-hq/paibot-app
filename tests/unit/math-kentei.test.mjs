import assert from 'node:assert/strict';
import { JP_GRADES } from '../../src/lib/math-curriculum-jp.ts';
import { KENTEI_LEVELS } from '../../src/lib/math-kentei.ts';

// The Suken levels cover every school year exactly once, easiest first, as the
// official guide maps them (準2級 数学I・A, 2級 数学II・B, 準1級 数学III・C, 1級 大学).
assert.deepEqual(KENTEI_LEVELS.map(level => level.id), ['11', '10', '9', '8', '7', '6', '5', '4', '3', 'pre2', '2', 'pre1', '1']);
assert.deepEqual(KENTEI_LEVELS.flatMap(level => level.grades), [...JP_GRADES]);
assert.deepEqual(KENTEI_LEVELS.find(level => level.id === '2').grades, ['h-ii', 'h-b']);
// Extra items exist in the catalog.
import { MATH_CATALOG } from '../../src/lib/math-catalog.ts';
const keys = MATH_CATALOG.flatMap(unit => unit.items.map(item => `${unit.id}/${item.id}`));
for (const key of KENTEI_LEVELS.flatMap(level => level.extra ?? [])) assert.ok(keys.includes(key), `unknown item ${key}`);
console.log('PASS: Suken levels cover every school year once, in order; extra items exist');
