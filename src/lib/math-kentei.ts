// Japan's Mathematics Certification (実用数学技能検定, "Suken") grades 5 to 1
// (junior high to university) and the units that prepare for each, easiest
// first. Grades 6 to 11 are the separate arithmetic exam (算数検定); the
// elementary units are found by level instead. A curriculum table kept apart
// from the stages in math-catalog.ts (see CLAUDE.md), and a guide only: the
// official ranges are on the association's site. A unit can serve several
// grades (e.g. fractions span grades 7 and 6). Shown in Japanese only.
export type KenteiGrade = {
  id: string;
  // School year the grade corresponds to, a key under App.math.kentei.targets.
  target: string;
  units: readonly string[];
};

export const KENTEI_GRADES: readonly KenteiGrade[] = [
  { id: '5', target: 'm1', units: ['signed', 'exponents', 'prime', 'expression', 'linear-equation', 'linear-function', 'angles', 'transformations', 'circle-solid'] },
  { id: '4', target: 'm2', units: ['expression', 'simultaneous', 'linear-function', 'angles', 'congruence', 'probability', 'quartiles'] },
  { id: '3', target: 'm3', units: ['expansion', 'factorization', 'sqrt', 'quadratic', 'square-function', 'pythagoras', 'similarity', 'circle-solid', 'sampling'] },
  { id: 'pre2', target: 'h1', units: ['inequality', 'quadratic', 'quadratic-function', 'sets', 'logic', 'triangle-trig', 'triangle-properties', 'statistics', 'combinatorics', 'integers'] },
  { id: '2', target: 'h2', units: ['identities', 'polynomial-equations', 'complex', 'coordinate-geometry', 'trig', 'exp-log', 'derivative', 'integral', 'sequence', 'combinatorics', 'distributions'] },
  { id: 'pre1', target: 'h3', units: ['complex', 'vector', 'conic', 'limit', 'series', 'derivative', 'integral'] },
  { id: '1', target: 'university', units: ['matrix', 'linear-system', 'vector-space', 'linear-map', 'eigen', 'inner-product', 'mapping', 'series', 'improper-integral', 'multivariable', 'ode', 'inference'] },
];

export const KENTEI_OFFICIAL_URL = 'https://www.su-gaku.net/suken/';
