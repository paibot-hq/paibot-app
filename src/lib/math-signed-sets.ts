// Display order follows this catalog; IDs remain stable when sets move.
export type SignedSet = { id: string; rule: string; item: string; labelKey: string; descriptionKey: string };

export const SIGNED_SETS: readonly SignedSet[] = [
  { id: 'four-ops-a', rule: 'four-ops-a', item: 'signed.four-operations', labelKey: 'setFourOps', descriptionKey: 'setFourOpsDescription' },
];

export function labelKeyForSet(setId: string): string | undefined {
  return SIGNED_SETS.find(set => set.id === setId)?.labelKey;
}
