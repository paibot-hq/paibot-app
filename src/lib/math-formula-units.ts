import { MATH_CATALOG } from './math-catalog.ts';

// Units whose problems are formulas (FormulaPayload in math-formula.ts:
// calculate, solve or expand), checked by scripts/validate-math-formula.mjs
// and the SymPy `formula` converter. Like the expression units they share one
// route, src/routes/math-formula.tsx, keep their sets (with rules) in the
// catalog and their text under App.math.units.<unit>.
export const FORMULA_UNITS = ['decimal', 'fraction', 'exponents', 'expression', 'linear-equation', 'simultaneous', 'expansion', 'sqrt', 'quadratic'] as const;
export type FormulaUnit = typeof FORMULA_UNITS[number];

export function isFormulaUnit(id: string): id is FormulaUnit {
  return (FORMULA_UNITS as readonly string[]).includes(id);
}

export function formulaUnitSets(unit: FormulaUnit) {
  return MATH_CATALOG.find(entry => entry.id === unit)!.sets;
}
