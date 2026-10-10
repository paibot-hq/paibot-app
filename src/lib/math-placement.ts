// The placement test (/math/test/placement): fifteen problems that go up a level after a right answer and down after a wrong one, then
// the level the learner is at. The levels are Japan's school years in order (the high-school courses taken together by year). The step
// starts at two levels and shrinks by one each time the direction turns, down to one. No imports, so that it is tested on its own.
export const PLACEMENT_LEVELS: readonly (readonly string[])[] = [
  ['e1'], ['e2'], ['e3'], ['e4'], ['e5'], ['e6'], ['m1'], ['m2'], ['m3'],
  ['h-i', 'h-a'], ['h-ii', 'h-b'], ['h-iii', 'h-c'], ['u1'], ['u2'],
];
export const PLACEMENT_SIZE = 15;
// Where to start, by who the learner says they are.
export const PLACEMENT_STARTS = { elementary: 3, middle: 6, high: 9, adult: 9, unsure: 6 } as const;
export type PlacementStart = keyof typeof PLACEMENT_STARTS;

export interface PlacementState { level: number; step: number; direction: 0 | 1 | -1 }

export const startPlacement = (start: PlacementStart): PlacementState => ({ level: PLACEMENT_STARTS[start], step: 2, direction: 0 });

export function nextPlacement(state: PlacementState, correct: boolean): PlacementState {
  const direction = correct ? 1 : -1;
  const step = state.direction !== 0 && direction !== state.direction ? Math.max(1, state.step - 1) : state.step;
  const level = Math.min(PLACEMENT_LEVELS.length - 1, Math.max(0, state.level + direction * step));
  return { level, step, direction };
}

// The highest level with more right answers than wrong ones (one lucky guess among four choices does not count as much as a wrong
// answer does); `top` when it is the highest level, null when no level is.
export function placementResult(history: readonly { level: number; correct: boolean }[]): { level: number; top: boolean } | null {
  const tally = new Map<number, { right: number; wrong: number }>();
  for (const { level, correct } of history) {
    const entry = tally.get(level) ?? { right: 0, wrong: 0 };
    if (correct) entry.right++; else entry.wrong++;
    tally.set(level, entry);
  }
  const passed = [...tally].filter(([, { right, wrong }]) => right > wrong).map(([level]) => level);
  if (!passed.length) return null;
  const level = Math.max(...passed);
  return { level, top: level === PLACEMENT_LEVELS.length - 1 };
}
