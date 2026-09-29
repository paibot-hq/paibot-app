export type MathDomain = 'number' | 'algebra' | 'functions' | 'geometry' | 'data' | 'logic' | 'linear-algebra' | 'calculus';
export type MathStage = 'elementary' | 'middle' | 'high' | 'university';
// The shape of a unit's problems (the payload in D1 and src/data/math-<unit>.json):
// expression (arith's integer expressions, math-arith.ts), factorization,
// pythagoras (figures) or formula (math-formula.ts). Checked by
// scripts/validate-math-{arith,factorization,pythagoras,formula}.mjs.
export type MathKind = 'expression' | 'factorization' | 'pythagoras' | 'formula';
export interface MathSet { id: string; rule?: string }
export interface MathItem { id: string; sets: readonly MathSet[] }
export interface MathCatalogUnit {
  id: string;
  domain: MathDomain;
  stage: MathStage;
  status: 'published' | 'comingSoon';
  // Only units that can hold problems have a kind.
  kind?: MathKind;
  items: readonly MathItem[];
}

export const MATH_STAGES: readonly MathStage[] = ['elementary', 'middle', 'high', 'university'];

export const MATH_DOMAINS: readonly MathDomain[] = ['number', 'algebra', 'functions', 'geometry', 'data', 'logic', 'linear-algebra', 'calculus'];

