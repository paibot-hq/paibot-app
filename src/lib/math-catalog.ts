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
    { id: 'within-10', sets: [{ id: '1', rule: 'within-10-a' }] },
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
    { id: 'by-two-digit', sets: [{ id: '1', rule: 'div-by-two-digit-a' }] },
  ] },
  { id: 'division-remainder', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'formula', items: [
    { id: 'remainder', sets: [{ id: '1', rule: 'divmod-a' }] },
  ] },
  { id: 'arith', domain: 'number', stage: 'elementary', status: 'published', kind: 'expression', items: [
    { id: 'order-of-operations', sets: [{ id: '1', rule: 'order-a' }, { id: '2', rule: 'order-a' }] },
    { id: 'rules', sets: [{ id: '1', rule: 'rules-a' }] },
    { id: 'simple-word-problems', sets: [{ id: '1', rule: 'word-a' }] },
    { id: 'word-problems', sets: [{ id: '1', rule: 'word-b' }] },
  ] },
  { id: 'unknowns', domain: 'algebra', stage: 'elementary', status: 'comingSoon', kind: 'formula', items: [
    { id: 'box', sets: [{ id: '1', rule: 'box-a' }] },
    { id: 'letters', sets: [{ id: '1', rule: 'letters-value-a' }] },
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
    { id: 'add-sub-tenths', sets: [{ id: '1', rule: 'decimal-tenths-a' }] },
    { id: 'add-sub', sets: [{ id: '1', rule: 'decimal-add-sub-a' }] },
    { id: 'mul-div-whole', sets: [{ id: '1', rule: 'decimal-whole-a' }] },
    { id: 'mul-div', sets: [{ id: '1', rule: 'decimal-mul-div-a' }] },
  ] },
  { id: 'fraction', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'formula', items: [
    { id: 'unit-fractions', sets: [{ id: '1' }] },
    { id: 'meaning', sets: [{ id: '1' }] },
    { id: 'simplify', sets: [{ id: '1', rule: 'fraction-simplify-a' }] },
    { id: 'fraction-decimal', sets: [{ id: '1', rule: 'fraction-decimal-a' }] },
    { id: 'add-sub-like', sets: [{ id: '1', rule: 'fraction-like-a' }] },
    { id: 'mixed', sets: [{ id: '1', rule: 'mixed-a' }] },
    { id: 'add-sub', sets: [{ id: '1', rule: 'fraction-add-sub-a' }] },
    { id: 'mul-div', sets: [{ id: '1', rule: 'fraction-mul-div-a' }] },
  ] },
  { id: 'divisors', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'formula', items: [
    { id: 'divisors', sets: [{ id: '1', rule: 'divisor-a' }] },
    { id: 'gcd-lcm', sets: [{ id: '1', rule: 'gcd-lcm-a' }] },
  ] },
  { id: 'rounding', domain: 'number', stage: 'elementary', status: 'comingSoon', kind: 'formula', items: [
    { id: 'rounding', sets: [{ id: '1', rule: 'round-a' }] },
    { id: 'estimate', sets: [{ id: '1', rule: 'estimate-a' }] },
  ] },
  { id: 'ratio', domain: 'data', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'simple-ratio', sets: [{ id: '1' }] },
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
    { id: 'prism-volume', sets: [{ id: '1' }] },
  ] },
  { id: 'shapes', domain: 'geometry', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'solids-basic', sets: [{ id: '1' }] },
    { id: 'basic-shapes', sets: [{ id: '1' }] },
    { id: 'boxes', sets: [{ id: '1' }] },
    { id: 'triangles', sets: [{ id: '1' }] },
    { id: 'quadrilaterals', sets: [{ id: '1' }] },
    { id: 'circles', sets: [{ id: '1' }] },
    { id: 'compass-drawing', sets: [{ id: '1' }] },
    { id: 'angles', sets: [{ id: '1' }] },
    { id: 'perpendicular-parallel', sets: [{ id: '1' }] },
    { id: 'parallel-drawing', sets: [{ id: '1' }] },
    { id: 'cuboids', sets: [{ id: '1' }] },
    { id: 'congruent', sets: [{ id: '1' }] },
    { id: 'congruent-drawing', sets: [{ id: '1' }] },
    { id: 'angle-sum', sets: [{ id: '1' }] },
    { id: 'prisms', sets: [{ id: '1' }] },
  ] },
  { id: 'symmetry', domain: 'geometry', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'symmetry', sets: [{ id: '1' }] },
    { id: 'scale', sets: [{ id: '1' }] },
  ] },
  { id: 'data', domain: 'data', stage: 'elementary', status: 'comingSoon', kind: 'formula', items: [
    { id: 'average', sets: [{ id: '1', rule: 'average-a' }] },
    { id: 'median-range', sets: [{ id: '1', rule: 'median-range-a' }] },
  ] },
  { id: 'graphs', domain: 'data', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'tables', sets: [{ id: '1' }] },
    { id: 'bar-graph', sets: [{ id: '1' }] },
    { id: 'line-graph', sets: [{ id: '1' }] },
    { id: 'two-way-table', sets: [{ id: '1' }] },
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
    { id: 'scientific', sets: [{ id: '1', rule: 'scientific-a' }] },
  ] },
  { id: 'expression', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'value', sets: [{ id: '1', rule: 'expression-value-a' }] },
    { id: 'like-terms', sets: [{ id: '1', rule: 'like-terms-a' }] },
    { id: 'distribute', sets: [{ id: '1', rule: 'distribute-a' }] },
    { id: 'polynomials', sets: [{ id: '1', rule: 'polynomials-a' }] },
    { id: 'rearrange', sets: [{ id: '1', rule: 'rearrange-a' }] },
  ] },
  { id: 'linear-equation', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'basic', sets: [{ id: '1', rule: 'linear-basic-a' }] },
    { id: 'parentheses', sets: [{ id: '1', rule: 'linear-parentheses-a' }] },
    { id: 'fraction', sets: [{ id: '1', rule: 'linear-fraction-a' }] },
    { id: 'proportion', sets: [{ id: '1', rule: 'proportion-ratio-a' }] },
    { id: 'word-problems', sets: [{ id: '1' }] },
  ] },
  { id: 'simultaneous', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'elimination', sets: [{ id: '1', rule: 'simultaneous-elimination-a' }] },
    { id: 'substitution', sets: [{ id: '1', rule: 'simultaneous-substitution-a' }] },
    { id: 'word-problems', sets: [{ id: '1' }] },
  ] },
  { id: 'linear-function', domain: 'functions', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'proportion', sets: [{ id: '1', rule: 'proportional-a' }] },
    { id: 'slope', sets: [{ id: '1', rule: 'slope-a' }] },
    { id: 'two-points', sets: [{ id: '1', rule: 'two-points-a' }] },
    { id: 'equations', sets: [{ id: '1', rule: 'lines-a' }] },
  ] },
  { id: 'square-function', domain: 'functions', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'graph', sets: [{ id: '1' }] },
    { id: 'rate-of-change', sets: [{ id: '1', rule: 'rate-a' }] },
    { id: 'intersection', sets: [{ id: '1', rule: 'parabola-line-a' }] },
  ] },
  { id: 'inequality', domain: 'algebra', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'linear', sets: [{ id: '1', rule: 'ineq-linear-a' }] },
    { id: 'quadratic', sets: [{ id: '1', rule: 'ineq-quadratic-a' }] },
    { id: 'absolute', sets: [{ id: '1', rule: 'ineq-absolute-a' }] },
  ] },
  { id: 'expansion', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'formulas', sets: [{ id: '1', rule: 'expansion-formulas-a' }] },
    { id: 'square', sets: [{ id: '1', rule: 'expansion-square-a' }] },
    { id: 'sum-difference', sets: [{ id: '1', rule: 'expansion-sum-difference-a' }] },
    { id: 'three-terms', sets: [{ id: '1', rule: 'expansion-three-a' }] },
    { id: 'cubic', sets: [{ id: '1', rule: 'expansion-cubic-a' }] },
  ] },
  { id: 'factorization', domain: 'algebra', stage: 'middle', status: 'published', kind: 'factorization', items: [
    { id: 'trinomial', sets: [{ id: '1', rule: 'trinomial-a' }] },
    { id: 'perfect-square', sets: [{ id: '1', rule: 'perfect-square-a' }] },
    { id: 'difference-of-squares', sets: [{ id: '1', rule: 'squares-a' }] },
  ] },
  { id: 'factoring', domain: 'algebra', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'common-factor', sets: [{ id: '1', rule: 'common-factor-a' }] },
    { id: 'ac-method', sets: [{ id: '1', rule: 'ac-method-a' }] },
    { id: 'two-variables', sets: [{ id: '1', rule: 'two-variables-a' }] },
    { id: 'substitution', sets: [{ id: '1', rule: 'substitution-a' }] },
    { id: 'cubes', sets: [{ id: '1', rule: 'factoring-cubes-a' }] },
  ] },
  { id: 'sqrt', domain: 'number', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'rational-irrational', sets: [{ id: '1' }] },
    { id: 'simplify', sets: [{ id: '1', rule: 'sqrt-simplify-a' }] },
    { id: 'add-sub', sets: [{ id: '1', rule: 'sqrt-add-sub-a' }] },
    { id: 'rationalize', sets: [{ id: '1', rule: 'sqrt-rationalize-a' }] },
    { id: 'double-radical', sets: [{ id: '1', rule: 'double-radical-a' }] },
  ] },
  { id: 'prime', domain: 'number', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'prime', sets: [{ id: '1', rule: 'prime-factor-a' }] },
  ] },
  { id: 'integers', domain: 'number', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'euclid', sets: [{ id: '1', rule: 'euclid-a' }] },
    { id: 'diophantine', sets: [{ id: '1', rule: 'diophantine-a' }] },
    { id: 'base-n', sets: [{ id: '1', rule: 'base-n-a' }] },
    { id: 'congruence', sets: [{ id: '1', rule: 'congruence-a' }] },
  ] },
  { id: 'pythagoras', domain: 'geometry', stage: 'middle', status: 'published', kind: 'pythagoras', items: [
    { id: 'sides', sets: [{ id: '1', rule: 'sides-a' }] },
    { id: 'applications', sets: [{ id: '1' }] },
  ] },
  { id: 'probability', domain: 'data', stage: 'middle', status: 'comingSoon', items: [
    { id: 'relative-frequency', sets: [{ id: '1' }] },
    { id: 'basic', sets: [{ id: '1' }] },
  ] },
  { id: 'quadratic', domain: 'algebra', stage: 'middle', status: 'comingSoon', kind: 'formula', items: [
    { id: 'factoring', sets: [{ id: '1', rule: 'quadratic-factoring-a' }] },
    { id: 'formula', sets: [{ id: '1', rule: 'quadratic-formula-a' }] },
    { id: 'discriminant', sets: [{ id: '1', rule: 'discriminant-a' }] },
  ] },
  { id: 'identities', domain: 'algebra', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'binomial', sets: [{ id: '1', rule: 'binomial-a' }] },
    { id: 'identity', sets: [{ id: '1', rule: 'identity-a' }] },
    { id: 'inequality-proof', sets: [{ id: '1', rule: 'amgm-a' }] },
  ] },
  { id: 'polynomial-equations', domain: 'algebra', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'remainder', sets: [{ id: '1', rule: 'remainder-a' }] },
    { id: 'higher-degree', sets: [{ id: '1', rule: 'higher-degree-a' }] },
  ] },
  { id: 'quadratic-function', domain: 'functions', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'vertex', sets: [{ id: '1', rule: 'graph-vertex-a' }] },
    { id: 'graph', sets: [{ id: '1', rule: 'graph-parabola-a' }] },
    { id: 'max-min', sets: [{ id: '1', rule: 'quad-max-min-a' }] },
  ] },
  { id: 'sequence', domain: 'functions', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'arithmetic', sets: [{ id: '1', rule: 'arithmetic-a' }] },
    { id: 'geometric', sets: [{ id: '1', rule: 'geometric-a' }] },
    { id: 'sigma', sets: [{ id: '1', rule: 'sigma-a' }] },
    { id: 'recurrence', sets: [{ id: '1', rule: 'recurrence-a' }] },
    { id: 'induction', sets: [{ id: '1', rule: 'induction-a' }] },
  ] },
  { id: 'trig', domain: 'functions', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'values', sets: [{ id: '1', rule: 'trig-values-a' }] },
    { id: 'radian', sets: [{ id: '1', rule: 'radian-a' }] },
    { id: 'addition', sets: [{ id: '1', rule: 'trig-addition-a' }] },
    { id: 'double-angle', sets: [{ id: '1', rule: 'double-angle-a' }] },
    { id: 'synthesis', sets: [{ id: '1', rule: 'trig-synthesis-a' }] },
    { id: 'graph', sets: [{ id: '1', rule: 'graph-trig-a' }] },
  ] },
  { id: 'exp-log', domain: 'functions', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'exponent', sets: [{ id: '1', rule: 'exponent-a' }] },
    { id: 'log', sets: [{ id: '1', rule: 'log-a' }] },
    { id: 'common-log', sets: [{ id: '1', rule: 'common-log-a' }] },
  ] },
  { id: 'conic', domain: 'functions', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'parabola', sets: [{ id: '1', rule: 'conic-parabola-a' }] },
    { id: 'ellipse-hyperbola', sets: [{ id: '1', rule: 'conic-ellipse-a' }] },
    { id: 'polar', sets: [{ id: '1', rule: 'conic-polar-a' }] },
  ] },
  { id: 'combinatorics', domain: 'data', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'permutations', sets: [{ id: '1', rule: 'permutation-a' }] },
    { id: 'combinations', sets: [{ id: '1', rule: 'combination-a' }] },
    { id: 'probability', sets: [{ id: '1' }] },
    { id: 'independent', sets: [{ id: '1' }] },
    { id: 'conditional', sets: [{ id: '1' }] },
    { id: 'expectation', sets: [{ id: '1', rule: 'expectation-a' }] },
  ] },
  { id: 'distributions', domain: 'data', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'random-variables', sets: [{ id: '1', rule: 'random-variables-a' }] },
    { id: 'binomial', sets: [{ id: '1', rule: 'binomial-dist-a' }] },
    { id: 'normal', sets: [{ id: '1', rule: 'normal-a' }] },
  ] },
  { id: 'limit', domain: 'calculus', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'sequence', sets: [{ id: '1', rule: 'lim-seq-a' }] },
    { id: 'function', sets: [{ id: '1', rule: 'lim-fn-a' }] },
  ] },
  { id: 'univ-calculus', domain: 'calculus', stage: 'university', status: 'comingSoon', items: [
    { id: 'mean-value', sets: [{ id: '1' }] },
  ] },
  { id: 'derivative', domain: 'calculus', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'polynomial', sets: [{ id: '1', rule: 'derivative-polynomial-a' }] },
    { id: 'tangent', sets: [{ id: '1', rule: 'tangent-a' }] },
    { id: 'extrema', sets: [{ id: '1', rule: 'extrema-a' }] },
    { id: 'transcendental', sets: [{ id: '1', rule: 'transcendental-a' }] },
    { id: 'chain-rule', sets: [{ id: '1', rule: 'chain-rule-a' }] },
    { id: 'parametric', sets: [{ id: '1', rule: 'parametric-a' }] },
    { id: 'motion', sets: [{ id: '1', rule: 'motion-a' }] },
  ] },
  { id: 'integral', domain: 'calculus', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'indefinite', sets: [{ id: '1', rule: 'indefinite-a' }] },
    { id: 'definite', sets: [{ id: '1', rule: 'definite-a' }] },
    { id: 'area', sets: [{ id: '1', rule: 'area-a' }] },
    { id: 'substitution', sets: [{ id: '1', rule: 'substitution-int-a' }] },
    { id: 'by-parts', sets: [{ id: '1', rule: 'parts-a' }] },
    { id: 'volume', sets: [{ id: '1', rule: 'volume-a' }] },
  ] },
  { id: 'complex', domain: 'number', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'arithmetic', sets: [{ id: '1', rule: 'complex-arithmetic-a' }] },
    { id: 'quadratic-roots', sets: [{ id: '1', rule: 'complex-roots-a' }] },
    { id: 'plane', sets: [{ id: '1', rule: 'complex-plane-a' }] },
  ] },
  { id: 'coordinate-geometry', domain: 'geometry', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'line', sets: [{ id: '1', rule: 'line-a' }, { id: '2', rule: 'graph-line-a' }] },
    { id: 'circle', sets: [{ id: '1', rule: 'circle-a' }, { id: '2', rule: 'graph-circle-a' }] },
    { id: 'locus', sets: [{ id: '1', rule: 'locus-a' }] },
    { id: 'region', sets: [{ id: '1', rule: 'region-a' }, { id: '2', rule: 'graph-region-a' }] },
  ] },
  { id: 'vector', domain: 'linear-algebra', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'components', sets: [{ id: '1', rule: 'vec-components-a' }] },
    { id: 'dot-product', sets: [{ id: '1', rule: 'vec-dot-a' }] },
    { id: 'angle', sets: [{ id: '1', rule: 'vec-angle-a' }] },
    { id: 'space', sets: [{ id: '1', rule: 'vec-space-a' }] },
  ] },
  { id: 'matrix', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', kind: 'formula', items: [
    { id: 'operations', sets: [{ id: '1', rule: 'matrix-ops-a' }] },
    { id: 'determinant', sets: [{ id: '1', rule: 'det2-a' }] },
    { id: 'general-determinant', sets: [{ id: '1', rule: 'det3-a' }] },
    { id: 'inverse', sets: [{ id: '1', rule: 'inverse-a' }] },
  ] },
  { id: 'linear-system', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', kind: 'formula', items: [
    { id: 'elimination', sets: [{ id: '1', rule: 'rref-a' }] },
    { id: 'solutions', sets: [{ id: '1', rule: 'nullity-a' }] },
  ] },
  { id: 'vector-space', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', kind: 'formula', items: [
    { id: 'independence', sets: [{ id: '1', rule: 'independence-a' }] },
    { id: 'basis', sets: [{ id: '1', rule: 'basis-a' }] },
    { id: 'rank', sets: [{ id: '1', rule: 'rank-a' }] },
  ] },
  { id: 'linear-map', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', kind: 'formula', items: [
    { id: 'matrix-rep', sets: [{ id: '1', rule: 'matrix-rep-a' }] },
    { id: 'kernel-image', sets: [{ id: '1', rule: 'kernel-image-a' }] },
  ] },
  { id: 'eigen', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', kind: 'formula', items: [
    { id: 'eigenvalues', sets: [{ id: '1', rule: 'eigvals-a' }] },
    { id: 'eigenvectors', sets: [{ id: '1', rule: 'eigenvector-a' }] },
    { id: 'diagonalize', sets: [{ id: '1', rule: 'diagonalize-a' }] },
  ] },
  { id: 'inner-product', domain: 'linear-algebra', stage: 'university', status: 'comingSoon', kind: 'formula', items: [
    { id: 'orthogonal', sets: [{ id: '1', rule: 'orthogonal-a' }] },
    { id: 'gram-schmidt', sets: [{ id: '1', rule: 'gram-schmidt-a' }] },
  ] },
  { id: 'rate', domain: 'functions', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'speed', sets: [{ id: '1' }] },
    { id: 'per-unit', sets: [{ id: '1' }] },
  ] },
  { id: 'relations', domain: 'functions', stage: 'elementary', status: 'comingSoon', items: [
    { id: 'change', sets: [{ id: '1' }] },
    { id: 'simple-proportion', sets: [{ id: '1' }] },
    { id: 'proportion', sets: [{ id: '1' }] },
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
    { id: 'solid-views', sets: [{ id: '1' }] },
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
  { id: 'geometric-reasoning', domain: 'geometry', stage: 'middle', status: 'comingSoon', items: [
    { id: 'construction', sets: [{ id: '1' }] },
    { id: 'congruence-proof', sets: [{ id: '1' }] },
    { id: 'similarity-proof', sets: [{ id: '1' }] },
    { id: 'circle-proof', sets: [{ id: '1' }] },
  ] },
  { id: 'triangle-trig', domain: 'geometry', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'ratios', sets: [{ id: '1', rule: 'triangle-ratio-a' }] },
    { id: 'sine-law', sets: [{ id: '1', rule: 'sine-law-a' }] },
    { id: 'cosine-law', sets: [{ id: '1', rule: 'cosine-law-a' }] },
    { id: 'area', sets: [{ id: '1', rule: 'triangle-area-a' }] },
  ] },
  { id: 'triangle-properties', domain: 'geometry', stage: 'high', status: 'comingSoon', items: [
    { id: 'centers', sets: [{ id: '1' }] },
    { id: 'power', sets: [{ id: '1' }] },
    { id: 'ceva-menelaus', sets: [{ id: '1' }] },
    { id: 'polyhedra', sets: [{ id: '1' }] },
    { id: 'construction', sets: [{ id: '1' }] },
  ] },
  { id: 'quartiles', domain: 'data', stage: 'middle', status: 'comingSoon', items: [
    { id: 'quartiles', sets: [{ id: '1' }] },
    { id: 'boxplot', sets: [{ id: '1' }] },
  ] },
  { id: 'frequency', domain: 'data', stage: 'middle', status: 'comingSoon', items: [
    { id: 'frequency', sets: [{ id: '1' }] },
  ] },
  { id: 'sampling', domain: 'data', stage: 'middle', status: 'comingSoon', items: [
    { id: 'population-sample', sets: [{ id: '1' }] },
    { id: 'estimate', sets: [{ id: '1' }] },
  ] },
  { id: 'statistics', domain: 'data', stage: 'high', status: 'comingSoon', kind: 'formula', items: [
    { id: 'variance', sets: [{ id: '1', rule: 'variance-a' }] },
    { id: 'correlation', sets: [{ id: '1', rule: 'correlation-a' }] },
    { id: 'hypothesis', sets: [{ id: '1' }] },
  ] },
  { id: 'inference', domain: 'data', stage: 'university', status: 'comingSoon', kind: 'formula', items: [
    { id: 'random-variables', sets: [{ id: '1' }] },
    { id: 'estimation', sets: [{ id: '1', rule: 'estimation-a' }] },
    { id: 'testing', sets: [{ id: '1', rule: 'testing-a' }] },
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
  { id: 'series', domain: 'calculus', stage: 'university', status: 'comingSoon', kind: 'formula', items: [
    { id: 'series', sets: [{ id: '1', rule: 'series-sum-a' }] },
    { id: 'taylor', sets: [{ id: '1', rule: 'taylor-a' }] },
  ] },
  { id: 'improper-integral', domain: 'calculus', stage: 'university', status: 'comingSoon', kind: 'formula', items: [
    { id: 'improper', sets: [{ id: '1', rule: 'improper-a' }] },
  ] },
  { id: 'multivariable', domain: 'calculus', stage: 'university', status: 'comingSoon', kind: 'formula', items: [
    { id: 'partial', sets: [{ id: '1', rule: 'partial-a' }] },
    { id: 'double-integral', sets: [{ id: '1', rule: 'double-a' }] },
    { id: 'polar', sets: [{ id: '1', rule: 'polar-double-a' }] },
  ] },
  { id: 'ode', domain: 'calculus', stage: 'university', status: 'comingSoon', kind: 'formula', items: [
    { id: 'separable', sets: [{ id: '1', rule: 'ode-separable-a' }] },
    { id: 'linear-first', sets: [{ id: '1', rule: 'ode-linear-a' }] },
    { id: 'second-order', sets: [{ id: '1', rule: 'ode-second-a' }] },
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
