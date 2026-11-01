import lessonData from '../data/item-lessons.json' with { type: 'json' };

// A learning item's lesson, the textbook part of its page: sections of prose
// (with $...$ for inline TeX) and display formulas, worked examples and common
// mistakes. Examples and mistakes are written in the formula grammar
// (math-formula.ts) so that scripts/verify_lessons.py can check them with SymPy;
// the prose is reviewed by a model other than the one that wrote it
// (scripts/math-lessons.mjs). Only a lesson that passed (reviewedAt) is
// shown; items without one show the worked example from their problems instead.
export interface Localized { ja: string; en: string; zh: string }
export interface LessonSection { heading: Localized; paragraphs: Localized[]; formulas?: string[]; after?: Localized[] }
// value: a chain equal to the question; factor: the same, ending fully factored; solve: equations with the question's solutions.
export interface LessonExample { kind: 'value' | 'factor' | 'solve'; question: string; steps: string[]; note: Localized }
// An identity that is wrong and its correction, or (with a question, an equation) wrong and right solutions.
export interface LessonMistake { question?: string; wrong: string; right: string; note: Localized }
export interface Lesson { sections: LessonSection[]; examples: LessonExample[]; mistakes: LessonMistake[]; reviewedAt?: string }

export function lesson(unit: string, item: string): Lesson | null {
  const found = (lessonData as unknown as Record<string, Lesson>)[`${unit}/${item}`];
  return found?.reviewedAt ? found : null;
}
