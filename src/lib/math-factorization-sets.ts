// Display order follows this catalog; IDs remain stable when sets move.
export type FactorizationSet = { id: string; item: string; labelKey: string; descriptionKey: string };

export const FACTORIZATION_SETS: readonly FactorizationSet[] = [
  { id: 'trinomial-a', item: 'factorization.trinomial', labelKey: 'setStandard', descriptionKey: 'setStandardDescription' },
  { id: 'trinomial-b', item: 'factorization.trinomial', labelKey: 'setWide', descriptionKey: 'setWideDescription' },
  { id: 'squares-a', item: 'factorization.difference-of-squares', labelKey: 'setDifferenceOfSquares', descriptionKey: 'setDifferenceOfSquaresDescription' },
];

export function labelKeyForSet(setId: string): string | undefined {
  return FACTORIZATION_SETS.find(set => set.id === setId)?.labelKey;
}
