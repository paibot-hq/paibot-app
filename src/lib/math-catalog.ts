import { PYTHAGORAS_SETS } from './math-pythagoras-sets.ts';

export type MathDomain = 'number' | 'algebra' | 'functions' | 'geometry' | 'data' | 'logic' | 'linear-algebra' | 'calculus';
export type MathStage = 'elementary' | 'middle' | 'high' | 'university';
export interface MathCatalogUnit {
  id: string;
  domain: MathDomain;
  stage: MathStage;
  status: 'published' | 'comingSoon';
  // Published units keep their sets in their existing math-*-sets.ts files.
  // Expression units (math-expression-units.ts) keep theirs here: a set with
  // a `rule` (a key in scripts/validate-math-arith.mjs) can hold problems.
  sets: { id: string; item: string; rule?: string }[];
}

export const MATH_STAGES: readonly MathStage[] = ['elementary', 'middle', 'high', 'university'];

export const MATH_DOMAINS: readonly MathDomain[] = ['number', 'algebra', 'functions', 'geometry', 'data', 'logic', 'linear-algebra', 'calculus'];

// Display order and stable IDs for the math roadmap; no problem data here.
export const MATH_CATALOG: readonly MathCatalogUnit[] = [
  { id: 'addition', domain: 'number', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'carry-a', item: 'addition.carry', rule: 'carry-a' },
    { id: 'two-digit-a', item: 'addition.two-digit', rule: 'two-digit-a' },
    { id: 'column-a', item: 'addition.column', rule: 'column-a' },
  ] },
  { id: 'multiplication', domain: 'number', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'times-table-a', item: 'multiplication.times-table', rule: 'times-table-a' },
    { id: 'by-one-digit-a', item: 'multiplication.by-one-digit', rule: 'mul-by-one-digit-a' },
    { id: 'by-two-digit-a', item: 'multiplication.by-two-digit', rule: 'mul-by-two-digit-a' },
  ] },
  { id: 'division', domain: 'number', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'basic-a', item: 'division.basic', rule: 'div-basic-a' },
    { id: 'remainder-a', item: 'division.remainder' },
    { id: 'by-two-digit-a', item: 'division.by-two-digit', rule: 'div-by-two-digit-a' },
  ] },
  { id: 'arith', domain: 'number', stage: 'elementary', status: 'published', sets: [] },
  { id: 'place-value', domain: 'number', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'place-value-a', item: 'place-value.place-value' },
    { id: 'large-numbers-a', item: 'place-value.large-numbers' },
  ] },
  { id: 'time', domain: 'geometry', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'reading-a', item: 'time.reading' },
    { id: 'elapsed-a', item: 'time.elapsed' },
  ] },
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
  { id: 'rounding', domain: 'number', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'rounding-a', item: 'rounding.rounding' },
    { id: 'estimate-a', item: 'rounding.estimate' },
  ] },
  { id: 'ratio', domain: 'data', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'percent-a', item: 'ratio.percent' },
    { id: 'ratio-a', item: 'ratio.ratio' },
    { id: 'word-a', item: 'ratio.word-problems' },
  ] },
  { id: 'measurement', domain: 'geometry', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'units-a', item: 'measurement.units' },
    { id: 'area-volume-a', item: 'measurement.area-volume' },
    { id: 'circle-a', item: 'measurement.circle' },
  ] },
  { id: 'shapes', domain: 'geometry', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'triangles-quads-a', item: 'shapes.triangles-quads' },
    { id: 'circles-a', item: 'shapes.circles' },
    { id: 'angles-a', item: 'shapes.angles' },
  ] },
  { id: 'symmetry', domain: 'geometry', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'symmetry-a', item: 'symmetry.symmetry' },
    { id: 'scale-a', item: 'symmetry.scale' },
  ] },
  { id: 'data', domain: 'data', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'average-a', item: 'data.average' },
    { id: 'median-range-a', item: 'data.median-range' },
  ] },
  { id: 'graphs', domain: 'data', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'tables-a', item: 'graphs.tables' },
    { id: 'line-graph-a', item: 'graphs.line-graph' },
    { id: 'pie-band-a', item: 'graphs.pie-band' },
    { id: 'histogram-a', item: 'graphs.histogram' },
  ] },
  { id: 'counting', domain: 'data', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'arrangements-a', item: 'counting.arrangements' },
    { id: 'combinations-a', item: 'counting.combinations' },
  ] },
  { id: 'signed', domain: 'number', stage: 'middle', status: 'published', sets: [] },
  { id: 'exponents', domain: 'number', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'powers-a', item: 'exponents.powers' },
    { id: 'scientific-a', item: 'exponents.scientific' },
  ] },
  { id: 'expression', domain: 'algebra', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'value-a', item: 'expression.value' },
    { id: 'like-terms-a', item: 'expression.like-terms' },
    { id: 'distribute-a', item: 'expression.distribute' },
    { id: 'rearrange-a', item: 'expression.rearrange' },
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
    { id: 'equations-a', item: 'linear-function.equations' },
  ] },
  { id: 'square-function', domain: 'functions', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'graph-a', item: 'square-function.graph' },
    { id: 'rate-of-change-a', item: 'square-function.rate-of-change' },
    { id: 'intersection-a', item: 'square-function.intersection' },
  ] },
  { id: 'inequality', domain: 'algebra', stage: 'high', status: 'comingSoon', sets: [
    { id: 'linear-a', item: 'inequality.linear' },
    { id: 'quadratic-a', item: 'inequality.quadratic' },
    { id: 'absolute-a', item: 'inequality.absolute' },
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
  { id: 'integers', domain: 'number', stage: 'high', status: 'comingSoon', sets: [
    { id: 'euclid-a', item: 'integers.euclid' },
    { id: 'base-n-a', item: 'integers.base-n' },
    { id: 'congruence-a', item: 'integers.congruence' },
  ] },
  { id: 'pythagoras', domain: 'geometry', stage: 'middle', status: 'published', sets: [...PYTHAGORAS_SETS] },
  { id: 'probability', domain: 'data', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'basic-a', item: 'probability.basic' },
  ] },
  { id: 'quadratic', domain: 'algebra', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'factoring-a', item: 'quadratic.factoring' },
    { id: 'formula-a', item: 'quadratic.formula' },
    { id: 'discriminant-a', item: 'quadratic.discriminant' },
  ] },
  { id: 'identities', domain: 'algebra', stage: 'high', status: 'comingSoon', sets: [
    { id: 'binomial-a', item: 'identities.binomial' },
    { id: 'identity-a', item: 'identities.identity' },
    { id: 'inequality-proof-a', item: 'identities.inequality-proof' },
  ] },
  { id: 'polynomial-equations', domain: 'algebra', stage: 'high', status: 'comingSoon', sets: [
    { id: 'remainder-a', item: 'polynomial-equations.remainder' },
    { id: 'higher-degree-a', item: 'polynomial-equations.higher-degree' },
  ] },
  { id: 'quadratic-function', domain: 'functions', stage: 'high', status: 'comingSoon', sets: [
    { id: 'vertex-a', item: 'quadratic-function.vertex' },
    { id: 'max-min-a', item: 'quadratic-function.max-min' },
  ] },
  { id: 'sequence', domain: 'functions', stage: 'high', status: 'comingSoon', sets: [
    { id: 'arithmetic-a', item: 'sequence.arithmetic' },
    { id: 'geometric-a', item: 'sequence.geometric' },
    { id: 'sigma-a', item: 'sequence.sigma' },
    { id: 'recurrence-a', item: 'sequence.recurrence' },
  ] },
  { id: 'trig', domain: 'functions', stage: 'high', status: 'comingSoon', sets: [
    { id: 'values-a', item: 'trig.values' },
    { id: 'radian-a', item: 'trig.radian' },
    { id: 'addition-a', item: 'trig.addition' },
    { id: 'synthesis-a', item: 'trig.synthesis' },
  ] },
  { id: 'exp-log', domain: 'functions', stage: 'high', status: 'comingSoon', sets: [
    { id: 'exponent-a', item: 'exp-log.exponent' },
    { id: 'log-a', item: 'exp-log.log' },
  ] },
  { id: 'conic', domain: 'functions', stage: 'high', status: 'comingSoon', sets: [
    { id: 'parabola-a', item: 'conic.parabola' },
    { id: 'ellipse-hyperbola-a', item: 'conic.ellipse-hyperbola' },
    { id: 'polar-a', item: 'conic.polar' },
  ] },
  { id: 'combinatorics', domain: 'data', stage: 'high', status: 'comingSoon', sets: [
    { id: 'permutations-a', item: 'combinatorics.permutations' },
    { id: 'combinations-a', item: 'combinatorics.combinations' },
    { id: 'probability-a', item: 'combinatorics.probability' },
    { id: 'conditional-a', item: 'combinatorics.conditional' },
    { id: 'expectation-a', item: 'combinatorics.expectation' },
  ] },
  { id: 'distributions', domain: 'data', stage: 'high', status: 'comingSoon', sets: [
    { id: 'binomial-a', item: 'distributions.binomial' },
    { id: 'normal-a', item: 'distributions.normal' },
  ] },
  { id: 'limit', domain: 'calculus', stage: 'high', status: 'comingSoon', sets: [
    { id: 'sequence-a', item: 'limit.sequence' },
    { id: 'function-a', item: 'limit.function' },
  ] },
  { id: 'derivative', domain: 'calculus', stage: 'high', status: 'comingSoon', sets: [
    { id: 'polynomial-a', item: 'derivative.polynomial' },
    { id: 'tangent-a', item: 'derivative.tangent' },
    { id: 'extrema-a', item: 'derivative.extrema' },
    { id: 'transcendental-a', item: 'derivative.transcendental' },
    { id: 'chain-rule-a', item: 'derivative.chain-rule' },
  ] },
  { id: 'integral', domain: 'calculus', stage: 'high', status: 'comingSoon', sets: [
    { id: 'indefinite-a', item: 'integral.indefinite' },
    { id: 'definite-a', item: 'integral.definite' },
    { id: 'area-a', item: 'integral.area' },
    { id: 'substitution-a', item: 'integral.substitution' },
    { id: 'by-parts-a', item: 'integral.by-parts' },
    { id: 'volume-a', item: 'integral.volume' },
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
    { id: 'region-a', item: 'coordinate-geometry.region' },
  ] },
  { id: 'vector', domain: 'linear-algebra', stage: 'high', status: 'comingSoon', sets: [
    { id: 'components-a', item: 'vector.components' },
    { id: 'dot-product-a', item: 'vector.dot-product' },
    { id: 'angle-a', item: 'vector.angle' },
    { id: 'space-a', item: 'vector.space' },
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
  { id: 'vector-space', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', sets: [
    { id: 'independence-a', item: 'vector-space.independence' },
    { id: 'basis-a', item: 'vector-space.basis' },
    { id: 'rank-a', item: 'vector-space.rank' },
  ] },
  { id: 'linear-map', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', sets: [
    { id: 'matrix-rep-a', item: 'linear-map.matrix-rep' },
    { id: 'kernel-image-a', item: 'linear-map.kernel-image' },
  ] },
  { id: 'eigen', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', sets: [
    { id: 'eigenvalues-a', item: 'eigen.eigenvalues' },
    { id: 'eigenvectors-a', item: 'eigen.eigenvectors' },
    { id: 'diagonalize-a', item: 'eigen.diagonalize' },
  ] },
  { id: 'inner-product', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', sets: [
    { id: 'orthogonal-a', item: 'inner-product.orthogonal' },
    { id: 'gram-schmidt-a', item: 'inner-product.gram-schmidt' },
  ] },
  { id: 'rate', domain: 'functions', stage: 'elementary', status: 'comingSoon', sets: [
    { id: 'speed-a', item: 'rate.speed' },
    { id: 'per-unit-a', item: 'rate.per-unit' },
  ] },
  { id: 'angles', domain: 'geometry', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'parallel-a', item: 'angles.parallel' },
    { id: 'polygon-a', item: 'angles.polygon' },
  ] },
  { id: 'congruence', domain: 'geometry', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'conditions-a', item: 'congruence.conditions' },
    { id: 'triangles-a', item: 'congruence.triangles' },
    { id: 'parallelogram-a', item: 'congruence.parallelogram' },
  ] },
  { id: 'circle-solid', domain: 'geometry', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'sector-a', item: 'circle-solid.sector' },
    { id: 'solid-a', item: 'circle-solid.solid' },
  ] },
  { id: 'similarity', domain: 'geometry', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'similarity-a', item: 'similarity.similarity' },
    { id: 'inscribed-angle-a', item: 'similarity.inscribed-angle' },
  ] },
  { id: 'transformations', domain: 'geometry', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'moves-a', item: 'transformations.moves' },
  ] },
  { id: 'triangle-trig', domain: 'geometry', stage: 'high', status: 'comingSoon', sets: [
    { id: 'sine-law-a', item: 'triangle-trig.sine-law' },
    { id: 'cosine-law-a', item: 'triangle-trig.cosine-law' },
    { id: 'area-a', item: 'triangle-trig.area' },
  ] },
  { id: 'triangle-properties', domain: 'geometry', stage: 'high', status: 'comingSoon', sets: [
    { id: 'centers-a', item: 'triangle-properties.centers' },
    { id: 'power-a', item: 'triangle-properties.power' },
    { id: 'ceva-menelaus-a', item: 'triangle-properties.ceva-menelaus' },
  ] },
  { id: 'quartiles', domain: 'data', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'quartiles-a', item: 'quartiles.quartiles' },
    { id: 'boxplot-a', item: 'quartiles.boxplot' },
  ] },
  { id: 'sampling', domain: 'data', stage: 'middle', status: 'comingSoon', sets: [
    { id: 'population-sample-a', item: 'sampling.population-sample' },
    { id: 'estimate-a', item: 'sampling.estimate' },
  ] },
  { id: 'statistics', domain: 'data', stage: 'high', status: 'comingSoon', sets: [
    { id: 'variance-a', item: 'statistics.variance' },
    { id: 'correlation-a', item: 'statistics.correlation' },
  ] },
  { id: 'inference', domain: 'data', stage: 'university', status: 'comingSoon', sets: [
    { id: 'estimation-a', item: 'inference.estimation' },
    { id: 'testing-a', item: 'inference.testing' },
  ] },
  { id: 'sets', domain: 'logic', stage: 'high', status: 'comingSoon', sets: [
    { id: 'operations-a', item: 'sets.operations' },
    { id: 'venn-a', item: 'sets.venn' },
  ] },
  { id: 'logic', domain: 'logic', stage: 'high', status: 'comingSoon', sets: [
    { id: 'negation-a', item: 'logic.negation' },
    { id: 'conditions-a', item: 'logic.conditions' },
    { id: 'truth-table-a', item: 'logic.truth-table' },
  ] },
  { id: 'mapping', domain: 'logic', stage: 'university', status: 'comingSoon', sets: [
    { id: 'injective-a', item: 'mapping.injective' },
    { id: 'equivalence-a', item: 'mapping.equivalence' },
  ] },
  { id: 'series', domain: 'calculus', stage: 'university', status: 'comingSoon', sets: [
    { id: 'series-a', item: 'series.series' },
    { id: 'taylor-a', item: 'series.taylor' },
  ] },
  { id: 'improper-integral', domain: 'calculus', stage: 'university', status: 'comingSoon', sets: [
    { id: 'improper-a', item: 'improper-integral.improper' },
  ] },
  { id: 'multivariable', domain: 'calculus', stage: 'university', status: 'comingSoon', sets: [
    { id: 'partial-a', item: 'multivariable.partial' },
    { id: 'double-integral-a', item: 'multivariable.double-integral' },
  ] },
  { id: 'ode', domain: 'calculus', stage: 'university', status: 'comingSoon', sets: [
    { id: 'separable-a', item: 'ode.separable' },
    { id: 'linear-first-a', item: 'ode.linear-first' },
    { id: 'second-order-a', item: 'ode.second-order' },
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
