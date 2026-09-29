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
// unit → learning item → practice set (1, 2, ...). A set with a `rule` (a key in the
// unit kind's scripts/validate-math-*.mjs) can hold problems; its URL is
// /math/<unit>/<item>/<set>. Names live under App.math.units.<unit>.
export const MATH_CATALOG: readonly MathCatalogUnit[] = [
  { id: 'addition', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'expression', items: [
    { id: 'carry', sets: [{ id: '1', rule: 'carry-a' }] },
    { id: 'two-digit', sets: [{ id: '1', rule: 'two-digit-a' }] },
    { id: 'column', sets: [{ id: '1', rule: 'column-a' }] },
  ] },
  { id: 'multiplication', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'expression', items: [
    { id: 'times-table', sets: [{ id: '1', rule: 'times-table-a' }] },
    { id: 'by-one-digit', sets: [{ id: '1', rule: 'mul-by-one-digit-a' }] },
    { id: 'by-two-digit', sets: [{ id: '1', rule: 'mul-by-two-digit-a' }] },
  ] },
  { id: 'division', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'expression', items: [
    { id: 'basic', sets: [{ id: '1', rule: 'div-basic-a' }] },
    { id: 'remainder', sets: [{ id: '1' }] },
    { id: 'by-two-digit', sets: [{ id: '1', rule: 'div-by-two-digit-a' }] },
  ] },
  { id: 'arith', domain: 'number', stage: 'elementary', status: 'published', kind: 'expression', items: [
    { id: 'order-of-operations', sets: [{ id: '1', rule: 'order-a' }, { id: '2', rule: 'order-a' }] },
    { id: 'rules', sets: [{ id: '1', rule: 'rules-a' }] },
    { id: 'simple-word-problems', sets: [{ id: '1', rule: 'word-a' }] },
    { id: 'word-problems', sets: [{ id: '1', rule: 'word-b' }] },
  ] },
  { id: 'place-value', domain: 'number', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'to-100', sets: [{ id: '1' }] },
    { id: 'to-10000', sets: [{ id: '1' }] },
    { id: 'ten-thousands', sets: [{ id: '1' }] },
    { id: 'large-numbers', sets: [{ id: '1' }] },
  ] },
  { id: 'time', domain: 'geometry', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'reading', sets: [{ id: '1' }] },
    { id: 'elapsed', sets: [{ id: '1' }] },
  ] },
  { id: 'decimal', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'formula', items: [
    { id: 'add-sub-tenths', sets: [{ id: '1' }] },
    { id: 'add-sub', sets: [{ id: '1', rule: 'decimal-add-sub-a' }] },
    { id: 'mul-div-whole', sets: [{ id: '1' }] },
    { id: 'mul-div', sets: [{ id: '1', rule: 'decimal-mul-div-a' }] },
  ] },
  { id: 'fraction', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'formula', items: [
    { id: 'simplify', sets: [{ id: '1', rule: 'fraction-simplify-a' }] },
    { id: 'add-sub-like', sets: [{ id: '1' }] },
    { id: 'add-sub', sets: [{ id: '1', rule: 'fraction-add-sub-a' }] },
    { id: 'mul-div', sets: [{ id: '1', rule: 'fraction-mul-div-a' }] },
  ] },
  { id: 'divisors', domain: 'number', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'divisors', sets: [{ id: '1' }] },
    { id: 'gcd-lcm', sets: [{ id: '1' }] },
  ] },
  { id: 'rounding', domain: 'number', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'rounding', sets: [{ id: '1' }] },
    { id: 'estimate', sets: [{ id: '1' }] },
  ] },
  { id: 'ratio', domain: 'data', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'percent', sets: [{ id: '1' }] },
    { id: 'ratio', sets: [{ id: '1' }] },
    { id: 'word-problems', sets: [{ id: '1' }] },
  ] },
  { id: 'measurement', domain: 'geometry', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'length-capacity', sets: [{ id: '1' }] },
    { id: 'weight', sets: [{ id: '1' }] },
    { id: 'area-units', sets: [{ id: '1' }] },
    { id: 'rect-area', sets: [{ id: '1' }] },
    { id: 'area', sets: [{ id: '1' }] },
    { id: 'volume', sets: [{ id: '1' }] },
    { id: 'circumference', sets: [{ id: '1' }] },
    { id: 'circle-area', sets: [{ id: '1' }] },
  ] },
  { id: 'shapes', domain: 'geometry', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'basic-shapes', sets: [{ id: '1' }] },
    { id: 'triangles', sets: [{ id: '1' }] },
    { id: 'quadrilaterals', sets: [{ id: '1' }] },
    { id: 'circles', sets: [{ id: '1' }] },
    { id: 'angles', sets: [{ id: '1' }] },
  ] },
  { id: 'symmetry', domain: 'geometry', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'symmetry', sets: [{ id: '1' }] },
    { id: 'scale', sets: [{ id: '1' }] },
  ] },
  { id: 'data', domain: 'data', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'average', sets: [{ id: '1' }] },
    { id: 'median-range', sets: [{ id: '1' }] },
  ] },
  { id: 'graphs', domain: 'data', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'tables', sets: [{ id: '1' }] },
    { id: 'bar-graph', sets: [{ id: '1' }] },
    { id: 'line-graph', sets: [{ id: '1' }] },
    { id: 'pie-band', sets: [{ id: '1' }] },
    { id: 'histogram', sets: [{ id: '1' }] },
  ] },
  { id: 'counting', domain: 'data', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'arrangements', sets: [{ id: '1' }] },
    { id: 'combinations', sets: [{ id: '1' }] },
  ] },
  { id: 'signed', domain: 'number', stage: 'middle', status: 'published', kind: 'expression', items: [
    { id: 'four-operations', sets: [{ id: '1', rule: 'four-ops-a' }] },
  ] },
  { id: 'exponents', domain: 'number', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'powers', sets: [{ id: '1', rule: 'powers-a' }] },
    { id: 'scientific', sets: [{ id: '1' }] },
  ] },
  { id: 'expression', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'value', sets: [{ id: '1', rule: 'expression-value-a' }] },
    { id: 'like-terms', sets: [{ id: '1', rule: 'like-terms-a' }] },
    { id: 'distribute', sets: [{ id: '1', rule: 'distribute-a' }] },
    { id: 'rearrange', sets: [{ id: '1' }] },
  ] },
  { id: 'linear-equation', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'basic', sets: [{ id: '1', rule: 'linear-basic-a' }] },
    { id: 'parentheses', sets: [{ id: '1', rule: 'linear-parentheses-a' }] },
    { id: 'fraction', sets: [{ id: '1', rule: 'linear-fraction-a' }] },
    { id: 'word-problems', sets: [{ id: '1' }] },
  ] },
  { id: 'simultaneous', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'elimination', sets: [{ id: '1', rule: 'simultaneous-elimination-a' }] },
    { id: 'substitution', sets: [{ id: '1', rule: 'simultaneous-substitution-a' }] },
    { id: 'word-problems', sets: [{ id: '1' }] },
  ] },
  { id: 'linear-function', domain: 'functions', stage: 'middle', status: 'comingSoon', items: [
    { id: 'proportion', sets: [{ id: '1' }] },
    { id: 'slope', sets: [{ id: '1' }] },
    { id: 'two-points', sets: [{ id: '1' }] },
    { id: 'equations', sets: [{ id: '1' }] },
  ] },
  { id: 'square-function', domain: 'functions', stage: 'middle', status: 'comingSoon', items: [
    { id: 'graph', sets: [{ id: '1' }] },
    { id: 'rate-of-change', sets: [{ id: '1' }] },
    { id: 'intersection', sets: [{ id: '1' }] },
  ] },
  { id: 'inequality', domain: 'algebra', stage: 'high', status: 'comingSoon', items: [
    { id: 'linear', sets: [{ id: '1' }] },
    { id: 'quadratic', sets: [{ id: '1' }] },
    { id: 'absolute', sets: [{ id: '1' }] },
  ] },
  { id: 'expansion', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'formulas', sets: [{ id: '1', rule: 'expansion-formulas-a' }] },
    { id: 'square', sets: [{ id: '1', rule: 'expansion-square-a' }] },
    { id: 'sum-difference', sets: [{ id: '1', rule: 'expansion-sum-difference-a' }] },
  ] },
  { id: 'factorization', domain: 'algebra', stage: 'middle', status: 'published', kind: 'factorization', items: [
    { id: 'common-factor', sets: [{ id: '1' }] },
    { id: 'trinomial', sets: [{ id: '1', rule: 'trinomial-a' }] },
    { id: 'perfect-square', sets: [{ id: '1', rule: 'perfect-square-a' }] },
    { id: 'difference-of-squares', sets: [{ id: '1', rule: 'squares-a' }] },
  ] },
  { id: 'sqrt', domain: 'number', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'simplify', sets: [{ id: '1', rule: 'sqrt-simplify-a' }] },
    { id: 'add-sub', sets: [{ id: '1', rule: 'sqrt-add-sub-a' }] },
    { id: 'rationalize', sets: [{ id: '1', rule: 'sqrt-rationalize-a' }] },
  ] },
  { id: 'prime', domain: 'number', stage: 'middle', status: 'comingSoon', items: [
    { id: 'prime', sets: [{ id: '1' }] },
  ] },
  { id: 'integers', domain: 'number', stage: 'high', status: 'comingSoon', items: [
    { id: 'euclid', sets: [{ id: '1' }] },
    { id: 'base-n', sets: [{ id: '1' }] },
    { id: 'congruence', sets: [{ id: '1' }] },
  ] },
  { id: 'pythagoras', domain: 'geometry', stage: 'middle', status: 'published', kind: 'pythagoras', items: [
    { id: 'sides', sets: [{ id: '1', rule: 'sides-a' }] },
  ] },
  { id: 'probability', domain: 'data', stage: 'middle', status: 'comingSoon', items: [
    { id: 'basic', sets: [{ id: '1' }] },
  ] },
  { id: 'quadratic', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'factoring', sets: [{ id: '1', rule: 'quadratic-factoring-a' }] },
    { id: 'formula', sets: [{ id: '1', rule: 'quadratic-formula-a' }] },
    { id: 'discriminant', sets: [{ id: '1' }] },
  ] },
  { id: 'identities', domain: 'algebra', stage: 'high', status: 'comingSoon', items: [
    { id: 'binomial', sets: [{ id: '1' }] },
    { id: 'identity', sets: [{ id: '1' }] },
    { id: 'inequality-proof', sets: [{ id: '1' }] },
  ] },
  { id: 'polynomial-equations', domain: 'algebra', stage: 'high', status: 'comingSoon', items: [
    { id: 'remainder', sets: [{ id: '1' }] },
    { id: 'higher-degree', sets: [{ id: '1' }] },
  ] },
  { id: 'quadratic-function', domain: 'functions', stage: 'high', status: 'comingSoon', items: [
    { id: 'vertex', sets: [{ id: '1' }] },
    { id: 'max-min', sets: [{ id: '1' }] },
  ] },
  { id: 'sequence', domain: 'functions', stage: 'high', status: 'comingSoon', items: [
    { id: 'arithmetic', sets: [{ id: '1' }] },
    { id: 'geometric', sets: [{ id: '1' }] },
    { id: 'sigma', sets: [{ id: '1' }] },
    { id: 'recurrence', sets: [{ id: '1' }] },
  ] },
  { id: 'trig', domain: 'functions', stage: 'high', status: 'comingSoon', items: [
    { id: 'values', sets: [{ id: '1' }] },
    { id: 'radian', sets: [{ id: '1' }] },
    { id: 'addition', sets: [{ id: '1' }] },
    { id: 'synthesis', sets: [{ id: '1' }] },
  ] },
  { id: 'exp-log', domain: 'functions', stage: 'high', status: 'comingSoon', items: [
    { id: 'exponent', sets: [{ id: '1' }] },
    { id: 'log', sets: [{ id: '1' }] },
  ] },
  { id: 'conic', domain: 'functions', stage: 'high', status: 'comingSoon', items: [
    { id: 'parabola', sets: [{ id: '1' }] },
    { id: 'ellipse-hyperbola', sets: [{ id: '1' }] },
    { id: 'polar', sets: [{ id: '1' }] },
  ] },
  { id: 'combinatorics', domain: 'data', stage: 'high', status: 'comingSoon', items: [
    { id: 'permutations', sets: [{ id: '1' }] },
    { id: 'combinations', sets: [{ id: '1' }] },
    { id: 'probability', sets: [{ id: '1' }] },
    { id: 'conditional', sets: [{ id: '1' }] },
    { id: 'expectation', sets: [{ id: '1' }] },
  ] },
  { id: 'distributions', domain: 'data', stage: 'high', status: 'comingSoon', items: [
    { id: 'binomial', sets: [{ id: '1' }] },
    { id: 'normal', sets: [{ id: '1' }] },
  ] },
  { id: 'limit', domain: 'calculus', stage: 'high', status: 'comingSoon', items: [
    { id: 'sequence', sets: [{ id: '1' }] },
    { id: 'function', sets: [{ id: '1' }] },
  ] },
  { id: 'derivative', domain: 'calculus', stage: 'high', status: 'comingSoon', items: [
    { id: 'polynomial', sets: [{ id: '1' }] },
    { id: 'tangent', sets: [{ id: '1' }] },
    { id: 'extrema', sets: [{ id: '1' }] },
    { id: 'transcendental', sets: [{ id: '1' }] },
    { id: 'chain-rule', sets: [{ id: '1' }] },
  ] },
  { id: 'integral', domain: 'calculus', stage: 'high', status: 'comingSoon', items: [
    { id: 'indefinite', sets: [{ id: '1' }] },
    { id: 'definite', sets: [{ id: '1' }] },
    { id: 'area', sets: [{ id: '1' }] },
    { id: 'substitution', sets: [{ id: '1' }] },
    { id: 'by-parts', sets: [{ id: '1' }] },
    { id: 'volume', sets: [{ id: '1' }] },
  ] },
  { id: 'complex', domain: 'number', stage: 'high', status: 'comingSoon', items: [
    { id: 'arithmetic', sets: [{ id: '1' }] },
    { id: 'quadratic-roots', sets: [{ id: '1' }] },
    { id: 'plane', sets: [{ id: '1' }] },
  ] },
  { id: 'coordinate-geometry', domain: 'geometry', stage: 'high', status: 'comingSoon', items: [
    { id: 'line', sets: [{ id: '1' }] },
    { id: 'circle', sets: [{ id: '1' }] },
    { id: 'locus', sets: [{ id: '1' }] },
    { id: 'region', sets: [{ id: '1' }] },
  ] },
  { id: 'vector', domain: 'linear-algebra', stage: 'high', status: 'comingSoon', items: [
    { id: 'components', sets: [{ id: '1' }] },
    { id: 'dot-product', sets: [{ id: '1' }] },
    { id: 'angle', sets: [{ id: '1' }] },
    { id: 'space', sets: [{ id: '1' }] },
  ] },
  { id: 'matrix', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', items: [
    { id: 'operations', sets: [{ id: '1' }] },
    { id: 'determinant', sets: [{ id: '1' }] },
    { id: 'inverse', sets: [{ id: '1' }] },
  ] },
  { id: 'linear-system', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', items: [
    { id: 'elimination', sets: [{ id: '1' }] },
    { id: 'solutions', sets: [{ id: '1' }] },
  ] },
  { id: 'vector-space', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', items: [
    { id: 'independence', sets: [{ id: '1' }] },
    { id: 'basis', sets: [{ id: '1' }] },
    { id: 'rank', sets: [{ id: '1' }] },
  ] },
  { id: 'linear-map', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', items: [
    { id: 'matrix-rep', sets: [{ id: '1' }] },
    { id: 'kernel-image', sets: [{ id: '1' }] },
  ] },
  { id: 'eigen', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', items: [
    { id: 'eigenvalues', sets: [{ id: '1' }] },
    { id: 'eigenvectors', sets: [{ id: '1' }] },
    { id: 'diagonalize', sets: [{ id: '1' }] },
  ] },
  { id: 'inner-product', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', items: [
    { id: 'orthogonal', sets: [{ id: '1' }] },
    { id: 'gram-schmidt', sets: [{ id: '1' }] },
  ] },
  { id: 'rate', domain: 'functions', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'speed', sets: [{ id: '1' }] },
    { id: 'per-unit', sets: [{ id: '1' }] },
  ] },
  { id: 'angles', domain: 'geometry', stage: 'middle', status: 'comingSoon', items: [
    { id: 'parallel', sets: [{ id: '1' }] },
    { id: 'polygon', sets: [{ id: '1' }] },
  ] },
  { id: 'congruence', domain: 'geometry', stage: 'middle', status: 'comingSoon', items: [
    { id: 'conditions', sets: [{ id: '1' }] },
    { id: 'triangles', sets: [{ id: '1' }] },
    { id: 'parallelogram', sets: [{ id: '1' }] },
  ] },
  { id: 'circle-solid', domain: 'geometry', stage: 'middle', status: 'comingSoon', items: [
    { id: 'sector', sets: [{ id: '1' }] },
    { id: 'solid', sets: [{ id: '1' }] },
  ] },
  { id: 'similarity', domain: 'geometry', stage: 'middle', status: 'comingSoon', items: [
    { id: 'similarity', sets: [{ id: '1' }] },
    { id: 'inscribed-angle', sets: [{ id: '1' }] },
  ] },
  { id: 'transformations', domain: 'geometry', stage: 'middle', status: 'comingSoon', items: [
    { id: 'moves', sets: [{ id: '1' }] },
  ] },
  { id: 'triangle-trig', domain: 'geometry', stage: 'high', status: 'comingSoon', items: [
    { id: 'ratios', sets: [{ id: '1' }] },
    { id: 'sine-law', sets: [{ id: '1' }] },
    { id: 'cosine-law', sets: [{ id: '1' }] },
    { id: 'area', sets: [{ id: '1' }] },
  ] },
  { id: 'triangle-properties', domain: 'geometry', stage: 'high', status: 'comingSoon', items: [
    { id: 'centers', sets: [{ id: '1' }] },
    { id: 'power', sets: [{ id: '1' }] },
    { id: 'ceva-menelaus', sets: [{ id: '1' }] },
  ] },
  { id: 'quartiles', domain: 'data', stage: 'middle', status: 'comingSoon', items: [
    { id: 'quartiles', sets: [{ id: '1' }] },
    { id: 'boxplot', sets: [{ id: '1' }] },
  ] },
  { id: 'sampling', domain: 'data', stage: 'middle', status: 'comingSoon', items: [
    { id: 'population-sample', sets: [{ id: '1' }] },
    { id: 'estimate', sets: [{ id: '1' }] },
  ] },
  { id: 'statistics', domain: 'data', stage: 'high', status: 'comingSoon', items: [
    { id: 'variance', sets: [{ id: '1' }] },
    { id: 'correlation', sets: [{ id: '1' }] },
  ] },
  { id: 'inference', domain: 'data', stage: 'university', status: 'comingSoon', items: [
    { id: 'estimation', sets: [{ id: '1' }] },
    { id: 'testing', sets: [{ id: '1' }] },
  ] },
  { id: 'sets', domain: 'logic', stage: 'high', status: 'comingSoon', items: [
    { id: 'operations', sets: [{ id: '1' }] },
    { id: 'venn', sets: [{ id: '1' }] },
  ] },
  { id: 'logic', domain: 'logic', stage: 'high', status: 'comingSoon', items: [
    { id: 'negation', sets: [{ id: '1' }] },
    { id: 'conditions', sets: [{ id: '1' }] },
    { id: 'truth-table', sets: [{ id: '1' }] },
  ] },
  { id: 'mapping', domain: 'logic', stage: 'university', status: 'comingSoon', items: [
    { id: 'injective', sets: [{ id: '1' }] },
    { id: 'equivalence', sets: [{ id: '1' }] },
  ] },
  { id: 'series', domain: 'calculus', stage: 'university', status: 'comingSoon', items: [
    { id: 'series', sets: [{ id: '1' }] },
    { id: 'taylor', sets: [{ id: '1' }] },
  ] },
  { id: 'improper-integral', domain: 'calculus', stage: 'university', status: 'comingSoon', items: [
    { id: 'improper', sets: [{ id: '1' }] },
  ] },
  { id: 'multivariable', domain: 'calculus', stage: 'university', status: 'comingSoon', items: [
    { id: 'partial', sets: [{ id: '1' }] },
    { id: 'double-integral', sets: [{ id: '1' }] },
  ] },
  { id: 'ode', domain: 'calculus', stage: 'university', status: 'comingSoon', items: [
    { id: 'separable', sets: [{ id: '1' }] },
    { id: 'linear-first', sets: [{ id: '1' }] },
    { id: 'second-order', sets: [{ id: '1' }] },
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
