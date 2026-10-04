import type { JpGrade } from './math-curriculum-jp';

// 実用数学技能検定 (数学検定 1-5級, 算数検定 6-11級) levels, easiest first (the
// page's menu lists them hardest first: 1級 at the top). `grades` are the school
// years a level is aimed at, per the official guide ("学年の目安" on
// https://www.su-gaku.net/suken/examination/summary/): 準2級 = 数学I・A,
// 2級 = 数学II・B, 準1級 = 数学III・C, 1級 = university. The levels' own years
// cover every year exactly once. `below` are the lower years the level's page also
// lists under 検定の内容 (準2級 also covers 中3, 2級 also 数学I・A, 準1級 also 数学II・B;
// 5級 covers 小5 and 小6 as well): the exam includes them. Mapping through grades
// keeps it in step with src/lib/math-curriculum-jp.ts. `extra` adds items the
// level's official topic list names outside those years: 準1級 lists 行列の演算と
// 一次変換 (https://www.su-gaku.net/suken/examination/summary/j1q/), which the
// current high-school course no longer teaches. A guide only; shown in Japanese
// only, since the exam is Japan's.
export const KENTEI_LEVELS: readonly { id: string; grades: readonly JpGrade[]; below: readonly JpGrade[]; extra?: readonly string[] }[] = [
  { id: '11', grades: ['e1'], below: [] }, { id: '10', grades: ['e2'], below: ['e1'] }, { id: '9', grades: ['e3'], below: ['e2'] },
  { id: '8', grades: ['e4'], below: ['e3'] }, { id: '7', grades: ['e5'], below: ['e4'] }, { id: '6', grades: ['e6'], below: ['e5'] },
  { id: '5', grades: ['m1'], below: ['e6', 'e5'] }, { id: '4', grades: ['m2'], below: ['m1', 'e6'] }, { id: '3', grades: ['m3'], below: ['m2', 'm1'] },
  { id: 'pre2', grades: ['h-i', 'h-a'], below: ['m3'] }, { id: '2', grades: ['h-ii', 'h-b'], below: ['h-i', 'h-a'] },
  { id: 'pre1', grades: ['h-iii', 'h-c'], below: ['h-ii', 'h-b'], extra: ['matrix/operations', 'matrix/determinant', 'matrix/inverse', 'linear-map/matrix-rep'] }, { id: '1', grades: ['u1', 'u2'], below: [] },
];

export const KENTEI_LOCALES = ['ja'] as const;

export const KENTEI_OFFICIAL_URL = 'https://www.su-gaku.net/suken/examination/summary/';
