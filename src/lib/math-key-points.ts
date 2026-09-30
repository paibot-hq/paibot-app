import keyPointData from '../data/item-key-points.json' with { type: 'json' };
import formulaData from '../data/item-formulas.json' with { type: 'json' };

// The key formulas and rules of a learning item, in the formula grammar
// (src/lib/math-formula.ts): each is an equation "lhs = rhs" that
// scripts/verify_math.py checks with SymPy. Shown on the item page.
export function keyPoints(unit: string, item: string): string[] {
  return (keyPointData as Record<string, string[]>)[`${unit}/${item}`] ?? [];
}

// Definitions and formulas SymPy cannot prove (S = ah/2, E(X) = Σ x p, ...): TeX,
// written by an LLM and checked by Codex (scripts/math-formulas.mjs), shown after the key points.
export function keyFormulas(unit: string, item: string): string[] {
  return (formulaData as Record<string, string[]>)[`${unit}/${item}`] ?? [];
}
