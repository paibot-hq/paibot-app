// Japan's Mathematics Certification (実用数学技能検定, "Suken") grades and the
// units that prepare for each, easiest first. A curriculum table kept apart
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
  { id: '11', target: 'e1', units: ['arith'] },
  { id: '10', target: 'e2', units: ['arith'] },
  { id: '9', target: 'e3', units: ['arith'] },
  { id: '8', target: 'e4', units: ['arith', 'decimal', 'rounding', 'measurement'] },
  { id: '7', target: 'e5', units: ['decimal', 'fraction', 'divisors', 'ratio', 'rate', 'measurement', 'data'] },
  { id: '6', target: 'e6', units: ['fraction', 'ratio', 'rate', 'measurement', 'data'] },
  { id: '5', target: 'm1', units: ['signed', 'exponents', 'prime', 'expression', 'linear-equation', 'linear-function', 'angles', 'transformations', 'circle-solid'] },
  { id: '4', target: 'm2', units: ['expression', 'simultaneous', 'linear-function', 'angles', 'probability', 'quartiles'] },
  { id: '3', target: 'm3', units: ['expansion', 'factorization', 'sqrt', 'quadratic', 'pythagoras', 'similarity', 'circle-solid'] },
  { id: 'pre2', target: 'h1', units: ['inequality', 'quadratic', 'quadratic-function', 'sets', 'logic', 'triangle-trig', 'triangle-properties', 'statistics', 'combinatorics', 'integers'] },
  { id: '2', target: 'h2', units: ['identities', 'polynomial-equations', 'complex', 'coordinate-geometry', 'trig', 'exp-log', 'derivative', 'integral', 'sequence', 'combinatorics', 'distributions'] },
  { id: 'pre1', target: 'h3', units: ['complex', 'vector', 'conic', 'limit', 'series', 'derivative', 'integral'] },
  { id: '1', target: 'university', units: ['matrix', 'linear-system', 'vector-space', 'linear-map', 'eigen', 'inner-product', 'mapping', 'series', 'improper-integral', 'multivariable', 'ode', 'inference'] },
];

export const KENTEI_OFFICIAL_URL = 'https://www.su-gaku.net/suken/';
