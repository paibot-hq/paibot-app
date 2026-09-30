import type { JpGrade } from './math-curriculum-jp';

// 実用数学技能検定 (数学検定 1-5級, 算数検定 6-11級) levels, easiest first (the
// page's menu lists them hardest first: 1級 at the top), and
// the school years each covers, per the official guide ("学年の目安" on
// https://www.su-gaku.net/suken/examination/summary/): 準2級 = 数学I・A,
// 2級 = 数学II・B, 準1級 = 数学III・C, 1級 = university. Mapping through grades
// keeps it in step with src/lib/math-curriculum-jp.ts. `extra` adds items the
// level's official topic list names outside those years: 準1級 lists 行列の演算と
// 一次変換 (https://www.su-gaku.net/suken/examination/summary/j1q/), which the
// current high-school course no longer teaches. A guide only; shown in Japanese
// only, since the exam is Japan's.
export const KENTEI_LEVELS: readonly { id: string; grades: readonly JpGrade[]; extra?: readonly string[] }[] = [
  { id: '11', grades: ['e1'] }, { id: '10', grades: ['e2'] }, { id: '9', grades: ['e3'] },
  { id: '8', grades: ['e4'] }, { id: '7', grades: ['e5'] }, { id: '6', grades: ['e6'] },
  { id: '5', grades: ['m1'] }, { id: '4', grades: ['m2'] }, { id: '3', grades: ['m3'] },
  { id: 'pre2', grades: ['h-i', 'h-a'] }, { id: '2', grades: ['h-ii', 'h-b'] },
  { id: 'pre1', grades: ['h-iii', 'h-c'], extra: ['matrix/operations', 'matrix/determinant', 'matrix/inverse', 'linear-map/matrix-rep'] }, { id: '1', grades: ['u1', 'u2'] },
];

export const KENTEI_LOCALES = ['ja'] as const;

export const KENTEI_OFFICIAL_URL = 'https://www.su-gaku.net/suken/examination/summary/';
