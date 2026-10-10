import { JP_GRADES, type JpGrade } from './math-curriculum-jp';
import { KENTEI_LEVELS } from './math-kentei';
import type { TestPart } from './math-test-draw';

export { drawTest, pickTest, type TestCandidate } from './math-test-draw';

// The tests (/math/test/<id>): problems drawn at random from published problems of some school years, a different learning item for each
// where there are enough, aiming at 40% basic, 40% standard and 20% advanced (the tiers that are short are made up from the others),
// easiest first. A test is made of parts, each drawn from its own years: a Suken level's test is mostly its own years and some of the
// years below, as the exam is.
export interface TestDef { id: string; kind: 'grade' | 'kentei' | 'summary'; key: string; parts: readonly (TestPart & { grades: readonly JpGrade[] })[]; inOrder?: boolean }

const SUMMARIES: readonly { key: string; grades: readonly JpGrade[] }[] = [
  { key: 'elementary', grades: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'] },
  { key: 'middle', grades: ['m1', 'm2', 'm3'] },
  { key: 'high1', grades: ['h-i', 'h-a'] },
  { key: 'high2', grades: ['h-ii', 'h-b', 'h-c'] },
];

export const MATH_TESTS: readonly TestDef[] = [
  ...JP_GRADES.map(grade => ({ id: grade, kind: 'grade' as const, key: grade, parts: [{ grades: [grade], size: 10 }] })),
  ...KENTEI_LEVELS.map(level => ({
    id: `kentei-${level.id}`, kind: 'kentei' as const, key: level.id,
    parts: level.below.length ? [{ grades: level.grades, extra: level.extra, size: 7 }, { grades: level.below, size: 3 }] : [{ grades: level.grades, extra: level.extra, size: 10 }],
  })),
  // Everything, elementary school to university: four from each stage, so that high school (most of the problems) does not crowd out the
  // rest, in order.
  { id: 'summary-all', kind: 'summary', key: 'all', inOrder: true, parts: [
    { grades: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'], size: 4 }, { grades: ['m1', 'm2', 'm3'], size: 4 },
    { grades: ['h-i', 'h-a'], size: 4 }, { grades: ['h-ii', 'h-b', 'h-iii', 'h-c'], size: 4 }, { grades: ['u1', 'u2'], size: 4 },
  ] },
  ...SUMMARIES.map(summary => ({ id: `summary-${summary.key}`, kind: 'summary' as const, key: summary.key, parts: [{ grades: summary.grades, size: 20 }] })),
];

export const findTest = (id: string) => MATH_TESTS.find(test => test.id === id);
export const testSize = (test: TestDef) => test.parts.reduce((sum, part) => sum + part.size, 0);

