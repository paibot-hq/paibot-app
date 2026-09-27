// Display order follows this catalog; IDs remain stable when sets move.
export type ArithSet = { id: string; item: string; labelKey: string; descriptionKey: string };

export const ARITH_SETS: readonly ArithSet[] = [
  { id: 'add-sub-a', item: 'arith.add-sub', labelKey: 'setAddSub', descriptionKey: 'setAddSubDescription' },
  { id: 'mul-div-a', item: 'arith.mul-div', labelKey: 'setMulDiv', descriptionKey: 'setMulDivDescription' },
  { id: 'order-a', item: 'arith.order-of-operations', labelKey: 'setOrder', descriptionKey: 'setOrderDescription' },
  { id: 'word-a', item: 'arith.word-problems', labelKey: 'setEasyWord', descriptionKey: 'setEasyWordDescription' },
  { id: 'word-b', item: 'arith.word-problems', labelKey: 'setWord', descriptionKey: 'setWordDescription' },
];

export function labelKeyForSet(setId: string): string | undefined {
  return ARITH_SETS.find(set => set.id === setId)?.labelKey;
}
