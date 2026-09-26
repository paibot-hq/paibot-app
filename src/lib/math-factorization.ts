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
const STANDARD_MAX_MAGNITUDE = 9;
// "Advanced": same shape, just a wider range of roots.
const WIDE_MAX_MAGNITUDE = 20;
// "Difference of squares": p is drawn from a small positive range and q is
// always -p, so a = p + q is always 0 - every question in this set is
// x^2 - n^2 = (x + n)(x - n).
const DIFFERENCE_OF_SQUARES_RANGE = { min: 2, max: 12 };

function pairKey(pair: FactorPair): string {
  return `${Math.min(pair.p, pair.q)},${Math.max(pair.p, pair.q)}`;
}
function sameUnorderedPair(a: FactorPair, b: FactorPair): boolean {
  return pairKey(a) === pairKey(b);
}
function coefficientsOf(pair: FactorPair) {
  return { a: pair.p + pair.q, b: pair.p * pair.q };
}

// An integer in [-maxMagnitude, maxMagnitude], excluding 0: draw from
// [1, 2*maxMagnitude] and fold the lower half onto the negatives.
function randomRoot(random: () => number, maxMagnitude: number): number {
  const value = randomInt(random, 1, maxMagnitude * 2);
  return value <= maxMagnitude ? value - maxMagnitude - 1 : value - maxMagnitude;
}

// The three patterns a problem set can draw its five trinomials from - see
// SET_PATTERNS below for which setId uses which.
export type SetPattern = 'standard' | 'wide' | 'differenceOfSquares';

function drawPair(random: () => number, pattern: SetPattern): FactorPair {
  if (pattern === 'differenceOfSquares') {
    const n = randomInt(random, DIFFERENCE_OF_SQUARES_RANGE.min, DIFFERENCE_OF_SQUARES_RANGE.max);
    return { p: n, q: -n };
  }
  const maxMagnitude = pattern === 'wide' ? WIDE_MAX_MAGNITUDE : STANDARD_MAX_MAGNITUDE;
  return { p: randomRoot(random, maxMagnitude), q: randomRoot(random, maxMagnitude) };
}

// Draws five distinct trinomials (distinct by their (a, b), which is
// equivalent to distinct unordered {p, q} pairs since a and b together
// determine {p, q} uniquely as the roots of t^2 - at + b = 0).
function pickQuestionPairs(random: () => number, pattern: SetPattern): FactorPair[] {
  const seen = new Set<string>();
  const pairs: FactorPair[] = [];
  while (pairs.length < 5) {
    const pair = drawPair(random, pattern);
    const key = pairKey(pair);
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push(pair);
  }
  return pairs;
}

// Four common mistakes: flipping both signs, nudging one root, flipping only
// one sign, and confusing the roots with the trinomial's own coefficients (a
// common mix-up between "sum/product" and "roots"). Only 3 of these end up as
// distractors, so the caller must not simply take the first 3 - see the
// shuffle in distractorsFor, which is what actually decides which 3.
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
  // Shuffled so that when all four strategies happen to be valid, each has
  // an equal chance of being the one left out - candidate order used to be
  // the tie-breaker instead, which silently dropped the last strategy
  // (the sum/product mix-up) in the overwhelming majority of questions.
  for (const candidate of shuffle(random, distractorCandidates(correct))) {
    if (chosen.length >= 3) break;
    consider(candidate);
  }
  // Top up with small random offsets if the strategies above collided (rare,
  // e.g. when p === q, or routinely for differenceOfSquares - see drawPair -
  // where the sign-flip-both candidate always equals the correct pair).
  // Capped so a pathological seed cannot loop forever.
  for (let attempt = 0; chosen.length < 3 && attempt < 50; attempt++) {
    const offset = randomInt(random, -3, 3) || 1;
    consider({ p: correct.p + offset, q: correct.q });
  }
  return chosen;
}

// generateFactorizationSet works for any positive integer setId (it's a pure
// function of the seed, defaulting to the 'standard' pattern), but only the
// sets listed here are linked from the set-picker page - add an entry (and
// its setLabel-* translation, see math-factorization-index.tsx) as a new set
// is authored and reviewed.
export const FACTORIZATION_SETS: readonly { id: number; pattern: SetPattern }[] = [
  { id: 1, pattern: 'standard' },
  { id: 2, pattern: 'wide' },
  { id: 3, pattern: 'differenceOfSquares' },
];
const PATTERN_BY_SET_ID = new Map(FACTORIZATION_SETS.map(set => [set.id, set.pattern]));

// Maps each pattern to its label translation key (App.math.factorization.*) -
// shared so the set picker and the quiz page (which needs to say which set
// you're actually in, not just "Factoring") show the same name for a set.
export const SET_LABEL_KEYS: Readonly<Record<SetPattern, string>> = {
  standard: 'setStandard',
  wide: 'setWide',
  differenceOfSquares: 'setDifferenceOfSquares',
};
// One-line description shown on the set-picker card, below the label above -
// this is where the "what's different about this set" detail lives, so the
// label itself can stay a short name.
export const SET_DESCRIPTION_KEYS: Readonly<Record<SetPattern, string>> = {
  standard: 'setStandardDescription',
  wide: 'setWideDescription',
  differenceOfSquares: 'setDifferenceOfSquaresDescription',
};
export function labelKeyForSet(setId: number): string {
  return SET_LABEL_KEYS[PATTERN_BY_SET_ID.get(setId) ?? 'standard'];
}

const seedFor = (setId: number) => `factorization-v1-set-${String(setId).padStart(3, '0')}`;

export function generateFactorizationSet(setId: number): FactorizationQuestion[] {
  const pattern = PATTERN_BY_SET_ID.get(setId) ?? 'standard';
  const random = createRandom(seedFor(setId));
  return pickQuestionPairs(random, pattern).map((correct, index) => {
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
