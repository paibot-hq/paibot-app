// The practice set to go on to after this one: the next set of the item, or else the first of a later item in the unit, that has published
// problems (`playable`: "unit/item/set"). Null at the end of the unit.
export function nextPlayableSet(unit: { id: string; items: readonly { id: string; sets: readonly { id: string }[] }[] }, itemId: string, setId: string, playable: readonly string[]) {
  const sets = unit.items.flatMap(item => item.sets.map(set => ({ item: item.id, set: set.id, several: item.sets.length > 1 })));
  const at = sets.findIndex(entry => entry.item === itemId && entry.set === setId);
  return sets.slice(at + 1).find(entry => playable.includes(`${unit.id}/${entry.item}/${entry.set}`)) ?? null;
}
