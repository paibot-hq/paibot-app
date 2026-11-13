import lessonData from '../data/item-lessons.json' with { type: 'json' };
import type { LessonGraph } from './math-lesson-graph.ts';
import type { FormulaStyle } from './math-formula';

// A learning item's lesson, the textbook part of its page: sections of prose
// (with $...$ for inline TeX) and display formulas, worked examples and common
// mistakes. Numeric examples and mistakes use the formula grammar and SymPy;
// proof/reasoning examples are localized prose, checked by independent review.
// The prose is reviewed by a model other than the one that wrote it
// (scripts/math-lessons.mjs). Only a lesson that passed (reviewedAt) is
// shown; items without one show the worked example from their problems instead.
export interface Localized { ja: string; en: string; zh: string }
// A figure: a shape drawn from numbers by the components that draw the quiz problems' figures (`shape` is a
// figure problem's `which`, `numbers` its question), or a coordinate graph. The caption is shown under it and read out
// as its description. It goes after a section's formulas, or under an example's question.
export type LessonFigure = { caption: Localized } & ({ shape: string; numbers: string } | { graph: LessonGraph });
export interface LessonSection { heading: Localized; paragraphs: Localized[]; formulas?: string[]; figures?: LessonFigure[]; after?: Localized[] }
// value: a chain equal to the question; factor: the same, ending fully factored; solve: equations with the question's solutions.
export type LessonExample =
  | { kind: 'value' | 'factor' | 'solve'; prompt?: Localized; question: string; steps: string[]; note: Localized; figure?: LessonFigure; style?: FormulaStyle }
  | { kind: 'reason'; prompt: Localized; reasoning: Localized[]; note: Localized; figure?: LessonFigure };
// An identity that is wrong and its correction, or (with a question, an equation) wrong and right solutions.
export type LessonMistake =
  | { kind?: undefined; question?: string; wrong: string; right: string; note: Localized; style?: FormulaStyle }
  | { kind: 'reason'; wrong: Localized; right: Localized; note: Localized };
export interface Lesson { sections: LessonSection[]; examples: LessonExample[]; mistakes: LessonMistake[]; reviewedAt?: string }

export function lesson(unit: string, item: string): Lesson | null {
  const found = (lessonData as unknown as Record<string, Lesson>)[`${unit}/${item}`];
  return found?.reviewedAt ? found : null;
}
