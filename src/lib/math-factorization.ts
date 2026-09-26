import { createRandom, randomInt, shuffle } from './seeded-random.ts';

export type FactorPair = { p: number; q: number };

export type FactorizationQuestion = {
  id: string;
  // The correct factorization: x^2 + ax + b = (x + p)(x + q).
  p: number;
  q: number;
  a: number;
  b: number;
  // Four choices, already shuffled; correctIndex points at {p, q} above.
  choices: FactorPair[];
  correctIndex: number;
};

// Small nonzero integers only - large or zero roots produce factorizations
// that read as unnaturally easy or unnaturally big for a first quiz.
const MAX_MAGNITUDE = 9;

function pairKey(pair: FactorPair): string {
  return `${Math.min(pair.p, pair.q)},${Math.max(pair.p, pair.q)}`;
}
function sameUnorderedPair(a: FactorPair, b: FactorPair): boolean {
  return pairKey(a) === pairKey(b);
}
function coefficientsOf(pair: FactorPair) {
  return { a: pair.p + pair.q, b: pair.p * pair.q };
}

// An integer in [-MAX_MAGNITUDE, MAX_MAGNITUDE], excluding 0: draw from
// [1, 2*MAX_MAGNITUDE] and fold the lower half onto the negatives.
function randomRoot(random: () => number): number {
  const value = randomInt(random, 1, MAX_MAGNITUDE * 2);
  return value <= MAX_MAGNITUDE ? value - MAX_MAGNITUDE - 1 : value - MAX_MAGNITUDE;
}

// Draws five distinct trinomials (distinct by their (a, b), which is
// equivalent to distinct unordered {p, q} pairs since a and b together
// determine {p, q} uniquely as the roots of t^2 - at + b = 0).
function pickQuestionPairs(random: () => number): FactorPair[] {
  const seen = new Set<string>();
  const pairs: FactorPair[] = [];
  while (pairs.length < 5) {
    const p = randomRoot(random);
    const q = randomRoot(random);
    const key = pairKey({ p, q });
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ p, q });
  }
  return pairs;
}

// Common mistakes, tried in this order: flipping both signs, nudging one
// root, flipping only one sign, and confusing the roots with the trinomial's
// own coefficients (a very common mix-up between "sum/product" and "roots").
function distractorCandidates(correct: FactorPair): FactorPair[] {
  const { p, q } = correct;
  const a = p + q;
  const b = p * q;
  const candidates = [
    { p: -p, q: -q },
    { p: p + 1, q },
    { p: -p, q },
  ];
  // Skip when a === 0 (p === -q): it would use 0 as a fake root, i.e. an
  // "(x + 0)" factor, which reads as a typo rather than a plausible mistake.
  if (a !== 0) candidates.push({ p: a, q: b });
  return candidates;
}

function distractorsFor(random: () => number, correct: FactorPair): FactorPair[] {
  const chosen: FactorPair[] = [];
  const used = new Set([pairKey(correct)]);
  const consider = (candidate: FactorPair) => {
    if (candidate.p === 0 || candidate.q === 0) return false; // "(x + 0)" is not a plausible mistake
    const key = pairKey(candidate);
    if (used.has(key)) return false;
    used.add(key);
    chosen.push(candidate);
    return true;
  };
  for (const candidate of distractorCandidates(correct)) {
    if (chosen.length >= 3) break;
    consider(candidate);
  }
  // Top up with small random offsets if the strategies above collided
  // (rare, e.g. when p === q). Capped so a pathological seed cannot loop
  // forever; the offset range is large enough relative to MAX_MAGNITUDE
  // that this always succeeds well before the cap.
  for (let attempt = 0; chosen.length < 3 && attempt < 50; attempt++) {
    const offset = randomInt(random, -3, 3) || 1;
    consider({ p: correct.p + offset, q: correct.q });
  }
  return chosen;
}

const seedFor = (setId: number) => `factorization-v1-set-${String(setId).padStart(3, '0')}`;

export function generateFactorizationSet(setId: number): FactorizationQuestion[] {
  const random = createRandom(seedFor(setId));
  return pickQuestionPairs(random).map((correct, index) => {
    const distractors = distractorsFor(random, correct);
    const options = shuffle(random, [correct, ...distractors]);
    const correctIndex = options.findIndex(option => sameUnorderedPair(option, correct));
    const { a, b } = coefficientsOf(correct);
    return {
      id: `${seedFor(setId)}-q${index + 1}`,
      p: correct.p, q: correct.q, a, b,
      choices: options,
      correctIndex,
    };
  });
}

function signedTerm(value: number, suffix: string): string {
  return ` ${value < 0 ? '-' : '+'} ${Math.abs(value)}${suffix}`;
}

// "x^2 + 5x + 6" / "x^2 - 5x + 6" / "x^2 - 9" (a === 0, e.g. p = -q).
export function trinomialTex(a: number, b: number): string {
  let tex = 'x^2';
  if (a !== 0) tex += signedTerm(a, 'x');
  if (b !== 0) tex += signedTerm(b, '');
  return tex;
}

// "(x + 2)(x + 3)" / "(x - 3)(x + 3)".
export function factoredTex(pair: FactorPair): string {
  const factor = (n: number) => `x ${n >= 0 ? '+' : '-'} ${Math.abs(n)}`;
  return `(${factor(pair.p)})(${factor(pair.q)})`;
}
