// A school year's test (/math/test/<grade>): problems drawn at random from the year's published problems, a different
// learning item for each where the year has enough, aiming at 4 basic, 4 standard and 2 advanced (the tiers a year lacks
// are made up from the others), easiest first.
export const TEST_SIZE = 10;
const TIER_TARGET: Record<number, number> = { 1: 4, 2: 4, 3: 2 };
// The fewest published problems a year needs for its test to be offered.
export const TEST_MIN_PROBLEMS = TEST_SIZE;

export interface TestCandidate { id: string; unit: string; item: string; tier: number }

export function pickTest<T extends TestCandidate>(candidates: readonly T[], random: () => number = Math.random): T[] {
  const pool = [...candidates];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked: T[] = [];
  const items = new Set<string>();
  const take = (fits: (problem: T) => boolean, limit: number) => {
    for (const problem of pool) {
      if (picked.length >= TEST_SIZE || limit <= 0) return;
      if (picked.includes(problem) || !fits(problem)) continue;
      picked.push(problem); items.add(`${problem.unit}/${problem.item}`); limit--;
    }
  };
  const newItem = (problem: T) => !items.has(`${problem.unit}/${problem.item}`);
  // The scarcest tiers first, so that they are not crowded out; then any tier from a new item; then anything left.
  for (const tier of [3, 1, 2]) take(problem => problem.tier === tier && newItem(problem), TIER_TARGET[tier]);
  take(newItem, TEST_SIZE);
  take(() => true, TEST_SIZE);
  return picked.sort((a, b) => a.tier - b.tier);
}
