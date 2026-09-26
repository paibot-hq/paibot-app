// A deterministic PRNG, used everywhere a quiz needs randomness that must
// reproduce identically for every visitor given the same seed. Never use
// Math.random() alongside this - mixing the two would make a "seeded" result
// depend on real entropy again.

// FNV-1a: a small, well-known string hash, used only to turn a seed string
// into the 32-bit integer state mulberry32 needs.
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// mulberry32: a small, fast, well-distributed PRNG. Returns a function that
// yields the next value in [0, 1) on each call.
export function createRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Inclusive on both ends.
export function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

// Fisher-Yates. Returns a new array; does not mutate the input.
export function shuffle<T>(random: () => number, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
