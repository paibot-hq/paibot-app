import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BITS, FAMILIES, PLAN, QUESTIONS, SPECS, distributionFrom, isKeptResult, makePuzzle, makeTest, probit, standing } from './matrix.ts';

// A solver written apart from the maker: every answer a reader could arrive at, from the first two rows and the first
// two panels of the third, under any rule both full rows obey.
function attributeCandidates(v, sum) {
  const row = r => [v[r * 3], v[r * 3 + 1], v[r * 3 + 2]];
  const [r0, r1] = [row(0), row(1)];
  const [a, b] = [v[6], v[7]];
  const out = new Set();
  if (v.slice(0, 8).every(x => x === v[0])) out.add(v[0]);                                   // the same throughout
  if (r0.every(x => x === r0[0]) && r1.every(x => x === r1[0]) && a === b) out.add(a);          // the same along each row
  for (const step of [1, -1, 2, -2]) {                                                          // a step along each row
    if ([r0, r1].every(r => r[1] - r[0] === step && r[2] - r[1] === step) && b - a === step) out.add(b + step);
  }
  const key = r => [...r].sort().join();                                                        // three values taking turns
  if (new Set(r0).size === 3 && key(r0) === key(r1) && a !== b && r0.includes(a) && r0.includes(b)) out.add(r0.find(x => x !== a && x !== b));
  if (sum && [r0, r1].every(r => r[2] === r[0] + r[1] + 1)) out.add(a + b + 1);                // the sum (counts 0-based)
  return out;
}
const shift = (m, dr, dc) => { let out = 0; for (let i = 0; i < 9; i++) if (m >> i & 1) out |= 1 << (((Math.floor(i / 3) + dr + 3) % 3) * 3 + (i % 3 + dc + 3) % 3); return out; };
function maskCandidates(v, family) {
  const rows = [[v[0], v[1], v[2]], [v[3], v[4], v[5]]];
  const [a, b] = [v[6], v[7]];
  const out = new Set();
  for (const f of [(x, y) => x | y, (x, y) => x & y, (x, y) => x ^ y]) if (rows.every(r => r[2] === f(r[0], r[1]))) out.add(f(a, b));
  if (family === 'dots') {
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const move = m => shift(m, dr, dc);
      if (rows.every(r => r[1] === move(r[0]) && r[2] === move(r[1])) && b === move(a)) out.add(move(b));
    }
  }
  return out;
}
const solve = puzzle => {
  if (puzzle.family === 'lines' || puzzle.family === 'dots') return [maskCandidates(puzzle.cells.map(c => c.mask), puzzle.family)];
  return SPECS[puzzle.family].map(a => attributeCandidates(puzzle.cells.map(c => c[a.name]), a.sum));
};
const keys = puzzle => (puzzle.family === 'lines' || puzzle.family === 'dots' ? ['mask'] : SPECS[puzzle.family].map(a => a.name));
const levels = { figures: [1, 2, 3, 4], nested: [1, 2, 3, 4], lines: [2, 3, 4], dots: [1, 2, 3, 4] };

test('every puzzle of every kind has exactly one answer, the one marked, whatever rule a reader finds', () => {
  for (const family of FAMILIES) {
    for (let seed = 1; seed <= 1500; seed++) {
      const puzzle = makePuzzle(seed, family, levels[family][seed % levels[family].length]);
      const answer = puzzle.choices[puzzle.answer];
      assert.deepEqual(answer, puzzle.cells[8], `${family} ${seed}`);
      const found = solve(puzzle);
      keys(puzzle).forEach((k, i) => assert.deepEqual([...found[i]], [answer[k]], `${family} ${seed} ${k}: ${[...found[i]]} vs ${answer[k]}`));
      // Only the answer among the choices fits.
      const fitting = puzzle.choices.filter(choice => keys(puzzle).every((k, i) => found[i].has(choice[k])));
      assert.equal(fitting.length, 1, `${family} ${seed}`);
    }
  }
});

test('every panel is in range and shows something, and the choices are eight different panels', () => {
  for (const family of FAMILIES) {
    for (let seed = 1; seed <= 800; seed++) {
      const puzzle = makePuzzle(seed, family, 4);
      for (const panel of [...puzzle.cells, ...puzzle.choices]) {
        if (family === 'lines' || family === 'dots') assert.ok(panel.mask > 0 && panel.mask < 1 << BITS[family], `${family} ${seed}: ${panel.mask}`);
        else for (const a of SPECS[family]) assert.ok(Number.isInteger(panel[a.name]) && panel[a.name] >= 0 && panel[a.name] < a.values, `${family} ${seed}: ${a.name}=${panel[a.name]}`);
      }
      assert.equal(new Set(puzzle.choices.map(c => JSON.stringify(c))).size, 8);
    }
  }
});

test('comparing the choices alone gives nothing away: every changed part is in exactly half of them', () => {
  for (const family of FAMILIES) {
    for (let seed = 1; seed <= 800; seed++) {
      const puzzle = makePuzzle(seed, family, 3);
      let varied = 0;
      const parts = family === 'lines' || family === 'dots'
        ? Array.from({ length: BITS[family] }, (_, bit) => c => (c.mask >> bit) & 1)
        : SPECS[family].map(a => c => c[a.name]);
      for (const part of parts) {
        const counts = new Map();
        for (const choice of puzzle.choices) counts.set(part(choice), (counts.get(part(choice)) ?? 0) + 1);
        if (counts.size === 1) continue;
        varied++;
        assert.deepEqual([...counts.values()].sort(), [4, 4], `${family} ${seed}`);
      }
      assert.equal(varied, 3);
    }
  }
});

test('the level is how many attributes change, for figures and nested ones', () => {
  for (const family of ['figures', 'nested']) {
    for (let seed = 1; seed <= 300; seed++) {
      for (const level of [1, 2, 3, 4]) {
        const puzzle = makePuzzle(seed, family, level);
        assert.equal(puzzle.rules.filter(r => !r.endsWith(':constant')).length, level, `${family} ${seed} ${level}`);
      }
    }
  }
});

test('a test is sixteen puzzles of all four kinds, getting harder, the same for the same seed, the answer anywhere', () => {
  const one = makeTest(42);
  assert.equal(one.length, QUESTIONS);
  assert.deepEqual(one.map(p => [p.family, p.level]), PLAN);
  assert.deepEqual(new Set(one.map(p => p.family)), new Set(FAMILIES));
  assert.deepEqual(one, makeTest(42));
  assert.notDeepEqual(one, makeTest(43));
  const places = new Set(), rules = new Set();
  for (let seed = 1; seed <= 100; seed++) for (const p of makeTest(seed)) { places.add(p.answer); for (const r of p.rules) rules.add(r.split(':').pop()); }
  assert.equal(places.size, 8);
  // Every kind of rule comes up.
  for (const r of ['constant', 'rowConstant', 'progression', 'distribute', 'sum', 'or', 'and', 'xor', 'right', 'down']) assert.ok(rules.has(r), r);
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
