import formulaData from '../data/item-formulas.json' with { type: 'json' };

// What is worth knowing about a learning item: well-known formulas and rules as
// TeX (`npm run math:formulas`), shown on the item page. Not machine-verified;
// they only have to render (tests/unit/math-descriptions.test.mjs).
export function keyFormulas(unit: string, item: string): string[] {
  return (formulaData as Record<string, string[]>)[`${unit}/${item}`] ?? [];
}
