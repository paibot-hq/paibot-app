import formulaData from '../data/item-formulas.json' with { type: 'json' };

// What is worth knowing about a learning item: well-known formulas (TeX) and
// short notes ("watch out for ..."), each with an explanation in ja/en/zh
// (`npm run math:formulas`). Shown as "要点" on the item page. Not machine-verified;
// the formulas only have to render (tests/unit/math-descriptions.test.mjs).
export interface KeyPoint { tex?: string; ja: string; en: string; zh: string }

export function keyPoints(unit: string, item: string): KeyPoint[] {
  return (formulaData as Record<string, KeyPoint[]>)[`${unit}/${item}`] ?? [];
}
