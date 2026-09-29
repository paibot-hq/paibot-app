import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DOC, render } from '../../scripts/math-curriculum-doc.mjs';
import { MATH_CATALOG } from '../../src/lib/math-catalog.ts';

// docs/plans/math-curriculum-jp.md, the checklist against Japan's Course of
// Study, is generated from the catalog and the grade table; it must be current
// and list every learning item once.
const expected = render();
assert.equal(readFileSync(DOC, 'utf8'), expected, 'docs/plans/math-curriculum-jp.md is stale: run node scripts/math-curriculum-doc.mjs');
const keys = [...expected.matchAll(/\| `([a-z0-9-]+\/[a-z0-9-]+)` \|$/gm)].map(match => match[1]);
assert.equal(new Set(keys).size, keys.length, 'an item is listed twice');
assert.deepEqual(keys.sort(), MATH_CATALOG.flatMap(unit => unit.items.map(item => `${unit.id}/${item.id}`)).sort());
console.log(`PASS: the curriculum checklist is current and lists all ${keys.length} learning items`);
