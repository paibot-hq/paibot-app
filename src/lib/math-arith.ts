import type { QuizLocale } from './quiz';

// Word problems carry their prose per locale; everything else about a problem
// (the expression, the integer choices) is locale-neutral.
export type ArithWord = Record<QuizLocale, { prompt: string; unit: string }>;

export interface ArithPayload {
  // The calculation, e.g. "48 / (2 + 6) * 3 - 5"; for a word problem, the
  // expression that solves it. Negative literals are written "(-3)".
  expression: string;
  word: ArithWord | null;
  choices: number[];
}

// Problems are LLM-generated and checked by scripts/check-math-arith.mjs
// before import, so this module only formats them.
export function expressionTex(expression: string): string {
  return expression.replace(/\s+/g, '').replace(/[+\-*/]/g, operator => ({
    '+': ' + ', '-': ' - ', '*': ' \\times ', '/': ' \\div ',
  })[operator]!).replace(/\( - /g, '(-');
}

// A real minus sign, as the expression's TeX rendering uses.
export function formatInteger(value: number): string {
  return value < 0 ? `−${-value}` : String(value);
}
