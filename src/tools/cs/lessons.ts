import { practiceLesson, type PracticeLesson } from '../../lib/practice';
import lessons from './lessons.json';

// The textbook text of an item page (lessons.json), in Japanese. None are written yet.
export const getCsLesson = (unit: string, item: string) => practiceLesson(lessons as Record<string, PracticeLesson>, unit, item);
