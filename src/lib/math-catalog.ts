import { PYTHAGORAS_SETS } from './math-pythagoras-sets';

export type MathDomain = 'number' | 'algebra' | 'functions' | 'geometry' | 'data' | 'linear-algebra' | 'calculus';
export type MathStage = 'elementary' | 'middle' | 'high' | 'university';
export interface MathCatalogUnit {
  id: string;
  domain: MathDomain;
  stage: MathStage;
  status: 'published' | 'comingSoon';
  // Published units keep their sets in their existing math-*-sets.ts files.
  sets: { id: string; item: string }[];
}

export const MATH_STAGES: readonly MathStage[] = ['elementary', 'middle', 'high', 'university'];

export const MATH_DOMAINS: readonly MathDomain[] = ['number', 'algebra', 'functions', 'geometry', 'data', 'linear-algebra', 'calculus'];

// Display order and stable IDs for the math roadmap; no problem data here.
export const MATH_CATALOG: readonly MathCatalogUnit[] = [
  { id: 'arith', domain: 'number', stage: 'elementary', status: 'published', sets: [] },
  { id: 'decimal', domain: 'number', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'add-sub-a', item: 'decimal.add-sub' },
    { id: 'mul-div-a', item: 'decimal.mul-div' },
  ] },
  { id: 'fraction', domain: 'number', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'simplify-a', item: 'fraction.simplify' },
    { id: 'add-sub-a', item: 'fraction.add-sub' },
    { id: 'mul-div-a', item: 'fraction.mul-div' },
  ] },
  { id: 'divisors', domain: 'number', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'divisors-a', item: 'divisors.divisors' },
    { id: 'gcd-lcm-a', item: 'divisors.gcd-lcm' },
  ] },
  { id: 'ratio', domain: 'data', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'percent-a', item: 'ratio.percent' },
    { id: 'ratio-a', item: 'ratio.ratio' },
    { id: 'word-a', item: 'ratio.word-problems' },
  ] },
  { id: 'measurement', domain: 'geometry', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'units-a', item: 'measurement.units' },
    { id: 'area-volume-a', item: 'measurement.area-volume' },
  ] },
  { id: 'data', domain: 'data', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'average-a', item: 'data.average' },
    { id: 'median-range-a', item: 'data.median-range' },
  ] },
  { id: 'signed', domain: 'number', stage: 'middle', status: 'published', sets: [] },
  { id: 'expression', domain: 'algebra', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'value-a', item: 'expression.value' },
    { id: 'like-terms-a', item: 'expression.like-terms' },
    { id: 'distribute-a', item: 'expression.distribute' },
  ] },
  { id: 'linear-equation', domain: 'algebra', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'basic-a', item: 'linear-equation.basic' },
    { id: 'parentheses-a', item: 'linear-equation.parentheses' },
    { id: 'fraction-a', item: 'linear-equation.fraction' },
    { id: 'word-a', item: 'linear-equation.word-problems' },
  ] },
  { id: 'simultaneous', domain: 'algebra', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'elimination-a', item: 'simultaneous.elimination' },
    { id: 'substitution-a', item: 'simultaneous.substitution' },
    { id: 'word-a', item: 'simultaneous.word-problems' },
  ] },
  { id: 'linear-function', domain: 'functions', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'proportion-a', item: 'linear-function.proportion' },
    { id: 'slope-a', item: 'linear-function.slope' },
    { id: 'two-points-a', item: 'linear-function.two-points' },
  ] },
  { id: 'inequality', domain: 'algebra', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'linear-a', item: 'inequality.linear' },
  ] },
  { id: 'expansion', domain: 'algebra', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'formulas-a', item: 'expansion.formulas' },
    { id: 'square-a', item: 'expansion.square' },
    { id: 'sum-difference-a', item: 'expansion.sum-difference' },
  ] },
  { id: 'factorization', domain: 'algebra', stage: 'middle', status: 'published', sets: [] },
  { id: 'sqrt', domain: 'number', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'simplify-a', item: 'sqrt.simplify' },
    { id: 'add-sub-a', item: 'sqrt.add-sub' },
    { id: 'rationalize-a', item: 'sqrt.rationalize' },
  ] },
  { id: 'prime', domain: 'number', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'prime-a', item: 'prime.prime' },
  ] },
  { id: 'pythagoras', domain: 'geometry', stage: 'middle', status: 'published', sets: [...PYTHAGORAS_SETS] },
  { id: 'probability', domain: 'data', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'basic-a', item: 'probability.basic' },
  ] },
  { id: 'quadratic', domain: 'algebra', stage: 'high', status: 'comingSoon', sets: [
    { id: 'factoring-a', item: 'quadratic.factoring' },
    { id: 'formula-a', item: 'quadratic.formula' },
    { id: 'discriminant-a', item: 'quadratic.discriminant' },
  ] },
  { id: 'quadratic-function', domain: 'functions', stage: 'high', status: 'comingSoon', sets: [
    { id: 'vertex-a', item: 'quadratic-function.vertex' },
    { id: 'max-min-a', item: 'quadratic-function.max-min' },
  ] },
  { id: 'sequence', domain: 'functions', stage: 'high', status: 'comingSoon', sets: [
    { id: 'arithmetic-a', item: 'sequence.arithmetic' },
    { id: 'geometric-a', item: 'sequence.geometric' },
    { id: 'sigma-a', item: 'sequence.sigma' },
  ] },
  { id: 'trig', domain: 'functions', stage: 'high', status: 'comingSoon', sets: [
    { id: 'values-a', item: 'trig.values' },
    { id: 'radian-a', item: 'trig.radian' },
    { id: 'addition-a', item: 'trig.addition' },
  ] },
  { id: 'exp-log', domain: 'functions', stage: 'high', status: 'comingSoon', sets: [
    { id: 'exponent-a', item: 'exp-log.exponent' },
    { id: 'log-a', item: 'exp-log.log' },
  ] },
  { id: 'combinatorics', domain: 'data', stage: 'high', status: 'comingSoon', sets: [
    { id: 'permutations-a', item: 'combinatorics.permutations' },
    { id: 'combinations-a', item: 'combinatorics.combinations' },
    { id: 'probability-a', item: 'combinatorics.probability' },
  ] },
  { id: 'derivative', domain: 'calculus', stage: 'high', status: 'comingSoon', sets: [
    { id: 'polynomial-a', item: 'derivative.polynomial' },
    { id: 'tangent-a', item: 'derivative.tangent' },
    { id: 'extrema-a', item: 'derivative.extrema' },
  ] },
  { id: 'integral', domain: 'calculus', stage: 'high', status: 'comingSoon', sets: [
    { id: 'indefinite-a', item: 'integral.indefinite' },
    { id: 'definite-a', item: 'integral.definite' },
    { id: 'area-a', item: 'integral.area' },
  ] },
  { id: 'complex', domain: 'number', stage: 'high', status: 'comingSoon', sets: [
    { id: 'arithmetic-a', item: 'complex.arithmetic' },
    { id: 'quadratic-roots-a', item: 'complex.quadratic-roots' },
    { id: 'plane-a', item: 'complex.plane' },
  ] },
  { id: 'coordinate-geometry', domain: 'geometry', stage: 'high', status: 'comingSoon', sets: [
    { id: 'line-a', item: 'coordinate-geometry.line' },
    { id: 'circle-a', item: 'coordinate-geometry.circle' },
    { id: 'locus-a', item: 'coordinate-geometry.locus' },
  ] },
  { id: 'vector', domain: 'linear-algebra', stage: 'high', status: 'comingSoon', sets: [
    { id: 'components-a', item: 'vector.components' },
    { id: 'dot-product-a', item: 'vector.dot-product' },
    { id: 'angle-a', item: 'vector.angle' },
  ] },
  { id: 'matrix', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', sets: [
    { id: 'operations-a', item: 'matrix.operations' },
    { id: 'determinant-a', item: 'matrix.determinant' },
    { id: 'inverse-a', item: 'matrix.inverse' },
  ] },
  { id: 'linear-system', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', sets: [
    { id: 'elimination-a', item: 'linear-system.elimination' },
    { id: 'solutions-a', item: 'linear-system.solutions' },
  ] },
  { id: 'eigen', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', sets: [
    { id: 'eigenvalues-a', item: 'eigen.eigenvalues' },
    { id: 'eigenvectors-a', item: 'eigen.eigenvectors' },
  ] },
];

export function getComingSoonUnit(id: string) {
  return MATH_CATALOG.find(unit => unit.id === id && unit.status === 'comingSoon');
}

// Shared by the HTML robots tag and Worker response headers, including .data requests.
export function isComingSoonMathPath(pathname: string): boolean {
  const match = /^\/(?:ja|en|zh)\/math\/([^/]+?)(?:\.data)?(?:\/|$)/.exec(pathname);
  return !!match && !!getComingSoonUnit(match[1]);
}
