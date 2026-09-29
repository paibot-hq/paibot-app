import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MATH_CATALOG } from '../../src/lib/math-catalog.ts';
import { JP_GRADES, jpGrade } from '../../src/lib/math-curriculum-jp.ts';

// docs/plans/math-curriculum-jp.md, the checklist against Japan's Course of
// Study, lists every learning item exactly once, under the grade the table gives it.
const doc = readFileSync(new URL('../../docs/plans/math-curriculum-jp.md', import.meta.url), 'utf8');
const listed = new Map();
let grade;
for (const line of doc.split('\n')) {
  const heading = line.match(/^## .*（`([a-z0-9-]+)`）$/);
  if (heading) grade = heading[1];
  const row = line.match(/\| `([a-z0-9-]+\/[a-z0-9-]+)` \|$/);
  if (row) { assert.ok(!listed.has(row[1]), `${row[1]} is listed twice`); listed.set(row[1], grade); }
}
for (const unit of MATH_CATALOG) for (const item of unit.items) {
  const key = `${unit.id}/${item.id}`;
  assert.ok(listed.has(key), `${key} is missing from docs/plans/math-curriculum-jp.md`);
  assert.equal(listed.get(key), jpGrade(unit.id, item.id), `${key} is under the wrong grade`);
  listed.delete(key);
}
assert.deepEqual([...listed.keys()], [], 'items in the checklist but not in the catalog');
assert.ok(JP_GRADES.every(code => doc.includes(`（\`${code}\`）`)), 'a section for every grade');
console.log('PASS: the curriculum checklist lists every learning item under its grade');
