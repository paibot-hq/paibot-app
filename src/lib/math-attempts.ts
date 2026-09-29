import { EXPRESSION_UNITS, type ExpressionUnit } from './math-expression-units';
import { FORMULA_UNITS, type FormulaUnit } from './math-formula-units';

export type MathUnit = 'arith' | 'signed' | 'factorization' | 'pythagoras' | ExpressionUnit | FormulaUnit;

// Every unit that can hold problems, for loading a signed-in user's records.
export const MATH_UNITS: readonly MathUnit[] = ['arith', 'signed', 'factorization', 'pythagoras', ...EXPRESSION_UNITS, ...FORMULA_UNITS];

// A signed-in user's results on one set, shown on its chip in the /math list.
export interface MathSetRecord { last: number; best: number; total: number }
