// The catalog of factoring problem sets shown on the set-picker page and
// referenced by the quiz page's "which set am I in" badge. Problem data
// itself is LLM-generated, verified by scripts/check-math-factorization.mjs
// and served from D1 (see math-problems.server.ts); the set ranges each
// id stands for are enforced in that check script.
export type FactorizationSet = { id: number; labelKey: string; descriptionKey: string };

export const FACTORIZATION_SETS: readonly FactorizationSet[] = [
  { id: 1, labelKey: 'setStandard', descriptionKey: 'setStandardDescription' },
  { id: 2, labelKey: 'setWide', descriptionKey: 'setWideDescription' },
  { id: 3, labelKey: 'setDifferenceOfSquares', descriptionKey: 'setDifferenceOfSquaresDescription' },
];

export function labelKeyForSet(setId: number): string {
  return FACTORIZATION_SETS.find(set => set.id === setId)?.labelKey ?? 'setStandard';
}
