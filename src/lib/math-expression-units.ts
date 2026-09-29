import { MATH_CATALOG } from './math-catalog.ts';

// Units whose problems are integer expressions in the same shape as arith's
// (payload ArithPayload, checked by scripts/validate-math-arith.mjs and the
// SymPy `arith` converter), with their sets in the catalog. They share one
// route, src/routes/math-expression.tsx, and their text lives under
// App.math.units.<unit>. A new unit of this kind only needs an entry here,
// catalog sets with rules, a bank file and generation prompts.
export const EXPRESSION_UNITS = ['addition', 'multiplication', 'division'] as const;
export type ExpressionUnit = typeof EXPRESSION_UNITS[number];

export function isExpressionUnit(id: string): id is ExpressionUnit {
  return (EXPRESSION_UNITS as readonly string[]).includes(id);
}

export function expressionUnitSets(unit: ExpressionUnit) {
  return MATH_CATALOG.find(entry => entry.id === unit)!.sets;
}
