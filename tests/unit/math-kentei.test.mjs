import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KENTEI_GRADES } from '../../src/lib/math-kentei.ts';

// math-catalog.ts imports set files without extensions (fine for Vite, not
// for Node), so read the unit IDs from its source.
const catalogIds = [...readFileSync(new URL('../../src/lib/math-catalog.ts', import.meta.url), 'utf8').matchAll(/\{ id: '([a-z-]+)', domain:/g)].map(m => m[1]);
const ja = JSON.parse(readFileSync(new URL('../../messages/ja.json', import.meta.url), 'utf8')).App.math.kentei;

assert.deepEqual(KENTEI_GRADES.map(grade => grade.id), ['11', '10', '9', '8', '7', '6', '5', '4', '3', 'pre2', '2', 'pre1', '1'], 'grades easiest first');
for (const grade of KENTEI_GRADES) {
  assert.ok(grade.units.length, `${grade.id}: no units`);
  assert.equal(new Set(grade.units).size, grade.units.length, `${grade.id}: duplicate unit`);
  for (const unit of grade.units) assert.ok(catalogIds.includes(unit), `${grade.id}: unknown unit ${unit}`);
  assert.ok(ja.grades[grade.id] && ja.targets[grade.target], `${grade.id}: missing label`);
}
const mapped = new Set(KENTEI_GRADES.flatMap(grade => grade.units));
assert.deepEqual(catalogIds.filter(id => !mapped.has(id)), [], 'every catalog unit belongs to at least one grade');
console.log(`PASS: ${KENTEI_GRADES.length} Suken grades cover all ${catalogIds.length} math units with known IDs and labels`);