// Display order and stable IDs for the math roadmap; no problem data here.
// unit → learning item → practice set. A set with a `rule` (a key in the
// unit kind's scripts/validate-math-*.mjs) can hold problems; its URL is
// /math/<unit>/<item>/<set>. Names live under App.math.units.<unit>.
export const MATH_CATALOG: readonly MathCatalogUnit[] = [
  { id: 'addition', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'expression', items: [
    { id: 'carry', sets: [{ id: 'a', rule: 'carry-a' }] },
    { id: 'two-digit', sets: [{ id: 'a', rule: 'two-digit-a' }] },
    { id: 'column', sets: [{ id: 'a', rule: 'column-a' }] },
  ] },
  { id: 'multiplication', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'expression', items: [
    { id: 'times-table', sets: [{ id: 'a', rule: 'times-table-a' }] },
    { id: 'by-one-digit', sets: [{ id: 'a', rule: 'mul-by-one-digit-a' }] },
    { id: 'by-two-digit', sets: [{ id: 'a', rule: 'mul-by-two-digit-a' }] },
  ] },
  { id: 'division', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'expression', items: [
    { id: 'basic', sets: [{ id: 'a', rule: 'div-basic-a' }] },
    { id: 'remainder', sets: [{ id: 'a' }] },
    { id: 'by-two-digit', sets: [{ id: 'a', rule: 'div-by-two-digit-a' }] },
  ] },
  { id: 'arith', domain: 'number', stage: 'elementary', status: 'published', kind: 'expression', items: [
    { id: 'order-of-operations', sets: [{ id: 'a', rule: 'order-a' }, { id: 'b', rule: 'order-a' }] },
    { id: 'rules', sets: [{ id: 'a', rule: 'rules-a' }] },
    { id: 'word-problems', sets: [{ id: 'a', rule: 'word-a' }, { id: 'b', rule: 'word-b' }] },
  ] },
  { id: 'place-value', domain: 'number', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'place-value', sets: [{ id: 'a' }] },
    { id: 'large-numbers', sets: [{ id: 'a' }] },
  ] },
  { id: 'time', domain: 'geometry', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'reading', sets: [{ id: 'a' }] },
    { id: 'elapsed', sets: [{ id: 'a' }] },
  ] },
  { id: 'decimal', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'formula', items: [
    { id: 'add-sub', sets: [{ id: 'a', rule: 'decimal-add-sub-a' }] },
    { id: 'mul-div', sets: [{ id: 'a', rule: 'decimal-mul-div-a' }] },
  ] },
  { id: 'fraction', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'formula', items: [
    { id: 'simplify', sets: [{ id: 'a', rule: 'fraction-simplify-a' }] },
    { id: 'add-sub', sets: [{ id: 'a', rule: 'fraction-add-sub-a' }] },
    { id: 'mul-div', sets: [{ id: 'a', rule: 'fraction-mul-div-a' }] },
  ] },
  { id: 'divisors', domain: 'number', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'divisors', sets: [{ id: 'a' }] },
    { id: 'gcd-lcm', sets: [{ id: 'a' }] },
  ] },
  { id: 'rounding', domain: 'number', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'rounding', sets: [{ id: 'a' }] },
    { id: 'estimate', sets: [{ id: 'a' }] },
  ] },
  { id: 'ratio', domain: 'data', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'percent', sets: [{ id: 'a' }] },
    { id: 'ratio', sets: [{ id: 'a' }] },
    { id: 'word-problems', sets: [{ id: 'a' }] },
  ] },
  { id: 'measurement', domain: 'geometry', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'units', sets: [{ id: 'a' }] },
    { id: 'area-volume', sets: [{ id: 'a' }] },
    { id: 'circle', sets: [{ id: 'a' }] },
  ] },
  { id: 'shapes', domain: 'geometry', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'triangles-quads', sets: [{ id: 'a' }] },
    { id: 'circles', sets: [{ id: 'a' }] },
    { id: 'angles', sets: [{ id: 'a' }] },
  ] },
  { id: 'symmetry', domain: 'geometry', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'symmetry', sets: [{ id: 'a' }] },
    { id: 'scale', sets: [{ id: 'a' }] },
  ] },
  { id: 'data', domain: 'data', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'average', sets: [{ id: 'a' }] },
    { id: 'median-range', sets: [{ id: 'a' }] },
  ] },
  { id: 'graphs', domain: 'data', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'tables', sets: [{ id: 'a' }] },
    { id: 'line-graph', sets: [{ id: 'a' }] },
    { id: 'pie-band', sets: [{ id: 'a' }] },
    { id: 'histogram', sets: [{ id: 'a' }] },
  ] },
  { id: 'counting', domain: 'data', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'arrangements', sets: [{ id: 'a' }] },
    { id: 'combinations', sets: [{ id: 'a' }] },
  ] },
  { id: 'signed', domain: 'number', stage: 'middle', status: 'published', kind: 'expression', items: [
    { id: 'four-operations', sets: [{ id: 'a', rule: 'four-ops-a' }] },
  ] },
  { id: 'exponents', domain: 'number', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'powers', sets: [{ id: 'a', rule: 'powers-a' }] },
    { id: 'scientific', sets: [{ id: 'a' }] },
  ] },
  { id: 'expression', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'value', sets: [{ id: 'a', rule: 'expression-value-a' }] },
    { id: 'like-terms', sets: [{ id: 'a', rule: 'like-terms-a' }] },
    { id: 'distribute', sets: [{ id: 'a', rule: 'distribute-a' }] },
    { id: 'rearrange', sets: [{ id: 'a' }] },
  ] },
  { id: 'linear-equation', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'basic', sets: [{ id: 'a', rule: 'linear-basic-a' }] },
    { id: 'parentheses', sets: [{ id: 'a', rule: 'linear-parentheses-a' }] },
    { id: 'fraction', sets: [{ id: 'a', rule: 'linear-fraction-a' }] },
    { id: 'word-problems', sets: [{ id: 'a' }] },
  ] },
  { id: 'simultaneous', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'elimination', sets: [{ id: 'a', rule: 'simultaneous-elimination-a' }] },
    { id: 'substitution', sets: [{ id: 'a', rule: 'simultaneous-substitution-a' }] },
    { id: 'word-problems', sets: [{ id: 'a' }] },
  ] },
  { id: 'linear-function', domain: 'functions', stage: 'middle', status: 'comingSoon', items: [
    { id: 'proportion', sets: [{ id: 'a' }] },
    { id: 'slope', sets: [{ id: 'a' }] },
    { id: 'two-points', sets: [{ id: 'a' }] },
    { id: 'equations', sets: [{ id: 'a' }] },
  ] },
  { id: 'square-function', domain: 'functions', stage: 'middle', status: 'comingSoon', items: [
    { id: 'graph', sets: [{ id: 'a' }] },
    { id: 'rate-of-change', sets: [{ id: 'a' }] },
    { id: 'intersection', sets: [{ id: 'a' }] },
  ] },
  { id: 'inequality', domain: 'algebra', stage: 'high', status: 'comingSoon', items: [
    { id: 'linear', sets: [{ id: 'a' }] },
    { id: 'quadratic', sets: [{ id: 'a' }] },
    { id: 'absolute', sets: [{ id: 'a' }] },
  ] },
  { id: 'expansion', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'formulas', sets: [{ id: 'a', rule: 'expansion-formulas-a' }] },
    { id: 'square', sets: [{ id: 'a', rule: 'expansion-square-a' }] },
    { id: 'sum-difference', sets: [{ id: 'a', rule: 'expansion-sum-difference-a' }] },
  ] },
  { id: 'factorization', domain: 'algebra', stage: 'middle', status: 'published', kind: 'factorization', items: [
    { id: 'common-factor', sets: [{ id: 'a' }] },
    { id: 'trinomial', sets: [{ id: 'a', rule: 'trinomial-a' }] },
    { id: 'perfect-square', sets: [{ id: 'a', rule: 'perfect-square-a' }] },
    { id: 'difference-of-squares', sets: [{ id: 'a', rule: 'squares-a' }] },
  ] },
  { id: 'sqrt', domain: 'number', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'simplify', sets: [{ id: 'a', rule: 'sqrt-simplify-a' }] },
    { id: 'add-sub', sets: [{ id: 'a', rule: 'sqrt-add-sub-a' }] },
    { id: 'rationalize', sets: [{ id: 'a', rule: 'sqrt-rationalize-a' }] },
  ] },
  { id: 'prime', domain: 'number', stage: 'middle', status: 'comingSoon', items: [
    { id: 'prime', sets: [{ id: 'a' }] },
  ] },
  { id: 'integers', domain: 'number', stage: 'high', status: 'comingSoon', items: [
    { id: 'euclid', sets: [{ id: 'a' }] },
    { id: 'base-n', sets: [{ id: 'a' }] },
    { id: 'congruence', sets: [{ id: 'a' }] },
  ] },
  { id: 'pythagoras', domain: 'geometry', stage: 'middle', status: 'published', kind: 'pythagoras', items: [
    { id: 'sides', sets: [{ id: 'a', rule: 'sides-a' }] },
  ] },
  { id: 'probability', domain: 'data', stage: 'middle', status: 'comingSoon', items: [
    { id: 'basic', sets: [{ id: 'a' }] },
  ] },
  { id: 'quadratic', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'factoring', sets: [{ id: 'a', rule: 'quadratic-factoring-a' }] },
    { id: 'formula', sets: [{ id: 'a', rule: 'quadratic-formula-a' }] },
    { id: 'discriminant', sets: [{ id: 'a' }] },
  ] },
  { id: 'identities', domain: 'algebra', stage: 'high', status: 'comingSoon', items: [
    { id: 'binomial', sets: [{ id: 'a' }] },
    { id: 'identity', sets: [{ id: 'a' }] },
    { id: 'inequality-proof', sets: [{ id: 'a' }] },
  ] },
  { id: 'polynomial-equations', domain: 'algebra', stage: 'high', status: 'comingSoon', items: [
    { id: 'remainder', sets: [{ id: 'a' }] },
    { id: 'higher-degree', sets: [{ id: 'a' }] },
  ] },
  { id: 'quadratic-function', domain: 'functions', stage: 'high', status: 'comingSoon', items: [
    { id: 'vertex', sets: [{ id: 'a' }] },
    { id: 'max-min', sets: [{ id: 'a' }] },
  ] },
  { id: 'sequence', domain: 'functions', stage: 'high', status: 'comingSoon', items: [
    { id: 'arithmetic', sets: [{ id: 'a' }] },
    { id: 'geometric', sets: [{ id: 'a' }] },
    { id: 'sigma', sets: [{ id: 'a' }] },
    { id: 'recurrence', sets: [{ id: 'a' }] },
  ] },
  { id: 'trig', domain: 'functions', stage: 'high', status: 'comingSoon', items: [
    { id: 'values', sets: [{ id: 'a' }] },
    { id: 'radian', sets: [{ id: 'a' }] },
    { id: 'addition', sets: [{ id: 'a' }] },
    { id: 'synthesis', sets: [{ id: 'a' }] },
  ] },
  { id: 'exp-log', domain: 'functions', stage: 'high', status: 'comingSoon', items: [
    { id: 'exponent', sets: [{ id: 'a' }] },
    { id: 'log', sets: [{ id: 'a' }] },
  ] },
  { id: 'conic', domain: 'functions', stage: 'high', status: 'comingSoon', items: [
    { id: 'parabola', sets: [{ id: 'a' }] },
    { id: 'ellipse-hyperbola', sets: [{ id: 'a' }] },
    { id: 'polar', sets: [{ id: 'a' }] },
  ] },
  { id: 'combinatorics', domain: 'data', stage: 'high', status: 'comingSoon', items: [
    { id: 'permutations', sets: [{ id: 'a' }] },
    { id: 'combinations', sets: [{ id: 'a' }] },
    { id: 'probability', sets: [{ id: 'a' }] },
    { id: 'conditional', sets: [{ id: 'a' }] },
    { id: 'expectation', sets: [{ id: 'a' }] },
  ] },
  { id: 'distributions', domain: 'data', stage: 'high', status: 'comingSoon', items: [
    { id: 'binomial', sets: [{ id: 'a' }] },
    { id: 'normal', sets: [{ id: 'a' }] },
  ] },
  { id: 'limit', domain: 'calculus', stage: 'high', status: 'comingSoon', items: [
    { id: 'sequence', sets: [{ id: 'a' }] },
    { id: 'function', sets: [{ id: 'a' }] },
  ] },
  { id: 'derivative', domain: 'calculus', stage: 'high', status: 'comingSoon', items: [
    { id: 'polynomial', sets: [{ id: 'a' }] },
    { id: 'tangent', sets: [{ id: 'a' }] },
    { id: 'extrema', sets: [{ id: 'a' }] },
    { id: 'transcendental', sets: [{ id: 'a' }] },
    { id: 'chain-rule', sets: [{ id: 'a' }] },
  ] },
  { id: 'integral', domain: 'calculus', stage: 'high', status: 'comingSoon', items: [
    { id: 'indefinite', sets: [{ id: 'a' }] },
    { id: 'definite', sets: [{ id: 'a' }] },
    { id: 'area', sets: [{ id: 'a' }] },
    { id: 'substitution', sets: [{ id: 'a' }] },
    { id: 'by-parts', sets: [{ id: 'a' }] },
    { id: 'volume', sets: [{ id: 'a' }] },
  ] },
  { id: 'complex', domain: 'number', stage: 'high', status: 'comingSoon', items: [
    { id: 'arithmetic', sets: [{ id: 'a' }] },
    { id: 'quadratic-roots', sets: [{ id: 'a' }] },
    { id: 'plane', sets: [{ id: 'a' }] },
  ] },
  { id: 'coordinate-geometry', domain: 'geometry', stage: 'high', status: 'comingSoon', items: [
    { id: 'line', sets: [{ id: 'a' }] },
    { id: 'circle', sets: [{ id: 'a' }] },
    { id: 'locus', sets: [{ id: 'a' }] },
    { id: 'region', sets: [{ id: 'a' }] },
  ] },
  { id: 'vector', domain: 'linear-algebra', stage: 'high', status: 'comingSoon', items: [
    { id: 'components', sets: [{ id: 'a' }] },
    { id: 'dot-product', sets: [{ id: 'a' }] },
    { id: 'angle', sets: [{ id: 'a' }] },
    { id: 'space', sets: [{ id: 'a' }] },
  ] },
  { id: 'matrix', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', items: [
    { id: 'operations', sets: [{ id: 'a' }] },
    { id: 'determinant', sets: [{ id: 'a' }] },
    { id: 'inverse', sets: [{ id: 'a' }] },
  ] },
  { id: 'linear-system', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', items: [
    { id: 'elimination', sets: [{ id: 'a' }] },
    { id: 'solutions', sets: [{ id: 'a' }] },
  ] },
  { id: 'vector-space', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', items: [
    { id: 'independence', sets: [{ id: 'a' }] },
    { id: 'basis', sets: [{ id: 'a' }] },
    { id: 'rank', sets: [{ id: 'a' }] },
  ] },
  { id: 'linear-map', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', items: [
    { id: 'matrix-rep', sets: [{ id: 'a' }] },
    { id: 'kernel-image', sets: [{ id: 'a' }] },
  ] },
  { id: 'eigen', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', items: [
    { id: 'eigenvalues', sets: [{ id: 'a' }] },
    { id: 'eigenvectors', sets: [{ id: 'a' }] },
    { id: 'diagonalize', sets: [{ id: 'a' }] },
  ] },
  { id: 'inner-product', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', items: [
    { id: 'orthogonal', sets: [{ id: 'a' }] },
    { id: 'gram-schmidt', sets: [{ id: 'a' }] },
  ] },
  { id: 'rate', domain: 'functions', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'speed', sets: [{ id: 'a' }] },
    { id: 'per-unit', sets: [{ id: 'a' }] },
  ] },
  { id: 'angles', domain: 'geometry', stage: 'middle', status: 'comingSoon', items: [
    { id: 'parallel', sets: [{ id: 'a' }] },
    { id: 'polygon', sets: [{ id: 'a' }] },
  ] },
  { id: 'congruence', domain: 'geometry', stage: 'middle', status: 'comingSoon', items: [
    { id: 'conditions', sets: [{ id: 'a' }] },
    { id: 'triangles', sets: [{ id: 'a' }] },
    { id: 'parallelogram', sets: [{ id: 'a' }] },
  ] },
  { id: 'circle-solid', domain: 'geometry', stage: 'middle', status: 'comingSoon', items: [
    { id: 'sector', sets: [{ id: 'a' }] },
    { id: 'solid', sets: [{ id: 'a' }] },
  ] },
  { id: 'similarity', domain: 'geometry', stage: 'middle', status: 'comingSoon', items: [
    { id: 'similarity', sets: [{ id: 'a' }] },
    { id: 'inscribed-angle', sets: [{ id: 'a' }] },
  ] },
  { id: 'transformations', domain: 'geometry', stage: 'middle', status: 'comingSoon', items: [
    { id: 'moves', sets: [{ id: 'a' }] },
  ] },
  { id: 'triangle-trig', domain: 'geometry', stage: 'high', status: 'comingSoon', items: [
    { id: 'sine-law', sets: [{ id: 'a' }] },
    { id: 'cosine-law', sets: [{ id: 'a' }] },
    { id: 'area', sets: [{ id: 'a' }] },
  ] },
  { id: 'triangle-properties', domain: 'geometry', stage: 'high', status: 'comingSoon', items: [
    { id: 'centers', sets: [{ id: 'a' }] },
    { id: 'power', sets: [{ id: 'a' }] },
    { id: 'ceva-menelaus', sets: [{ id: 'a' }] },
  ] },
  { id: 'quartiles', domain: 'data', stage: 'middle', status: 'comingSoon', items: [
    { id: 'quartiles', sets: [{ id: 'a' }] },
    { id: 'boxplot', sets: [{ id: 'a' }] },
  ] },
  { id: 'sampling', domain: 'data', stage: 'middle', status: 'comingSoon', items: [
    { id: 'population-sample', sets: [{ id: 'a' }] },
    { id: 'estimate', sets: [{ id: 'a' }] },
  ] },
  { id: 'statistics', domain: 'data', stage: 'high', status: 'comingSoon', items: [
    { id: 'variance', sets: [{ id: 'a' }] },
    { id: 'correlation', sets: [{ id: 'a' }] },
  ] },
  { id: 'inference', domain: 'data', stage: 'university', status: 'comingSoon', items: [
    { id: 'estimation', sets: [{ id: 'a' }] },
    { id: 'testing', sets: [{ id: 'a' }] },
  ] },
  { id: 'sets', domain: 'logic', stage: 'high', status: 'comingSoon', items: [
    { id: 'operations', sets: [{ id: 'a' }] },
    { id: 'venn', sets: [{ id: 'a' }] },
  ] },
  { id: 'logic', domain: 'logic', stage: 'high', status: 'comingSoon', items: [
    { id: 'negation', sets: [{ id: 'a' }] },
    { id: 'conditions', sets: [{ id: 'a' }] },
    { id: 'truth-table', sets: [{ id: 'a' }] },
  ] },
  { id: 'mapping', domain: 'logic', stage: 'university', status: 'comingSoon', items: [
    { id: 'injective', sets: [{ id: 'a' }] },
    { id: 'equivalence', sets: [{ id: 'a' }] },
  ] },
  { id: 'series', domain: 'calculus', stage: 'university', status: 'comingSoon', items: [
    { id: 'series', sets: [{ id: 'a' }] },
    { id: 'taylor', sets: [{ id: 'a' }] },
  ] },
  { id: 'improper-integral', domain: 'calculus', stage: 'university', status: 'comingSoon', items: [
    { id: 'improper', sets: [{ id: 'a' }] },
  ] },
  { id: 'multivariable', domain: 'calculus', stage: 'university', status: 'comingSoon', items: [
    { id: 'partial', sets: [{ id: 'a' }] },
    { id: 'double-integral', sets: [{ id: 'a' }] },
  ] },
  { id: 'ode', domain: 'calculus', stage: 'university', status: 'comingSoon', items: [
    { id: 'separable', sets: [{ id: 'a' }] },
    { id: 'linear-first', sets: [{ id: 'a' }] },
    { id: 'second-order', sets: [{ id: 'a' }] },
  ] },
];

export function findUnit(id: string) {
  return MATH_CATALOG.find(unit => unit.id === id);
}

export function getComingSoonUnit(id: string) {
  return MATH_CATALOG.find(unit => unit.id === id && unit.status === 'comingSoon');
}

// Every unit whose problems have this shape.
export function unitsOfKind(kind: MathKind): readonly string[] {
  return MATH_CATALOG.filter(unit => unit.kind === kind).map(unit => unit.id);
}

// A unit's sets flattened, in display order, with the item each belongs to.
export function unitSets(unitId: string): { item: string; id: string; rule?: string }[] {
  return (findUnit(unitId)?.items ?? []).flatMap(item => item.sets.map(set => ({ item: item.id, ...set })));
}

// Shared by the HTML robots tag and Worker response headers, including .data requests.
export function isComingSoonMathPath(pathname: string): boolean {
  const match = /^\/(?:ja|en|zh)\/math\/([^/]+?)(?:\.data)?(?:\/|$)/.exec(pathname);
  return !!match && !!getComingSoonUnit(match[1]);
}
