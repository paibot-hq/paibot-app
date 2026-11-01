import lessonData from '../data/item-lessons.json' with { type: 'json' };

// A learning item's lesson, the textbook part of its page: sections of prose
// (with $...$ for inline TeX) and display formulas, worked examples and common
// mistakes. Examples and mistakes are written in the formula grammar
// (math-formula.ts) so that scripts/verify_lessons.py can check them with SymPy;
// the prose gets a blind review before it is published. Items without one show
// the worked example from their problems instead.
export interface Localized { ja: string; en: string; zh: string }
export interface LessonSection { heading: Localized; paragraphs: Localized[]; formulas?: string[]; after?: Localized[] }
export interface LessonExample { question: string; steps: string[]; note: Localized }
export interface LessonMistake { wrong: string; right: string; note: Localized }
export interface Lesson { sections: LessonSection[]; examples: LessonExample[]; mistakes: LessonMistake[] }

export function lesson(unit: string, item: string): Lesson | null {
  return (lessonData as Record<string, Lesson>)[`${unit}/${item}`] ?? null;
}
