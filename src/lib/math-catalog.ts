export type MathStage = 'elementary' | 'middle' | 'high';
export interface MathCatalogUnit {
  id: string;
  stage: MathStage;
  status: 'published' | 'comingSoon';
  // Published units keep their sets in their existing math-*-sets.ts files.
  sets: { id: string; item: string }[];
}

export const MATH_STAGES: readonly MathStage[] = ['elementary', 'middle', 'high'];

// Display order and stable IDs for the math roadmap; no problem data here.
export const MATH_CATALOG: readonly MathCatalogUnit[] = [
  { id: 'arith', stage: 'elementary', status: 'published', sets: [] },
  { id: 'decimal', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'add-sub-a', item: 'decimal.add-sub' },
    { id: 'mul-div-a', item: 'decimal.mul-div' },
  ] },
  { id: 'fraction', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'simplify-a', item: 'fraction.simplify' },
    { id: 'add-sub-a', item: 'fraction.add-sub' },
    { id: 'mul-div-a', item: 'fraction.mul-div' },
  ] },
  { id: 'divisors', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'divisors-a', item: 'divisors.divisors' },
    { id: 'gcd-lcm-a', item: 'divisors.gcd-lcm' },
  ] },
  { id: 'ratio', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'percent-a', item: 'ratio.percent' },
    { id: 'ratio-a', item: 'ratio.ratio' },
    { id: 'word-a', item: 'ratio.word-problems' },
  ] },
  { id: 'measurement', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'units-a', item: 'measurement.units' },
    { id: 'area-volume-a', item: 'measurement.area-volume' },
  ] },
  { id: 'data', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'average-a', item: 'data.average' },
    { id: 'median-range-a', item: 'data.median-range' },
  ] },
  { id: 'signed', stage: 'middle', status: 'published', sets: [] },
  { id: 'expression', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'value-a', item: 'expression.value' },
    { id: 'like-terms-a', item: 'expression.like-terms' },
    { id: 'distribute-a', item: 'expression.distribute' },
  ] },
  { id: 'linear-equation', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'basic-a', item: 'linear-equation.basic' },
    { id: 'parentheses-a', item: 'linear-equation.parentheses' },
    { id: 'fraction-a', item: 'linear-equation.fraction' },
    { id: 'word-a', item: 'linear-equation.word-problems' },
  ] },
  { id: 'simultaneous', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'elimination-a', item: 'simultaneous.elimination' },
    { id: 'substitution-a', item: 'simultaneous.substitution' },
    { id: 'word-a', item: 'simultaneous.word-problems' },
  ] },
  { id: 'linear-function', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'proportion-a', item: 'linear-function.proportion' },
    { id: 'slope-a', item: 'linear-function.slope' },
    { id: 'two-points-a', item: 'linear-function.two-points' },
  ] },
  { id: 'inequality', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'linear-a', item: 'inequality.linear' },
  ] },
  { id: 'expansion', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'formulas-a', item: 'expansion.formulas' },
    { id: 'square-a', item: 'expansion.square' },
    { id: 'sum-difference-a', item: 'expansion.sum-difference' },
  ] },
  { id: 'factorization', stage: 'middle', status: 'published', sets: [] },
  { id: 'sqrt', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'simplify-a', item: 'sqrt.simplify' },
    { id: 'add-sub-a', item: 'sqrt.add-sub' },
    { id: 'rationalize-a', item: 'sqrt.rationalize' },
  ] },
  { id: 'prime', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'prime-a', item: 'prime.prime' },
  ] },
  { id: 'pythagoras', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'sides-a', item: 'pythagoras.sides' },
  ] },
  { id: 'probability', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'basic-a', item: 'probability.basic' },
  ] },
  { id: 'quadratic', stage: 'high', status: 'comingSoon', sets: [
    { id: 'factoring-a', item: 'quadratic.factoring' },
    { id: 'formula-a', item: 'quadratic.formula' },
    { id: 'discriminant-a', item: 'quadratic.discriminant' },
  ] },
  { id: 'quadratic-function', stage: 'high', status: 'comingSoon', sets: [
    { id: 'vertex-a', item: 'quadratic-function.vertex' },
    { id: 'max-min-a', item: 'quadratic-function.max-min' },
  ] },
  { id: 'sequence', stage: 'high', status: 'comingSoon', sets: [
    { id: 'arithmetic-a', item: 'sequence.arithmetic' },
    { id: 'geometric-a', item: 'sequence.geometric' },
    { id: 'sigma-a', item: 'sequence.sigma' },
  ] },
  { id: 'trig', stage: 'high', status: 'comingSoon', sets: [
    { id: 'values-a', item: 'trig.values' },
    { id: 'radian-a', item: 'trig.radian' },
    { id: 'addition-a', item: 'trig.addition' },
  ] },
  { id: 'exp-log', stage: 'high', status: 'comingSoon', sets: [
    { id: 'exponent-a', item: 'exp-log.exponent' },
    { id: 'log-a', item: 'exp-log.log' },
  ] },
  { id: 'combinatorics', stage: 'high', status: 'comingSoon', sets: [
    { id: 'permutations-a', item: 'combinatorics.permutations' },
    { id: 'combinations-a', item: 'combinatorics.combinations' },
    { id: 'probability-a', item: 'combinatorics.probability' },
  ] },
  { id: 'derivative', stage: 'high', status: 'comingSoon', sets: [
    { id: 'polynomial-a', item: 'derivative.polynomial' },
    { id: 'tangent-a', item: 'derivative.tangent' },
    { id: 'extrema-a', item: 'derivative.extrema' },
  ] },
  { id: 'integral', stage: 'high', status: 'comingSoon', sets: [
    { id: 'indefinite-a', item: 'integral.indefinite' },
    { id: 'definite-a', item: 'integral.definite' },
    { id: 'area-a', item: 'integral.area' },
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
