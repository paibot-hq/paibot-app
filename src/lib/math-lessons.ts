import lessonData from '../data/item-lessons.json' with { type: 'json' };
import type { LessonGraph } from './math-lesson-graph.ts';

// A learning item's lesson, the textbook part of its page: sections of prose
// (with $...$ for inline TeX) and display formulas, worked examples and common
// mistakes. Examples and mistakes are written in the formula grammar
// (math-formula.ts) so that scripts/verify_lessons.py can check them with SymPy;
// the prose is reviewed by a model other than the one that wrote it
// (scripts/math-lessons.mjs). Only a lesson that passed (reviewedAt) is
// shown; items without one show the worked example from their problems instead.
export interface Localized { ja: string; en: string; zh: string }
// A figure: a shape drawn from numbers by the components that draw the quiz problems' figures (`shape` is a
// figure problem's `which`, `numbers` its question), or a coordinate graph. The caption is shown under it and read out
// as its description. It goes after a section's formulas, or under an example's question.
export type LessonFigure = { caption: Localized } & ({ shape: string; numbers: string } | { graph: LessonGraph });
export interface LessonSection { heading: Localized; paragraphs: Localized[]; formulas?: string[]; figures?: LessonFigure[]; after?: Localized[] }
// value: a chain equal to the question; factor: the same, ending fully factored; solve: equations with the question's solutions.
export interface LessonExample { kind: 'value' | 'factor' | 'solve'; question: string; steps: string[]; note: Localized; figure?: LessonFigure }
// An identity that is wrong and its correction, or (with a question, an equation) wrong and right solutions.
export interface LessonMistake { question?: string; wrong: string; right: string; note: Localized }
export interface Lesson { sections: LessonSection[]; examples: LessonExample[]; mistakes: LessonMistake[]; reviewedAt?: string }

export function lesson(unit: string, item: string): Lesson | null {
  const found = (lessonData as unknown as Record<string, Lesson>)[`${unit}/${item}`];
  return found?.reviewedAt ? found : null;
}
