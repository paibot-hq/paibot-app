// Display order follows this catalog; IDs remain stable when sets move.
// A set without a rule is coming soon: it has no checker yet, so it cannot
// hold problems (see scripts/validate-math-factorization.mjs).
export type FactorizationSet = { id: string; rule?: string; item: string; labelKey: string; descriptionKey: string };

export const FACTORIZATION_SETS: readonly FactorizationSet[] = [
  { id: 'common-factor-a', item: 'factorization.common-factor', labelKey: 'setCommonFactor', descriptionKey: 'setCommonFactorDescription' },
  { id: 'trinomial-a', rule: 'trinomial-a', item: 'factorization.trinomial', labelKey: 'setStandard', descriptionKey: 'setStandardDescription' },
  { id: 'perfect-square-a', item: 'factorization.perfect-square', labelKey: 'setPerfectSquare', descriptionKey: 'setPerfectSquareDescription' },
  { id: 'squares-a', rule: 'squares-a', item: 'factorization.difference-of-squares', labelKey: 'setDifferenceOfSquares', descriptionKey: 'setDifferenceOfSquaresDescription' },
  { id: 'various-a', item: 'factorization.various', labelKey: 'setVarious', descriptionKey: 'setVariousDescription' },
];

export function labelKeyForSet(setId: string): string | undefined {
  return FACTORIZATION_SETS.find(set => set.id === setId)?.labelKey;
}
