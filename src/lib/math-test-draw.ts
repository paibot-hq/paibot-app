// Drawing a test's problems (see lib/math-test.ts for the tests); no imports, so that it is tested on its own.
export interface TestPart { grades: readonly string[]; extra?: readonly string[]; size: number }
export interface TestCandidate { id: string; unit: string; item: string; tier: number }

export function pickTest<T extends TestCandidate>(candidates: readonly T[], size = 10, random: () => number = Math.random): T[] {
  const pool = [...candidates];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const target: Record<number, number> = { 3: Math.round(size * .2), 1: Math.round(size * .4) };
  target[2] = size - target[1] - target[3];
  const picked: T[] = [];
  const items = new Set<string>();
  const take = (fits: (problem: T) => boolean, limit: number) => {
    for (const problem of pool) {
      if (picked.length >= size || limit <= 0) return;
      if (picked.includes(problem) || !fits(problem)) continue;
      picked.push(problem); items.add(`${problem.unit}/${problem.item}`); limit--;
    }
  };
  const newItem = (problem: T) => !items.has(`${problem.unit}/${problem.item}`);
  // The scarcest tiers first, so that they are not crowded out; then any tier from a new item; then anything left.
  for (const tier of [3, 1, 2]) take(problem => problem.tier === tier && newItem(problem), target[tier]);
  take(newItem, size);
  take(() => true, size);
  return picked.sort((a, b) => a.tier - b.tier);
}

// A test's problems: each part drawn from its own candidates (`ofPart` gives them), without repeats, then all easiest first.
export function drawTest<T extends TestCandidate>(test: { parts: readonly TestPart[] }, ofPart: (part: TestPart) => readonly T[], random: () => number = Math.random): T[] {
  const drawn: T[] = [];
  for (const part of test.parts) drawn.push(...pickTest(ofPart(part).filter(problem => !drawn.some(other => other.id === problem.id)), part.size, random));
  return drawn.sort((a, b) => a.tier - b.tier);
}
