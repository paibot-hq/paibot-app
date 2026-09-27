// The catalog of arithmetic problem sets shown on the set-picker page and
// referenced by the quiz page's "which set am I in" badge. Problem data is
// LLM-generated, verified by scripts/check-math-arith.mjs and served from D1
// (see math-problems.server.ts); the rules each set id stands for are enforced
// in that check script.
export type ArithSet = { id: number; labelKey: string; descriptionKey: string };

// Listed easiest first. Ids are stable (they are in URLs and problem data),
// so the easy sets added later (4-6) keep their higher ids.
export const ARITH_SETS: readonly ArithSet[] = [
  { id: 4, labelKey: 'setAddSub', descriptionKey: 'setAddSubDescription' },
  { id: 5, labelKey: 'setMulDiv', descriptionKey: 'setMulDivDescription' },
  { id: 6, labelKey: 'setEasyWord', descriptionKey: 'setEasyWordDescription' },
  { id: 1, labelKey: 'setOrder', descriptionKey: 'setOrderDescription' },
  { id: 2, labelKey: 'setSigned', descriptionKey: 'setSignedDescription' },
  { id: 3, labelKey: 'setWord', descriptionKey: 'setWordDescription' },
];

export function labelKeyForSet(setId: number): string {
  return ARITH_SETS.find(set => set.id === setId)?.labelKey ?? 'setOrder';
}
