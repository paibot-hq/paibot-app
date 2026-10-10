import assert from 'node:assert/strict';
import { nextPlayableSet } from '../../src/lib/math-next-set.ts';

// After a set, the quiz offers the next one with problems: the item's next set, else a later item's, and nothing at the end of the unit.
const unit = { id: 'u', items: [{ id: 'a', sets: [{ id: '1' }, { id: '2' }] }, { id: 'b', sets: [{ id: '1' }] }, { id: 'c', sets: [{ id: '1' }] }] };
const all = ['u/a/1', 'u/a/2', 'u/b/1', 'u/c/1'];
assert.deepEqual(nextPlayableSet(unit, 'a', '1', all), { item: 'a', set: '2', several: true });
assert.deepEqual(nextPlayableSet(unit, 'a', '2', all), { item: 'b', set: '1', several: false });
assert.deepEqual(nextPlayableSet(unit, 'a', '2', ['u/a/1', 'u/c/1']), { item: 'c', set: '1', several: false }, 'sets without problems are skipped');
assert.equal(nextPlayableSet(unit, 'c', '1', all), null);
console.log('PASS: the next practice set after a quiz');
