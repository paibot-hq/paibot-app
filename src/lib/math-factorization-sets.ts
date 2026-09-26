// The catalog of factoring problem sets shown on the set-picker page and
// referenced by the quiz page's "which set am I in" badge. Deliberately
// holds no generation logic or problem data - that used to be a seeded
// procedural generator (see git history: math-factorization.ts), but the
// plan is to switch to LLM-generated, human-verified problem sets instead.
// This catalog is what stays stable across that change: each entry just
// needs an id and the translation keys for its name/description once real
// problem data exists again.
export type FactorizationSet = { id: number; labelKey: string; descriptionKey: string };

export const FACTORIZATION_SETS: readonly FactorizationSet[] = [
  { id: 1, labelKey: 'setStandard', descriptionKey: 'setStandardDescription' },
  { id: 2, labelKey: 'setWide', descriptionKey: 'setWideDescription' },
  { id: 3, labelKey: 'setDifferenceOfSquares', descriptionKey: 'setDifferenceOfSquaresDescription' },
];

export function labelKeyForSet(setId: number): string {
  return FACTORIZATION_SETS.find(set => set.id === setId)?.labelKey ?? 'setStandard';
}
