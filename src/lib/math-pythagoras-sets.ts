export type PythagorasSet = { id: string; rule: string; item: string; labelKey: string; descriptionKey: string };
export const PYTHAGORAS_SETS: readonly PythagorasSet[] = [
  { id: 'sides-a', rule: 'sides-a', item: 'pythagoras.sides', labelKey: 'setSides', descriptionKey: 'setSidesDescription' },
];
export function labelKeyForSet(setId: string): string | undefined {
  return PYTHAGORAS_SETS.find(set => set.id === setId)?.labelKey;
}
