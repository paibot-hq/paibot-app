import lessons from './lessons.json';

// The textbook text of an item page (lessons.json, written and checked by scripts/ai-ds-lessons.mjs), in Japanese.
// A lesson without reviewedAt has not passed review and is not shown.
export interface AiDsLessonSection { heading: string; paragraphs: string[]; formulas?: string[]; after?: string[] }
export interface AiDsLessonExample { prompt: string; steps: string[]; answer: string; check?: { expr: string; value: number; tol?: number } }
export interface AiDsLesson { sections: AiDsLessonSection[]; examples: AiDsLessonExample[]; reviewedAt?: string }

export function getAiDsLesson(unit: string, item: string): AiDsLesson | null {
  const lesson = (lessons as Record<string, AiDsLesson>)[`${unit}/${item}`];
  return lesson?.reviewedAt ? lesson : null;
}
