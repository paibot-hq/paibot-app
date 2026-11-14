import { practiceLesson, type PracticeLesson } from '../../lib/practice';
import lessons from './lessons.json';

// The textbook text of an item page (lessons.json, written and checked by scripts/ai-ds-lessons.mjs), in Japanese.
export const getAiDsLesson = (unit: string, item: string) => practiceLesson(lessons as Record<string, PracticeLesson>, unit, item);
