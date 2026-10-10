import assert from 'node:assert/strict';
import { nextPlacement, placementResult, PLACEMENT_LEVELS, PLACEMENT_SIZE, startPlacement } from '../../src/lib/math-placement.ts';

// A learner who gets right everything up to a level and nothing above it.
const run = (start, knows) => {
  let state = startPlacement(start);
  const history = [];
  for (let i = 0; i < PLACEMENT_SIZE; i++) {
    const correct = state.level <= knows;
    history.push({ level: state.level, correct });
    state = nextPlacement(state, correct);
  }
  return { history, result: placementResult(history) };
};

// Wherever they start, the test finds the level.
for (let knows = 0; knows < PLACEMENT_LEVELS.length - 1; knows++) {
  for (const start of ['elementary', 'middle', 'high', 'adult', 'unsure']) {
    assert.equal(run(start, knows).result?.level, knows, `knows up to ${knows}, from ${start}`);
  }
}
// All right: the top, marked as such; all wrong: no level.
assert.deepEqual(run('middle', 99).result, { level: PLACEMENT_LEVELS.length - 1, top: true });
assert.equal(run('middle', -1).result, null);
// Up two, then (after the direction turns) one at a time; never past either end.
assert.deepEqual(nextPlacement(startPlacement('middle'), true), { level: 8, step: 2, direction: 1 });
assert.deepEqual(nextPlacement({ level: 8, step: 2, direction: 1 }, false), { level: 7, step: 1, direction: -1 });
assert.equal(nextPlacement({ level: 0, step: 2, direction: -1 }, false).level, 0);
assert.equal(nextPlacement({ level: 13, step: 1, direction: 1 }, true).level, 13);
// One lucky answer at a level, outweighed by the wrong ones there, does not count.
assert.equal(placementResult([{ level: 9, correct: true }, { level: 9, correct: false }, { level: 9, correct: false }, { level: 8, correct: true }]).level, 8);
console.log('PASS: the placement test finds the level from any start, and a lucky answer does not lift it');
