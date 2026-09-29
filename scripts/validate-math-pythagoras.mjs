import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unitSets } from '../src/lib/math-catalog.ts';

const vertices = ['A', 'B', 'C'];
const sides = ['AB', 'AC', 'BC'];
const positive = n => Number.isSafeInteger(n) && n > 0;
const normalize = n => {
  let a = 1;
  for (let d = 2; d * d <= n; d++) while (n % (d * d) === 0) { a *= d; n /= d * d; }
  return [a, n];
};
const RULES = {
  'sides-a': {
    problem: squares => Object.values(squares).every(n => n <= 400),
    set: rows => rows.some(r => r.hypotenuse) && rows.some(r => !r.hypotenuse)
      && rows.some(r => r.integer) && rows.some(r => !r.integer),
  },
};
export function validateBank(bank, catalog = unitSets('pythagoras')) {
  assert.equal(bank.version, 1);
  assert.ok(Array.isArray(bank.problems));
  // Sets without a rule are coming soon and may not hold problems yet.
  for (const set of catalog) assert.ok(set.rule === undefined || Object.hasOwn(RULES, set.rule), `Unknown rule: ${set.rule}`);
  const ids = new Set(), positions = new Set(), figures = new Set();
  const coverage = new Map(catalog.map(s => [`${s.item}/${s.id}`, []]));
  for (const p of bank.problems) {
    const { id, item, setId, position, figure: f, choices, answerIndex } = p;
    assert.match(id, /^pythagoras-\d{3,}$/);
    assert.ok(!ids.has(id), `${id}: duplicate ID`); ids.add(id);
    const set = catalog.find(s => s.item === item && s.id === setId);
    assert.ok(set, `${id}: unknown set`);
    assert.ok(set.rule, `${id}: set ${item} ${setId} is coming soon (no rule yet)`);
    assert.ok(positive(position), `${id}: position`);
    assert.ok(!positions.has(`${item}/${setId}:${position}`), `${id}: duplicate position`); positions.add(`${item}/${setId}:${position}`);
    assert.equal(typeof p.published, 'boolean');
    assert.ok([1, 2, 3].includes(p.tier), `${id}: tier 1-3 (basic, standard, advanced)`);
    assert.match(p.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(p.reviewedAt).toISOString().slice(0, 10), p.reviewedAt);
    assert.ok(f && f.points);
    assert.deepEqual(Object.keys(f.points).sort(), vertices);
    for (const v of vertices) assert.ok(Array.isArray(f.points[v]) && f.points[v].length === 2 && f.points[v].every(Number.isSafeInteger), `${id}: integer coordinates`);
    assert.ok(vertices.includes(f.rightAngle), `${id}: rightAngle`);
    assert.ok(Array.isArray(f.given) && f.given.length === 2);
    // Accept either direction of an edge, while detecting reversed duplicates.
    const sideKey = s => { assert.ok(typeof s === 'string' && /^[ABC]{2}$/.test(s)); return [...s].sort().join(''); };
    assert.deepEqual([...f.given, f.unknown].map(sideKey).sort(), sides, `${id}: edge partition`);
    const squares = Object.fromEntries(sides.map(s => {
      const [a, b] = [...s].map(v => f.points[v]);
      const n = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
      assert.ok(positive(n), `${id}: distinct points and safe squared lengths`);
      return [s, n];
    }));
    assert.ok(RULES[set.rule].problem(squares), `${id}: outside ${set.rule}`);
    const origin = f.points[f.rightAngle];
    const [u, v] = vertices.filter(v => v !== f.rightAngle).map(v => f.points[v].map((n, i) => n - origin[i]));
    assert.equal(u[0] * v[0] + u[1] * v[1], 0, `${id}: not a right angle`);
    for (const s of f.given) assert.ok(positive(Math.sqrt(squares[sideKey(s)])), `${id}: given length is not an integer`);
    // The answer key is checked by scripts/verify_math.py (SymPy); this only
    // classifies the answer for the set's integer/radical coverage.
    const answer = normalize(squares[sideKey(f.unknown)]);
    assert.ok(Array.isArray(choices) && choices.length === 4);
    for (const c of choices) {
      assert.ok(Array.isArray(c) && c.length === 2 && c.every(positive), `${id}: invalid choice`);
      assert.ok(Number.isSafeInteger(c[0] ** 2 * c[1]), `${id}: unsafe choice`);
      assert.equal(normalize(c[1])[0], 1, `${id}: choice must be simplified`);
    }
    assert.ok(Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < 4);
    // Congruent figures with the same unknown are duplicates, even after rotation,
    // translation, reflection, vertex renaming or reordering the given edges.
    const signature = `${item}/${setId}:${f.given.map(s => squares[sideKey(s)]).sort((a,b) => a-b)}:${squares[sideKey(f.unknown)]}`;
    assert.ok(!figures.has(signature), `${id}: duplicate figure`); figures.add(signature);
    coverage.get(`${item}/${setId}`).push({ hypotenuse: !f.unknown.includes(f.rightAngle), integer: answer[1] === 1 });
  }
  for (const set of catalog) {
    const rows = coverage.get(`${set.item}/${set.id}`);
    if (set.rule && rows.length) assert.ok(RULES[set.rule].set(rows), `${set.id}: needs hypotenuse/leg and integer/radical answers`);
  }
  return bank;
}
export const bank = validateBank(JSON.parse(readFileSync(process.env.MATH_BANK_PYTHAGORAS || new URL('../src/data/math-pythagoras.json', import.meta.url), 'utf8')));
console.log(`PASS: ${bank.problems.length} Pythagoras problems (${bank.problems.filter(p => p.published).length} published): geometry, set rules, simplified choices`);
