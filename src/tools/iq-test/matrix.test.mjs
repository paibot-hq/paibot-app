import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATTRIBUTES, LEVELS, QUESTIONS, VALUES, distributionFrom, isKeptResult, makePuzzle, makeTest, probit, standing } from './matrix.ts';

// A solver written apart from the maker: for one attribute, from the first two rows and the first two figures of the
// third, every value the bottom right could take under some rule that both full rows obey.
function candidates(puzzle, attribute) {
  const v = puzzle.cells.map(cell => cell[attribute]);
  const row = r => [v[r * 3], v[r * 3 + 1], v[r * 3 + 2]];
  const [r0, r1] = [row(0), row(1)];
  const [a, b] = [v[6], v[7]];
  const out = new Set();
  // The same throughout.
  if (v.slice(0, 8).every(x => x === v[0])) out.add(v[0]);
  // A step along each row, the same step in every row.
  const step = r0[1] - r0[0];
  if (step !== 0 && [r0, r1].every(r => r[1] - r[0] === step && r[2] - r[1] === step) && b - a === step) out.add(b + step);
  // The same three values in every row, in another order.
  const set = r => [...r].sort().join();
  if (new Set(r0).size === 3 && set(r0) === set(r1) && a !== b && r0.includes(a) && r0.includes(b)) out.add(r0.find(x => x !== a && x !== b));
  // The third the sum of the first two (counts are 0-based: one figure is 0).
  if (attribute === 'count' && [r0, r1].every(r => r[2] === r[0] + r[1] + 1)) out.add(a + b + 1);
  return out;
}

test('every puzzle has exactly one answer, the one marked, whatever rule a reader finds', () => {
  for (let seed = 1; seed <= 4000; seed++) {
    const puzzle = makePuzzle(seed, 1 + (seed % 4));
    const answer = puzzle.choices[puzzle.answer];
    assert.deepEqual(answer, puzzle.cells[8], `seed ${seed}`);
    for (const attribute of ATTRIBUTES) {
      const found = candidates(puzzle, attribute);
      assert.deepEqual([...found], [answer[attribute]], `seed ${seed} ${attribute}: ${[...found]} vs ${answer[attribute]}`);
    }
    // Only the answer among the choices fits every attribute.
    const fitting = puzzle.choices.filter(choice => ATTRIBUTES.every(a => candidates(puzzle, a).has(choice[a])));
    assert.equal(fitting.length, 1, `seed ${seed}`);
  }
});

test('every figure is in range, and the choices are eight different figures', () => {
  for (let seed = 1; seed <= 2000; seed++) {
    const puzzle = makePuzzle(seed, 4);
    for (const figure of [...puzzle.cells, ...puzzle.choices]) for (const a of ATTRIBUTES) assert.ok(Number.isInteger(figure[a]) && figure[a] >= 0 && figure[a] < VALUES[a], `seed ${seed}: ${a}=${figure[a]}`);
    assert.equal(new Set(puzzle.choices.map(f => ATTRIBUTES.map(a => f[a]).join())).size, 8);
  }
});

test('comparing the choices alone gives nothing away: every varied value is in exactly half of them', () => {
  for (let seed = 1; seed <= 2000; seed++) {
    const puzzle = makePuzzle(seed, 1 + (seed % 4));
    let varied = 0;
    for (const a of ATTRIBUTES) {
      const counts = new Map();
      for (const choice of puzzle.choices) counts.set(choice[a], (counts.get(choice[a]) ?? 0) + 1);
      if (counts.size === 1) continue;
      varied++;
      assert.deepEqual([...counts.values()].sort(), [4, 4], `seed ${seed} ${a}`);
    }
    assert.equal(varied, 3);
  }
});

test('the level is how many attributes change along the rows', () => {
  for (let seed = 1; seed <= 500; seed++) {
    for (const level of [1, 2, 3, 4]) {
      const puzzle = makePuzzle(seed, level);
      assert.equal(ATTRIBUTES.filter(a => puzzle.rules[a].kind !== 'constant').length, level);
    }
  }
});

test('a test is sixteen puzzles getting harder, the same for the same seed, the answer anywhere', () => {
  const one = makeTest(42);
  assert.equal(one.length, QUESTIONS);
  assert.deepEqual(one.map(p => p.level), LEVELS);
  assert.deepEqual(one, makeTest(42));
  assert.notDeepEqual(one, makeTest(43));
  const places = new Set();
  for (let seed = 1; seed <= 50; seed++) for (const p of makeTest(seed)) places.add(p.answer);
  assert.equal(places.size, 8);
});

test('the inverse normal is right', () => {
  assert.ok(Math.abs(probit(0.5)) < 1e-9);
  assert.ok(Math.abs(probit(0.8413447) - 1) < 1e-5);
  assert.ok(Math.abs(probit(0.0227501) + 2) < 1e-5);
  assert.ok(Math.abs(probit(0.999) - 3.090232) < 1e-5);
});

test('a score is placed on the IQ curve by its place among everyone', () => {
  // The middle of 101 people is IQ 100; one standard deviation above (top 16%) is 115.
  assert.deepEqual(standing(50, 1, 101), { iq: 100, top: 50 });
  const high = standing(15, 1, 101);
  assert.ok(high.iq >= 114 && high.iq <= 116, `${high.iq}`);
  assert.equal(high.top, 15);
  // Alone, or all the same: the middle.
  assert.equal(standing(0, 1, 1).iq, 100);
  assert.equal(standing(0, 10, 10).iq, 100);
  // The best of many is high but not endless; the worst low.
  assert.ok(standing(0, 1, 10000).iq > 140 && standing(0, 1, 10000).iq <= 160);
  assert.ok(standing(9999, 1, 10000).iq < 60);
  assert.equal(standing(0, 1, 10000).top, 1);
});

test('only plausible results are kept, and the histogram has a bar for every score', () => {
  assert.ok(isKeptResult(0, 30) && isKeptResult(16, 600));
  for (const [s, t] of [[-1, 30], [17, 30], [3.5, 30], [5, 0], [5, 9999], ['5', 30]]) assert.ok(!isKeptResult(s, t), `${s} ${t}`);
  const d = distributionFrom([{ score: 3, count: 2 }, { score: 16, count: 1 }, { score: 40, count: 9 }]);
  assert.equal(d.counts.length, QUESTIONS + 1);
  assert.equal(d.counts[3], 2);
  assert.equal(d.total, 3);
});
