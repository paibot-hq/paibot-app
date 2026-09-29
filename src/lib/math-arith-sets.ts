// Display order follows this catalog; IDs remain stable when sets move.
// A set without a rule is coming soon: it has no checker yet, so it cannot
// hold problems (see scripts/validate-math-arith.mjs).
export type ArithSet = { id: string; rule?: string; item: string; labelKey: string; descriptionKey: string };

export const ARITH_SETS: readonly ArithSet[] = [
  { id: 'order-a', rule: 'order-a', item: 'arith.order-of-operations', labelKey: 'setOrder', descriptionKey: 'setOrderDescription' },
  { id: 'order-b', rule: 'order-a', item: 'arith.order-of-operations', labelKey: 'setOrderB', descriptionKey: 'setOrderDescription' },
  { id: 'rules-a', item: 'arith.rules', labelKey: 'setRules', descriptionKey: 'setRulesDescription' },
  { id: 'word-a', rule: 'word-a', item: 'arith.word-problems', labelKey: 'setEasyWord', descriptionKey: 'setEasyWordDescription' },
  { id: 'word-b', rule: 'word-b', item: 'arith.word-problems', labelKey: 'setWord', descriptionKey: 'setWordDescription' },
];

export function labelKeyForSet(setId: string): string | undefined {
  return ARITH_SETS.find(set => set.id === setId)?.labelKey;
}
