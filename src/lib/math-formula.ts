// Formula problems: the question and every choice are plain-text formulas in
// one small grammar, shared with scripts/verify_math.py (which re-derives the
// answer with SymPy) and scripts/validate-math-formula.mjs (set rules). The
// page renders them to TeX here, so what is shown is exactly what was checked.
//
//   statement = equation (';' equation)* | expr
//   equation  = expr '=' expr
//   expr      = term (('+' | '-') term)*
//   term      = fraction (('*' | ':') fraction)*     ':' is shown as ÷
//   fraction  = unary ('/' unary)*                   shown as a fraction bar, so it binds
//                                                    first: 3/5 : 2/7 is (3/5) ÷ (2/7)
//   unary     = '-' unary | power
//   power     = atom ('^' unary)?                    exponents may be fractions: 8^(2/3)
//   atom      = number | letter | constant | call | '(' expr ')' | list
//   list      = '[' expr (',' expr)* ']'                a vector; a list of lists is a matrix
//   number    = digits with an optional decimal part (0.25)
//   letter    = one of a-z except i, a variable
//   constant  = pi | i (the imaginary unit) | oo (infinity, in limits, bounds and sums)
//   call      = sqrt(x) | sin(x) | cos(x) | tan(x) | abs(x) | log(x, base)
//             | C(n, k) | P(n, k) | sum(term, letter, from, to)
//
// Multiplication is always written with '*'; the TeX drops the sign where
// school math does (2x, 3\sqrt{2}, 2(x + 1), 2\pi) and shows × between numbers.
// Angles are in radians (sin(pi/6)).

// What the learner is asked to do with `question` (see verify_math.py):
//   calc       its value (after substituting `given`, if any)
//   expand     expand it; the keyed choice is written out
//   transform  the choice equal to it (e.g. a sine composition)
//   factor     factor it; the keyed choice is a product
//   solve      solve the equation(s)
//   remainder  the remainder when divided by `divisor`
//   derivative the derivative, or its value at `given` (x = a)
//   tangent    the tangent line y = ... at `given` (x = a)
//   extremum   the local maximum or minimum value (`which`)
//   integral   the indefinite integral (no constant), or the definite one over `bounds`
//   area       the area between y = question (or "f; g", two curves) and the x-axis over `bounds`
//   term       a `progression` given by its first terms ("3, 7, 11"): the term at
//              `given` (n = 10), or with no `given` the general term, an expression in n
//   series     the same, but the sum of the first n terms (at `given`, or S_n in n)
//   radian     degrees (a number) to radians, an expression in pi
//   degree     radians (an expression in pi) to degrees
//   recurrence "first; f" is a_1 = first, a_(n+1) = f (in a and n): term n at `given`
//              (n = 5), or with no `given` the general term, an expression in n
//   distribution  by `which`: mean, variance ("x1, x2; p1, p2" a table),
//              binomialMean, binomialVariance, binomialProb ("n, p", given k = 2),
//              zscore ("x, m, s": X in N(m, s^2))
//   geometry   by `which`: line-two-points ("x1, y1; x2, y2"), line-slope
//              ("x1, y1; m"), line-parallel, line-perpendicular ("f; x1, y1", the
//              line y = f through the point), circle-center ("cx, cy; r"),
//              circle-diameter ("x1, y1; x2, y2"), distance ("a, b, c; px, py":
//              the point to ax + by + c = 0). Lines and circles answer with an equation.
//   inequality by `which`: amgm-min, amgm-equal (question f(x): the minimum of f, or where it is
//              attained, for x > 0), product-sum (question k: the least a + b for a, b > 0, ab = k)
//   induction  "g; f" is the claim g(1) + ... + g(n) = f(n) (g in k, f in n), by `which`: base
//              (g(1)), add (g(k+1)), target (f(k+1)), combine (f(k) + g(k+1), simplified)
//   inference  by `which`: mean-interval ("xbar, sigma, n", given z = 1.96), ratio-interval
//              ("phat, n", given z), test-z ("xbar, mu0, sigma, n"); intervals answer "lo, hi"
//   region     "lhs; rhs; op" (op is <, >, <= or >=): the point ("x, y") in it (`which` in) or not in it (out)
//   geometry also has locus-equidistant ("x1, y1; x2, y2") and locus-ratio (".; .; m, n": PA : PB = m : n)
//   graph      a figure drawn from the hidden `question` (the learner reads the graph), by `which`:
//              line, parabola, trig (question f(x): choices "y = ..."), vertex (question f(x):
//              choices the point "h, k"), circle (question "cx, cy; r": choices equations),
//              region (question "lhs; rhs; op" in the region form of `region`, shaded: choices
//              inequalities "lhs; rhs; op")
//   number     whole-number facts, by `which`: gcd, lcm (question "12, 18"), divisor-count ("24"),
//              nth-multiple ("7, 5": the 5th multiple of 7), prime-factorization ("120": choices
//              like "2^3 * 3 * 5"), round-ones/-ten/-hundred/-thousand/-tenth/-hundredth ("3456"),
//              estimate ("398 * 52": each number to its top digit first), scientific ("35000":
//              choices "3.5 * 10^4"), to-improper ("2 + 3/5", style mixed), to-mixed ("17/5",
//              choices "3 + 2/5" drawn as mixed numbers)
//   stat       a list of data ("3, 8, 5, 8, 2"), by `which`: median, range, mode
//   function   by `which`: proportion / inverse ("x0, y0": choices "y = 3*x" / "y = 12/x"), slope,
//              intercept, xintercept (question "3*x + 2"), rate ("f; a, b": the average rate of
//              change from x = a to x = b), intersect-lines ("f; g": the point "x, y"),
//              intersect-parabola ("f; g": the x values "a, b"), rewrite (question "2*x + y = 5":
//              solved for y, choices "y = ...")
//   rearrange  an equation solved for the letter in `which` ("3*a + 2*b = 12", which "a")
//   inequality also has which "solve": question "lhs; rhs; op" (as region), choices the solution as
//              chains of relations joined by commas ("x > 3", "-1 < x < 4", "x <= -2, x >= 5")
//   quadratic  by `which`: discriminant, root-count (question "2*x^2 - 3*x + 1": the equation = 0),
//              krange (question "x^2 - 6*x + k": the k with two real roots, choices as intervals),
//              max, min (question "f; a, b": on a <= x <= b), max-all, min-all (question "f")
//   triangle   by `which`: sin, cos, tan (question "3, 4, ?": right angle at C, BC = 3, CA = 4),
//              sine-law ("a, A, B" degrees: find b), cosine-side ("a, b, C": find c),
//              cosine-cos ("a, b, c": cos C), triangle-area ("a, b, C": the area)
//   stat also has variance, std (a list), correlation (question "x list; y list")
//   number also has euclid (as gcd), diophantine ("a, b, c": the choice "x, y" with ax + by = c),
//              to-base ("45, 2": choices digit strings), from-base ("1011, 2"), remainder ("17, 5"),
//              power-mod ("7, 100, 5": the remainder of 7^100 divided by 5)
//   eigenvector "matrix; lambda": the eigenvector of the matrix for that eigenvalue (the choices are vectors)
//   ode        solve the initial value problem, by `which`: separable and linear ("f(x, y); x0, y0": y' = f with
//              y(x0) = y0), second ("a, b, c; y0, v0": ay'' + by' + cy = 0, y(0) = y0, y'(0) = v0); answer y in x
//   conic      by `which`: parabola-focus, parabola-directrix (question "y^2 = 8*x"), parabola-equation (question "p":
//              the focus (p, 0), answer the equation), ellipse-c, ellipse-major, hyperbola-c, hyperbola-asymptote
//              (question "x^2/25 + y^2/9 = 1"), polar-to-xy ("r, theta"), xy-to-polar ("x, y")
//   divmod     "a, b": the quotient and the remainder of a ÷ b; choices "q, r" are drawn q⋯r
//   classify   choose the irrational (which "irrational") or the rational (which "rational") number among the
//              four choices (question is unused: "0")
//   mvt        "f; a, b": the c in (a, b) of the mean value theorem; choices numbers
//   sets       "A; B" (lists of whole numbers), given the universe "1, 2, ...": by `which` union, intersection,
//              difference (A - B), complement (of A), complement-union, complement-intersection; choices lists
//   logic      by `which`: contrapositive, negation (question a condition "x > 2 => x^2 > 4"; choices conditions; see
//              parseCondition), necessary ("P; Q", choices: sufficient, necessary, both, neither),
//              truth (a condition in p, q; choices "T, F, T, T" for (p, q) = TT, TF, FT, FF)
//   mapping    by `which`: type ("A; B; 1>2, 2>1": f(1) = 2, ...; choices injective, surjective, bijective,
//              neither), relation ("A; 1~1, 1~2": choices reflexive, symmetric, transitive, equivalence = which
//              property fails, or that it is an equivalence relation)
//   figure     a figure drawn (components/math-shape.tsx) from the hidden numbers in `question`, by `which` (lengths in cm,
//              angles in degrees): rect-area "w, h", tri-area "b, h", para-area "b, h", trap-area "a, b, h", cuboid-volume
//              "w, d, h", circle-circumference and circle-area "r", prism-volume "b, h, length" (triangular prism),
//              cylinder-volume "r, h", cone-volume "r, h", sphere-volume and sphere-surface "r", angle-triangle "a, b" (the
//              third angle), angle-quad "a, b, c", parallel-vertical / -corresponding / -alternate / -cointerior "a" (the
//              angle x), polygon-interior-sum, -exterior, -each-interior "n" (a regular n-gon), sector-arc and sector-area
//              "r, angle", inscribed-angle "central angle", inscribed-same-arc "a", inscribed-diameter "a" (the other base
//              angle), similar-side "a, b, c" (x = b c / a), similar-area "m, n, S", power-chord "a, b, c" (PD), distance
//              "x1, y1, x2, y2", centroid "x1, y1, x2, y2, x3, y3" (choices points), clock-read "h, m" (choices "h, m"),
//              fraction-shaded "parts, shaded" (the shaded fraction)
//   identity   an equation in x with unknown constants; choices "a = 1, b = 2" make it an identity in x
export type FormulaStyle = 'times' | 'box' | 'ratio' | 'mixed';
export type FormulaKind = 'calc' | 'expand' | 'transform' | 'factor' | 'solve' | 'remainder' | 'derivative' | 'tangent' | 'extremum' | 'integral' | 'area' | 'term' | 'series' | 'radian' | 'degree' | 'recurrence' | 'distribution' | 'geometry' | 'identity' | 'inequality' | 'induction' | 'inference' | 'region' | 'graph' | 'number' | 'stat' | 'function' | 'rearrange' | 'quadratic' | 'triangle' | 'eigenvector' | 'ode' | 'conic' | 'divmod' | 'classify' | 'mvt' | 'sets' | 'logic' | 'mapping' | 'figure';

export interface FormulaPayload {
  kind: FormulaKind;
  question: string;
  // calc: values substituted ("x = 3, y = -2"); derivative/tangent: the point ("x = 1").
  given: string | null;
  // remainder: the divisor, e.g. "x - 2".
  divisor?: string;
  // integral/area: "a, b".
  bounds?: string;
  // extremum: 'max' or 'min'; distribution and geometry: the variant (see the kinds).
  which?: string;
  // term/series: what kind of sequence the first terms in `question` start.
  progression?: 'arithmetic' | 'geometric';
  // How the formula is drawn, for the grades that write it differently: 'times' keeps the
  // multiplication sign (4 × x, not 4x); 'box' draws the letter x as □; 'ratio' draws : as
  // a ratio (x : 4 = 6 : 8) instead of ÷; 'mixed' draws 2 + 3/5 as the mixed number 2⅗.
  style?: FormulaStyle;
  // A word problem: the prose per language and the unit of the answer; `question` is then the hidden
  // expression that solves it (a calc), and the choices are numbers shown with the unit.
  word?: Record<'ja' | 'en' | 'zh', { prompt: string; unit: string }>;
  // The worked solution, one line each: a chain "a = b = c" (or, for equations,
  // "x = 2, x = -2"), shown under the answer. SymPy checks every line.
  steps?: string[];
  // Expressions; for solve the solution, comma-separated values of the one
  // unknown ("-2, 5") or assignments ("x = 1, y = 2"); for tangent "y = ...".
  choices: string[];
}

type Node =
  | { type: 'num'; value: string }
  | { type: 'var'; name: string }
  | { type: 'const'; name: 'pi' | 'i' | 'oo' }
  | { type: 'list'; items: Node[] }
  | { type: 'neg'; arg: Node }
  | { type: 'group'; arg: Node }
  | { type: 'call'; name: string; args: Node[] }
  | { type: 'pow'; base: Node; exp: Node }
  | { type: 'bin'; op: '+' | '-' | '*' | '/' | ':'; left: Node; right: Node };

// Functions and how many arguments each takes.
// Beyond the school functions: exp, ln; matrices and vectors (det, inv, tr, rank, nullity, rref, T,
// dot, cross, norm, orth, jac, eigvals); complex numbers (arg, conj, re, im); calculus (lim, d,
// taylor, vol, arc, int2). What each computes is in scripts/verify_math.py.
const FUNCTIONS: Record<string, number | [number, number]> = {
  sqrt: 1, sin: 1, cos: 1, tan: 1, abs: 1, log: 2, C: 2, P: 2, sum: 4,
  exp: 1, ln: 1, det: 1, inv: 1, tr: 1, rank: 1, nullity: 1, rref: 1, T: 1, dot: 2, cross: 2, norm: 1, orth: 2, jac: 1, eigvals: 1,
  arg: 1, conj: 1, re: 1, im: 1, lim: 3, d: [2, 3], taylor: 3, vol: 3, arc: 3, int2: 7,
};

const TOKEN = /\s*(\d+(?:\.\d+)?|sqrt|sin|cos|tan|abs|log|sum|exp|ln|det|inv|tr|rank|nullity|rref|dot|cross|norm|orth|jac|eigvals|arg|conj|re|im|lim|taylor|vol|arc|int2|oo|pi|[CPTd](?=\s*\()|[a-z]|[-+*/:^()=;,\[\]])/y;

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < text.length) {
    if (/^\s*$/.test(text.slice(TOKEN.lastIndex))) break;
    const match = TOKEN.exec(text);
    if (!match) throw new Error(`Unexpected input in "${text}" at ${TOKEN.lastIndex}`);
    tokens.push(match[1]);
  }
  return tokens;
}

// Splits at `separator` outside parentheses: "log(8, 2), 3" -> ["log(8, 2)", " 3"].
export function splitTop(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(' || text[i] === '[') depth++;
    else if (text[i] === ')' || text[i] === ']') depth--;
    else if (text[i] === separator && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts;
}

// Parses one expression; throws on anything outside the grammar.
export function parseExpression(text: string): Node {
  const tokens = tokenize(text);
  let at = 0;
  const peek = () => tokens[at];
  const take = (expected?: string) => {
    const token = tokens[at++];
    if (token === undefined || (expected !== undefined && token !== expected)) throw new Error(`Expected ${expected ?? 'more input'} in "${text}"`);
    return token;
  };
  function expr(): Node {
    let node = term();
    while (peek() === '+' || peek() === '-') { const op = take() as '+' | '-'; node = { type: 'bin', op, left: node, right: term() }; }
    return node;
  }
  function term(): Node {
    let node = fraction();
    while (peek() === '*' || peek() === ':') { const op = take() as '*' | ':'; node = { type: 'bin', op, left: node, right: fraction() }; }
    return node;
  }
  function fraction(): Node {
    let node = unary();
    while (peek() === '/') { take(); node = { type: 'bin', op: '/', left: node, right: unary() }; }
    return node;
  }
  function unary(): Node {
    if (peek() === '-') { take(); return { type: 'neg', arg: unary() }; }
    return power();
  }
  function power(): Node {
    const base = atom();
    if (peek() === '^') { take(); return { type: 'pow', base, exp: unary() }; }
    return base;
  }
  function atom(): Node {
    const token = take();
    if (/^\d/.test(token)) return { type: 'num', value: token };
    if (token === 'pi' || token === 'i' || token === 'oo') return { type: 'const', name: token };
    if (token === '[') {
      const items = [expr()];
      while (peek() === ',') { take(); items.push(expr()); }
      take(']');
      return { type: 'list', items };
    }
    if (Object.hasOwn(FUNCTIONS, token)) {
      take('(');
      const args = [expr()];
      while (peek() === ',') { take(); args.push(expr()); }
      take(')');
      const arity = FUNCTIONS[token], [fewest, most] = Array.isArray(arity) ? arity : [arity, arity];
      if (args.length < fewest || args.length > most) throw new Error(`${token} takes ${fewest === most ? fewest : `${fewest} or ${most}`} argument(s) in "${text}"`);
      if (token === 'sum' && args[1].type !== 'var') throw new Error(`sum's second argument must be a letter in "${text}"`);
      return { type: 'call', name: token, args };
    }
    if (/^[a-z]$/.test(token)) return { type: 'var', name: token };
    if (token === '(') { const arg = expr(); take(')'); return { type: 'group', arg }; }
    throw new Error(`Unexpected "${token}" in "${text}"`);
  }
  const node = expr();
  if (at !== tokens.length) throw new Error(`Unexpected "${tokens[at]}" in "${text}"`);
  return node;
}

// The first token of a product's factor decides whether the × can be dropped:
// a number followed by a letter, function or parenthesis reads as a product.
function startsWithNumber(node: Node): boolean {
  if (node.type === 'num') return true;
  if (node.type === 'bin') return startsWithNumber(node.left);
  if (node.type === 'pow') return startsWithNumber(node.base);
  return false;
}

// A function's argument needs no parentheses when it is a single symbol or a fraction.
const bare = (node: Node) => ['num', 'var', 'const', 'list'].includes(node.type) || (node.type === 'bin' && node.op === '/');
const argTex = (node: Node) => bare(node) ? ` ${toTex(node)}` : `\\left(${toTex(unwrap(node))}\\right)`;

// Set while a payload with a `style` is drawn.
let drawStyle: FormulaStyle | undefined;
const withStyle = <T,>(style: FormulaStyle | undefined, draw: () => T): T => { const before = drawStyle; drawStyle = style; try { return draw(); } finally { drawStyle = before; } };

export function toTex(node: Node): string {
  switch (node.type) {
    case 'num': return node.value;
    case 'var': return drawStyle === 'box' && node.name === 'x' ? '\\square' : node.name;
    case 'const': return node.name === 'pi' ? '\\pi ' : node.name === 'oo' ? '\\infty ' : 'i';
    case 'list': return listTex(node);
    case 'neg': return `-${toTex(node.arg)}`;
    case 'group': return `\\left(${toTex(node.arg)}\\right)`;
    case 'pow': {
      // sin(x)^2 is written \sin^{2} x, never \sin x^{2} (which reads as sin(x^2)).
      const base = unwrap(node.base);
      if (base.type === 'call' && ['sin', 'cos', 'tan'].includes(base.name) && node.exp.type === 'num') return `\\${base.name}^{${node.exp.value}}${argTex(base.args[0])}`;
      return `${toTex(node.base)}^{${toTex(unwrap(node.exp))}}`;
    }
    case 'call': {
      const [a, b, c, d] = node.args;
      switch (node.name) {
        case 'sqrt': return `\\sqrt{${toTex(unwrap(a))}}`;
        case 'abs': return `\\left|${toTex(unwrap(a))}\\right|`;
        case 'log': return `\\log_{${toTex(unwrap(b))}}${argTex(a)}`;
        case 'C': case 'P': return `{}_{${toTex(unwrap(a))}}\\mathrm{${node.name}}_{${toTex(unwrap(b))}}`;
        case 'sum': return `\\sum_{${toTex(b)}=${toTex(unwrap(c))}}^{${toTex(unwrap(d))}}${a.type === 'bin' && (a.op === '+' || a.op === '-') ? `\\left(${toTex(a)}\\right)` : ` ${toTex(a)}`}`;
        case 'exp': return a.type === 'num' && a.value === '1' ? 'e' : `e^{${toTex(unwrap(a))}}`;
        case 'ln': return `\\ln${argTex(a)}`;
        case 'det': return a.type === 'list' && a.items.every(item => item.type === 'list') ? listTex(a, 'vmatrix') : `\\det${argTex(a)}`;
        case 'inv': return `${a.type === 'list' ? toTex(a) : `\\left(${toTex(unwrap(a))}\\right)`}^{-1}`;
        case 'T': return `${a.type === 'list' ? toTex(a) : `\\left(${toTex(unwrap(a))}\\right)`}^{T}`;
        case 'tr': return `\\operatorname{tr}${argTex(a)}`;
        case 'rank': return `\\operatorname{rank}${argTex(a)}`;
        case 'nullity': return `\\dim\\ker${argTex(a)}`;
        case 'rref': return `\\operatorname{rref}${argTex(a)}`;
        case 'dot': return `${toTex(a)} \\cdot ${toTex(b)}`;
        case 'cross': return `${toTex(a)} \\times ${toTex(b)}`;
        case 'norm': return `\\left\\|${toTex(unwrap(a))}\\right\\|`;
        case 'orth': return `\\operatorname{orth}_{${toTex(b)}}\\left(${toTex(a)}\\right)`;
        case 'jac': return `f\\begin{pmatrix} ${variablesOf(a).join(' \\\\ ')} \\end{pmatrix} = ${toTex(a)}`;
        case 'eigvals': return toTex(a);
        case 'arg': return `\\arg${argTex(a)}`;
        case 'conj': return `\\overline{${toTex(unwrap(a))}}`;
        case 're': return `\\operatorname{Re}${argTex(a)}`;
        case 'im': return `\\operatorname{Im}${argTex(a)}`;
        case 'lim': return `\\lim_{${toTex(b)} \\to ${toTex(unwrap(c))}}${bodyTex(a)}`;
        case 'd': {
          const order = node.args[2] ? toTex(unwrap(node.args[2])) : '1', partial = variablesOf(a).length > 1;
          const up = order === '1' ? '' : `^{${order}}`, letter = toTex(b);
          return `${partial ? `\\frac{\\partial${up}}{\\partial ${letter}${up}}` : `\\frac{d${up}}{d${letter}${up}}`}${bodyTex(a)}`;
        }
        case 'taylor': return `\\operatorname{T}_{${toTex(unwrap(c))}}\\left[${toTex(unwrap(a))}\\right]`;
        case 'vol': case 'arc': return `y = ${toTex(unwrap(a))},\\ ${toTex(unwrap(b))} \\le x \\le ${toTex(unwrap(c))}`;
        case 'int2': { const [f, y, y0, y1, xv, x0, x1] = node.args; return `\\int_{${toTex(unwrap(x0))}}^{${toTex(unwrap(x1))}}\\int_{${toTex(unwrap(y0))}}^{${toTex(unwrap(y1))}}${bodyTex(f)}\\,d${toTex(y)}\\,d${toTex(xv)}`; }
        default: return `\\${node.name}${argTex(a)}`;
      }
    }
    case 'bin': {
      const left = node.op === '*' ? coefficientTex(node.left) : toTex(node.left);
      // A negative right operand needs parentheses (2 * -x is 2 \times (-x), not 2-x; x - -y is x - (-y)).
      const right = node.right.type === 'neg' && ['*', '+', '-'].includes(node.op) ? `\\left(${toTex(node.right)}\\right)` : toTex(node.right);
      if (node.op === '/') {
        // A negative numerator or denominator puts its sign in front of the fraction bar.
        const numerator = unwrap(node.left), denominator = unwrap(node.right);
        if (numerator.type === 'neg') return `-\\frac{${toTex(unwrap(numerator.arg))}}{${toTex(denominator)}}`;
        if (denominator.type === 'neg') return `-\\frac{${toTex(numerator)}}{${toTex(unwrap(denominator.arg))}}`;
        return `\\frac{${toTex(numerator)}}{${toTex(denominator)}}`;
      }
      if (node.op === ':') return `${left} ${drawStyle === 'ratio' ? ':' : '\\div'} ${right}`;
      // A mixed number: 2 + 3/5 is drawn 2\frac{3}{5}.
      if (drawStyle === 'mixed' && node.op === '+' && node.left.type === 'num' && node.right.type === 'bin' && node.right.op === '/' && node.right.left.type === 'num' && node.right.right.type === 'num') return `${left}${right}`;
      // 3*pi/4 is 3 × (π/4) in the grammar but written \frac{3\pi}{4}, not a mixed-number-like 3\frac{\pi}{4}.
      if (node.op === '*' && node.right.type === 'bin' && node.right.op === '/' && !hasFraction(node.left)) {
        return toTex({ type: 'bin', op: '/', left: { type: 'bin', op: '*', left: node.left, right: node.right.left }, right: node.right.right });
      }
      if (node.op === '*' && node.right.type === 'pow' && node.right.base.type === 'num' && node.right.exp.type !== 'num') return `${left} \\cdot ${right}`;
      if (node.op === '*' && node.left.type === 'num' && node.left.value === '1' && drawStyle !== 'times') return toTex(node.right);
      if (node.op === '*' && (node.right.type === 'neg' || drawStyle === 'times')) return `${left} \\times ${right}`;
      if (node.op === '*') return startsWithNumber(node.right) ? `${left} \\times ${right}` : `${left}${right}`;
      return `${left} ${node.op} ${right}`;
    }
  }
}
// A list is a column vector; a list of lists is a matrix (rows), drawn with round brackets or, for a determinant, bars.
function listTex(node: Extract<Node, { type: 'list' }>, environment: 'pmatrix' | 'vmatrix' = 'pmatrix'): string {
  const rows = node.items.every(item => item.type === 'list') ? (node.items as Extract<Node, { type: 'list' }>[]).map(row => row.items.map(toTex).join(' & ')) : node.items.map(toTex);
  return `\\begin{${environment}} ${rows.join(' \\\\ ')} \\end{${environment}}`;
}
// The letters a formula is in, in alphabetical order.
function variablesOf(node: Node): string[] {
  const names = new Set<string>();
  const walk = (n: Node): void => {
    if (n.type === 'var') names.add(n.name);
    else if (n.type === 'neg' || n.type === 'group') walk(n.arg);
    else if (n.type === 'list') n.items.forEach(walk);
    else if (n.type === 'call') n.args.forEach(walk);
    else if (n.type === 'pow') { walk(n.base); walk(n.exp); }
    else if (n.type === 'bin') { walk(n.left); walk(n.right); }
  };
  walk(node);
  return [...names].sort();
}
// What follows \lim or d/dx: a sum or difference in parentheses, anything else as it is.
const bodyTex = (node: Node) => node.type === 'bin' && (node.op === '+' || node.op === '-') ? `\\left(${toTex(node)}\\right)` : ` ${toTex(unwrap(node))}`;
const hasFraction = (node: Node): boolean => node.type === 'bin' ? node.op === '/' || node.op === ':' || hasFraction(node.left) || hasFraction(node.right) : node.type === 'neg' && hasFraction(node.arg);
// A fraction coefficient needs no parentheses: (1/3)*x^3 is shown as \frac{1}{3}x^{3}.
function coefficientTex(node: Node): string {
  if (node.type === 'group' && node.arg.type === 'bin' && node.arg.op === '/') return toTex(node.arg);
  if (node.type === 'neg') return `-${coefficientTex(node.arg)}`;
  return toTex(node);
}
// A fraction bar already groups its parts: (x + 1)/2 is shown without parentheses.
const unwrap = (node: Node): Node => node.type === 'group' ? node.arg : node;

export const expressionTex = (text: string) => toTex(parseExpression(text));

// "x + y = 5; x - y = 1" -> a system shown one equation per line.
export function statementTex(text: string): string {
  const equations = text.split(';').map(part => part.split('=').map(side => expressionTex(side)).join(' = '));
  return equations.length === 1 ? equations[0] : `\\begin{cases} ${equations.join(' \\\\ ')} \\end{cases}`;
}

// A solve choice: "-2, 5" (values of the one unknown, `unknown` names it) or
// "x = 1, y = 2". Also used for `given` and tangent lines ("y = 2*x - 1").
export function solutionTex(text: string, unknown: string): string {
  return splitTop(text, ',').map(item => {
    const [name, value] = item.includes('=') ? item.split('=') : [unknown, item];
    return `${name.trim()} = ${expressionTex(value)}`;
  }).join(',\\ ');
}

// The letter a one-unknown equation or a function is in: x unless x is absent.
export function unknownOf(question: string): string {
  const letters = [...new Set(question.replace(/sqrt|sin|cos|tan|abs|log|sum|pi/g, ' ').match(/(?<![a-zA-Z])[a-hj-z](?![a-zA-Z])/g) ?? [])];
  return letters.includes('x') ? 'x' : letters.sort()[0] ?? 'x';
}

// The same expression with a letter replaced by another name (a -> a_{n}).
function renameVar(node: Node, from: string, to: string): Node {
  switch (node.type) {
    case 'var': return node.name === from ? { type: 'var', name: to } : node;
    case 'neg': case 'group': return { ...node, arg: renameVar(node.arg, from, to) };
    case 'list': return { ...node, items: node.items.map(item => renameVar(item, from, to)) };
    case 'call': return { ...node, args: node.args.map(arg => renameVar(arg, from, to)) };
    case 'pow': return { ...node, base: renameVar(node.base, from, to), exp: renameVar(node.exp, from, to) };
    case 'bin': return { ...node, left: renameVar(node.left, from, to), right: renameVar(node.right, from, to) };
    default: return node;
  }
}

const list = (text: string) => splitTop(text, ',').map(expressionTex);
const point = (text: string, name: string) => `${name}\\left(${list(text).join(', ')}\\right)`;
// ax + by + c with integer coefficients, signs folded into the operators.
function lineTex(a: number, b: number, c: number): string {
  const term = (n: number, letter: string, first: boolean) => n === 0 ? '' : `${first ? (n < 0 ? '-' : '') : n < 0 ? ' - ' : ' + '}${Math.abs(n) === 1 && letter ? '' : Math.abs(n)}${letter}`;
  return `${term(a, 'x', true)}${term(b, 'y', !a)}${c === 0 ? '' : term(c, '', !a && !b)}`;
}

// The question as shown, by kind: an integral sign with its bounds, curves as
// y = ..., equations as a system; the instruction line comes from the page's text.
export function formulaQuestionTex(p: Pick<FormulaPayload, 'kind' | 'question' | 'bounds'> & { given?: string | null; which?: string; style?: FormulaStyle }): string {
  return withStyle(p.style, () => questionTex(p));
}
function questionTex(p: Pick<FormulaPayload, 'kind' | 'question' | 'bounds'> & { given?: string | null; which?: string }): string {
  const x = unknownOf(p.question);
  switch (p.kind) {
    case 'solve': return statementTex(p.question);
    case 'integral': {
      const bounds = p.bounds ? splitTop(p.bounds, ',').map(expressionTex) : null;
      // Parentheses only around a sum: \int (3x^2 - 2) dx, but \int (x - 1)(x + 2) dx.
      const node = parseExpression(p.question);
      const body = node.type === 'bin' && (node.op === '+' || node.op === '-') ? `\\left(${toTex(node)}\\right)` : toTex(node);
      return `\\int${bounds ? `_{${bounds[0]}}^{${bounds[1]}}` : ''} ${body}\\,d${x}`;
    }
    case 'area': return p.question.split(';').map(curve => `y = ${expressionTex(curve)}`).join(',\\ ');
    case 'derivative': case 'tangent': case 'extremum': return `y = ${expressionTex(p.question)}`;
    case 'radian': return `${expressionTex(p.question)}^{\\circ}`;
    case 'degree': return `${expressionTex(p.question)}\\,\\mathrm{rad}`;
    case 'recurrence': {
      const [first, rule] = splitTop(p.question, ';');
      return `a_{1} = ${expressionTex(first)},\\ a_{n+1} = ${toTex(renameVar(parseExpression(rule), 'a', 'a_{n}'))}`;
    }
    case 'distribution': {
      const parts = splitTop(p.question, ';');
      if (['mean', 'variance'].includes(p.which ?? '')) {
        const values = list(parts[0]), probs = list(parts[1]);
        return `\\begin{array}{c|${'c'.repeat(values.length)}} X & ${values.join(' & ')} \\\\ \\hline P & ${probs.join(' & ')} \\end{array}`;
      }
      const [a, b, c] = list(parts[0]);
      if (p.which === 'zscore') return `X \\sim N\\left(${b}, ${c}^{2}\\right),\\ X = ${a}`;
      return `X \\sim B\\left(${a}, ${b}\\right)`;
    }
    case 'geometry': {
      const parts = splitTop(p.question, ';');
      switch (p.which) {
        case 'line-two-points': case 'circle-diameter': return `${point(parts[0], 'A')},\\ ${point(parts[1], 'B')}`;
        case 'line-slope': return `${point(parts[0], 'A')},\\ m = ${expressionTex(parts[1])}`;
        case 'line-parallel': case 'line-perpendicular': return `\\ell: y = ${expressionTex(parts[0])},\\ ${point(parts[1], 'A')}`;
        case 'circle-center': return `${point(parts[0], 'C')},\\ r = ${expressionTex(parts[1])}`;
        case 'locus-equidistant': return `${point(parts[0], 'A')},\\ ${point(parts[1], 'B')}`;
        case 'locus-ratio': { const [m, n] = list(parts[2]); return `${point(parts[0], 'A')},\\ ${point(parts[1], 'B')},\\ \\mathrm{PA} : \\mathrm{PB} = ${m} : ${n}`; }
        default: { const [a, b, c] = splitTop(parts[0], ',').map(Number); return `\\ell: ${lineTex(a, b, c)} = 0,\\ ${point(parts[1], 'P')}`; }
      }
    }
    case 'eigenvector': { const [matrix, lambda] = splitTop(p.question, ';'); return `A = ${expressionTex(matrix)},\\ \\lambda = ${expressionTex(lambda)}`; }
    case 'ode': {
      const parts = splitTop(p.question, ';');
      if (p.which === 'second') { const [a, b, c] = list(parts[0]), [y0, v0] = list(parts[1]); const coefficient = (n: string, mark: string) => n === '0' ? '' : `${n === '1' ? '' : n === '-1' ? '-' : n}${mark}`; return `${[coefficient(a, "y''"), coefficient(b, "y'"), coefficient(c, 'y')].filter(Boolean).join(' + ').replace(/\+ -/g, '- ')} = 0,\\ y(0) = ${y0},\\ y'(0) = ${v0}`; }
      const [x0, y0] = list(parts[1]);
      return `y' = ${toTex(renameVar(parseExpression(parts[0]), 'y', 'y'))},\\ y(${x0}) = ${y0}`;
    }
    case 'conic': {
      switch (p.which) {
        case 'parabola-equation': return `F\\left(${expressionTex(p.question)}, 0\\right)`;
        case 'polar-to-xy': { const [r, theta] = list(p.question); return `(r, \\theta) = \\left(${r}, ${theta}\\right)`; }
        case 'xy-to-polar': return `(x, y) = \\left(${list(p.question).join(', ')}\\right)`;
        default: return statementTex(p.question);
      }
    }
    case 'classify': return '';
    case 'mvt': { const [f, interval] = splitTop(p.question, ';'); const [a, b] = list(interval); return `f(x) = ${expressionTex(f)},\\ \\left[${a}, ${b}\\right]`; }
    case 'sets': {
      const [a, b] = splitTop(p.question, ';');
      const set = (text: string) => `\\left\\{${list(text).join(', ')}\\right\\}`;
      return `A = ${set(a)},\\ B = ${set(b)}${p.given ? `,\\ U = ${set(p.given)}` : ''}`;
    }
    case 'logic': {
      if (p.which === 'necessary') { const [a, b] = splitTop(p.question, ';'); return `P: ${conditionTex(a)},\\ Q: ${conditionTex(b)}`; }
      return conditionTex(p.question);
    }
    case 'mapping': {
      const parts = splitTop(p.question, ';');
      const set = (text: string) => `\\left\\{${list(text).join(', ')}\\right\\}`;
      if (p.which === 'relation') {
        const pairs = splitTop(parts[1], ',').map(pair => `\\left(${pair.split('~').map(expressionTex).join(', ')}\\right)`);
        // The pairs, four to a row, so a long relation does not run off the screen.
        const rows = Array.from({ length: Math.ceil(pairs.length / 4) }, (_, i) => pairs.slice(i * 4, i * 4 + 4).join(',\\ '));
        return `\\begin{array}{l} A = ${set(parts[0])} \\\\ R = \\{\\ ${rows.join(', \\\\ \\quad ')}\\ \\} \\end{array}`;
      }
      const values = splitTop(parts[2], ',').map(pair => pair.split('>').map(expressionTex));
      // The map as a table: x over f(x).
      return `\\begin{array}{l} f: ${set(parts[0])} \\to ${set(parts[1])} \\\\ \\begin{array}{c|${'c'.repeat(values.length)}} x & ${values.map(([from]) => from).join(' & ')} \\\\ \\hline f(x) & ${values.map(([, to]) => to).join(' & ')} \\end{array} \\end{array}`;
    }
    case 'divmod': { const [a, b] = list(p.question); return `${a} \\div ${b}`; }
    case 'identity': return statementTex(p.question);
    case 'quadratic': {
      const parts = splitTop(p.question, ';');
      if (['discriminant', 'root-count', 'krange'].includes(p.which ?? '')) return `${expressionTex(p.question)} = 0`;
      if (['max', 'min'].includes(p.which ?? '')) { const [a, b] = list(parts[1]); return `y = ${expressionTex(parts[0])}\\quad (${a} \\le x \\le ${b})`; }
      return `y = ${expressionTex(p.question)}`;
    }
    case 'triangle': {
      const v = list(p.question);
      switch (p.which) {
        case 'sin': case 'cos': case 'tan': return `\\angle C = 90^{\\circ},\\ BC = ${v[0]},\\ CA = ${v[1]}`;
        case 'sine-law': return `a = ${v[0]},\\ A = ${v[1]}^{\\circ},\\ B = ${v[2]}^{\\circ}`;
        case 'cosine-cos': return `a = ${v[0]},\\ b = ${v[1]},\\ c = ${v[2]}`;
        default: return `a = ${v[0]},\\ b = ${v[1]},\\ C = ${v[2]}^{\\circ}`;
      }
    }
    case 'number': {
      const v = list(p.question);
      switch (p.which) {
        case 'nth-multiple': case 'remainder': return '';
        case 'gcd': case 'lcm': case 'euclid': return v.join(',\\ ');
        case 'diophantine': { const [a, b, c] = splitTop(p.question, ',').map(Number); return `${lineTex(a, b, 0)} = ${c}`; }
        case 'to-base': return `${v[0]}_{(10)}`;
        case 'from-base': return `${v[0]}_{(${v[1]})}`;
        case 'power-mod': return `${v[0]}^{${v[1]}}`;
        default: return expressionTex(p.question);
      }
    }
    case 'stat': {
      if (p.which === 'correlation') {
        const [xs, ys] = splitTop(p.question, ';').map(list);
        return `\\begin{array}{c|${'c'.repeat(xs.length)}} x & ${xs.join(' & ')} \\\\ \\hline y & ${ys.join(' & ')} \\end{array}`;
      }
      return list(p.question).join(',\\ ');
    }
    case 'rearrange': return statementTex(p.question);
    case 'function': {
      const parts = splitTop(p.question, ';');
      switch (p.which) {
        case 'proportion': case 'inverse': { const [x0, y0] = list(p.question); return `x = ${x0},\\ y = ${y0}`; }
        case 'rewrite': return statementTex(p.question);
        case 'intersect-lines': case 'intersect-parabola': return parts.map(part => `y = ${expressionTex(part)}`).join(',\\ ');
        default: return `y = ${expressionTex(parts[0])}`;
      }
    }
    case 'inequality': return p.which === 'solve' ? inequalityTex(p.question) : p.which === 'product-sum' ? `a b = ${expressionTex(p.question)}` : expressionTex(p.question);
    case 'induction': {
      const [g, f] = splitTop(p.question, ';');
      const term = parseExpression(g);
      const body = term.type === 'bin' && (term.op === '+' || term.op === '-') ? `\\left(${toTex(term)}\\right)` : toTex(term);
      return `\\sum_{k=1}^{n} ${body} = ${expressionTex(f)}`;
    }
    case 'region': return inequalityTex(p.question);
    case 'graph': case 'figure': return '';
    case 'inference': {
      const v = list(splitTop(p.question, ';')[0]);
      if (p.which === 'mean-interval') return `\\bar{x} = ${v[0]},\\ \\sigma = ${v[1]},\\ n = ${v[2]}`;
      if (p.which === 'ratio-interval') return `\\hat{p} = ${v[0]},\\ n = ${v[1]}`;
      return `\\bar{x} = ${v[0]},\\ \\mu_0 = ${v[1]},\\ \\sigma = ${v[2]},\\ n = ${v[3]}`;
    }
    case 'term': case 'series': return `${splitTop(p.question, ',').map(expressionTex).join(',\\ ')},\\ \\ldots`;
    default: return expressionTex(p.question);
  }
}

// The instruction line: a key under App.math.formulaQuiz and the TeX for its
// rich tags. Shared by the page and the blind review, which reads the Japanese.
export function formulaInstruction(p: FormulaPayload): { key: string; tex: Record<string, string> } {
  if (p.kind === 'solve' && (p.style === 'box' || p.style === 'ratio')) return { key: p.style === 'box' ? 'solveBox' : 'solveRatio', tex: {} };
  const at = { given: p.given ? solutionTex(p.given, 'x') : '' };
  switch (p.kind) {
    case 'calc': {
      if (p.given) return { key: 'given', tex: at };
      // A question that is one function call (det, lim, dot, ...) says what to do with it.
      const top = parseExpression(p.question);
      return { key: top.type === 'call' && /^(det|inv|rank|nullity|rref|eigvals|dot|cross|norm|orth|jac|lim|d|taylor|vol|arc|int2|arg|conj|re|im|T)$/.test(top.name) ? `fn${top.name[0].toUpperCase()}${top.name.slice(1)}` : 'calc', tex: {} };
    }
    case 'eigenvector': return { key: 'eigenvector', tex: {} };
    case 'divmod': return { key: 'divmod', tex: {} };
    case 'classify': return { key: `classify${p.which![0].toUpperCase()}${p.which!.slice(1)}`, tex: {} };
    case 'mvt': return { key: 'mvt', tex: {} };
    case 'figure': return { key: `figure${p.which!.replace(/(^|-)(\w)/g, (_, _d, c: string) => c.toUpperCase())}`, tex: /^polygon-/.test(p.which!) ? { n: p.question } : p.which === 'pie-count' ? { n: 'ABCD'[Number(splitTop(p.question, ',')[5]) - 1] } : {} };
    case 'sets': return { key: `set${p.which!.replace(/(^|-)(\w)/g, (_, _d, c: string) => c.toUpperCase())}`, tex: {} };
    case 'logic': return { key: `logic${p.which![0].toUpperCase()}${p.which!.slice(1)}`, tex: {} };
    case 'mapping': return { key: `mapping${p.which![0].toUpperCase()}${p.which!.slice(1).replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}`, tex: {} };
    case 'ode': return { key: `ode${p.which![0].toUpperCase()}${p.which!.slice(1)}`, tex: {} };
    case 'conic': return { key: p.which!.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()).replace(/^/, 'conic').replace(/^conic(.)/, (_, c: string) => `conic${c.toUpperCase()}`), tex: {} };
    case 'derivative': return p.given ? { key: 'derivativeAt', tex: at } : { key: 'derivative', tex: {} };
    case 'tangent': return { key: 'tangent', tex: at };
    case 'remainder': return { key: 'remainder', tex: { divisor: expressionTex(p.divisor ?? '') } };
    case 'extremum': return { key: p.which === 'max' ? 'extremumMax' : 'extremumMin', tex: {} };
    case 'integral': return { key: p.bounds ? 'definite' : 'indefinite', tex: {} };
    case 'area': {
      const [a, b] = splitTop(p.bounds ?? '0, 1', ',').map(expressionTex);
      return { key: p.question.includes(';') ? 'areaCurves' : 'areaAxis', tex: { a: `x = ${a}`, b: `x = ${b}` } };
    }
    case 'radian': case 'degree': case 'identity': return { key: p.kind, tex: {} };
    case 'quadratic': return { key: `quadratic${p.which![0].toUpperCase()}${p.which!.slice(1).replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}`, tex: {} };
    case 'triangle': return { key: p.which!.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()).replace(/^(sin|cos|tan)$/, (m: string) => `triangle${m[0].toUpperCase()}${m.slice(1)}`), tex: {} };
    case 'number': {
      const key = p.which!.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
      if (p.which === 'nth-multiple') { const [a, n] = list(p.question); return { key, tex: { a, n } }; }
      if (p.which === 'to-base') { const [, base] = list(p.question); return { key, tex: { n: base } }; }
      if (p.which === 'from-base') return { key, tex: {} };
      if (p.which === 'remainder') { const [a, m] = list(p.question); return { key: 'numberRemainder', tex: { a, m } }; }
      if (p.which === 'power-mod') { const [a, e, m] = list(p.question); return { key, tex: { a, e, m } }; }
      return { key, tex: {} };
    }
    case 'stat': return { key: `stat${p.which![0].toUpperCase()}${p.which!.slice(1)}`, tex: {} };
    case 'rearrange': return { key: 'rearrange', tex: { v: p.which! } };
    case 'function': {
      const key = p.which!.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
      if (p.which === 'rate') { const [a, b] = list(splitTop(p.question, ';')[1]); return { key: 'rate', tex: { a, b } }; }
      return { key: p.which === 'rewrite' ? 'rewriteY' : key, tex: {} };
    }
    case 'recurrence': return p.given ? { key: 'recurrenceAt', tex: { n: expressionTex(p.given.split('=')[1]) } } : { key: 'recurrence', tex: { an: 'a_n' } };
    case 'distribution': return { key: p.which === 'mean' || p.which === 'variance' ? `${p.which}Table` : p.which!, tex: p.given ? { k: expressionTex(p.given.split('=')[1]) } : {} };
    case 'inequality': return { key: p.which === 'solve' ? 'inequalitySolve' : p.which!.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()), tex: {} };
    case 'induction': return { key: `induction${p.which![0].toUpperCase()}${p.which!.slice(1)}`, tex: {} };
    case 'inference': return { key: p.which!.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()), tex: p.given ? { z: expressionTex(p.given.split('=')[1]) } : {} };
    case 'region': return { key: p.which === 'in' ? 'regionIn' : 'regionOut', tex: {} };
    case 'graph': return { key: `graph${p.which![0].toUpperCase()}${p.which!.slice(1)}`, tex: {} };
    case 'geometry': return { key: p.which!.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()), tex: {} };
    case 'term': case 'series': {
      const kind = p.kind === 'term' ? 'Term' : 'Sum';
      const n = p.given ? expressionTex(p.given.split('=')[1]) : 'n';
      if (p.given) return { key: `${p.progression}${kind}At`, tex: { n } };
      return { key: `${p.progression}${kind}`, tex: p.kind === 'term' ? { an: 'a_n' } : { n, sn: 'S_n' } };
    }
    default: return { key: p.kind, tex: {} };
  }
}

// Choices that are words (a kind of condition, a property of a map or relation) are keys of the page's
// messages: the key of a choice's label under App.math.formulaQuiz, or null for a choice drawn as math.
// A figure problem answered by a word (the shape's name, a congruence condition).
const FIGURE_LABELS = ['triangle-type', 'quad-type', 'congruence-condition', 'solid-name'];
export function formulaChoiceLabel(p: { kind: string; which?: string }, choice: string): string | null {
  if (p.kind === 'figure' && FIGURE_LABELS.includes(p.which ?? '')) return choice === 'right' ? 'labelRightTriangle' : `label${choice[0].toUpperCase()}${choice.slice(1)}`;
  if (!((p.kind === 'logic' && p.which === 'necessary') || p.kind === 'mapping')) return null;
  return p.kind === 'mapping' && choice === 'neither' ? 'labelNeitherMap' : `label${choice[0].toUpperCase()}${choice.slice(1)}`;
}

export function formulaChoiceTex(p: Pick<FormulaPayload, 'kind' | 'question'> & { which?: string; style?: FormulaStyle }, choice: string): string {
  return withStyle(p.style, () => choiceTex(p, choice));
}
function choiceTex(p: Pick<FormulaPayload, 'kind' | 'question'> & { which?: string; style?: FormulaStyle }, choice: string): string {
  // A □ problem answers with the number alone.
  if (p.kind === 'solve' && p.style === 'box') return list(choice).join(',\\ ');
  if (p.kind === 'solve') return solutionTex(choice, unknownOf(p.question));
  if (p.kind === 'tangent') return solutionTex(choice, 'y');
  if (p.kind === 'identity') return solutionTex(choice, 'a');
  if (p.kind === 'sets') return `\\left\\{${list(choice).join(', ')}\\right\\}`;
  if (p.kind === 'logic' && (p.which === 'contrapositive' || p.which === 'negation')) return conditionTex(choice);
  if (p.kind === 'logic' && p.which === 'truth') return choice.split(',').map(value => `\\mathrm{${value.trim()}}`).join(',\\ ');
  if (p.kind === 'divmod') { const [q, r] = list(choice); return `${q} \\cdots ${r}`; }
  if (p.kind === 'conic') {
    if (['parabola-focus', 'polar-to-xy', 'xy-to-polar'].includes(p.which ?? '')) return `\\left(${list(choice).join(', ')}\\right)`;
    if (['parabola-directrix', 'parabola-equation'].includes(p.which ?? '')) return statementTex(choice);
  }
  if (p.kind === 'figure') {
    if (p.which === 'clock-read') { const [h, m] = list(choice); return `\\mathrm{${h}:${m.padStart(2, '0')}}`; }
    if (p.which === 'centroid' || p.which?.startsWith('move-')) return `\\left(${list(choice).join(', ')}\\right)`;
    if (/^(angle-|parallel-(vertical|corresponding|alternate|cointerior)$|polygon-|inscribed-|isosceles-|protractor$|parallelogram-angle$)/.test(p.which ?? '')) return `${expressionTex(choice)}^{\\circ}`;
  }
  if (p.kind === 'degree') return `${expressionTex(choice)}^{\\circ}`;
  if (p.kind === 'geometry') return p.which?.startsWith('line-') ? solutionTex(choice, 'y') : /^(circle|locus)-/.test(p.which ?? '') ? statementTex(choice) : expressionTex(choice);
  if (p.kind === 'region') return `\\left(${list(choice).join(', ')}\\right)`;
  if ((p.kind === 'inequality' && p.which === 'solve') || (p.kind === 'quadratic' && p.which === 'krange')) return intervalTex(choice);
  if (p.kind === 'number' && p.which === 'diophantine') return `\\left(x, y\\right) = \\left(${list(choice).join(', ')}\\right)`;
  if (p.kind === 'number' && p.which === 'to-base') return `${choice.trim()}_{(${list(p.question)[1]})}`;
  if (p.kind === 'function') {
    if (['proportion', 'inverse', 'rewrite'].includes(p.which ?? '')) return solutionTex(choice, 'y');
    if (p.which === 'intersect-lines') return `\\left(${list(choice).join(', ')}\\right)`;
    if (p.which === 'intersect-parabola') return solutionTex(choice, 'x');
    return expressionTex(choice);
  }
  if (p.kind === 'graph') {
    if (p.which === 'vertex') return `\\left(${list(choice).join(', ')}\\right)`;
    if (p.which === 'circle') return statementTex(choice);
    if (p.which === 'region') return inequalityTex(choice);
    return solutionTex(choice, 'y');
  }
  if (p.kind === 'inference' && p.which?.endsWith('interval')) return `\\left[${list(choice).join(',\\ ')}\\right]`;
  return expressionTex(choice);
}

// A sum's terms as TeX, so a long expression can wrap between them:
// "x^2 + 5*x - 6" -> ["x^{2}", "+ 5x", "- 6"].
function termsTex(text: string): string[] {
  const terms: string[] = [];
  const walk = (node: Node): void => {
    if (node.type === 'bin' && (node.op === '+' || node.op === '-')) { walk(node.left); terms.push(`${node.op} ${toTex(node.right)}`); }
    else terms.push(toTex(node));
  };
  walk(parseExpression(text));
  return terms;
}

// A worked-solution line as rows of TeX pieces (the page wraps a row between
// pieces when it is too wide): "a = b = c" is the rows [a, = b] and [= c];
// comma-separated equations are rows of their own.
export function stepRows(line: string, style?: FormulaStyle): string[][] {
  return withStyle(style, () => stepRowsOf(line));
}
function stepRowsOf(line: string): string[][] {
  return splitTop(line, ',').flatMap(item => {
    const parts = item.split('=').map(termsTex);
    const prefixed = (terms: string[]) => [`= ${terms[0]}`, ...terms.slice(1)];
    return parts.length === 1 ? [parts[0]] : [[...parts[0], ...prefixed(parts[1])], ...parts.slice(2).map(prefixed)];
  });
}

// A formula's value at the given letters (the graph component draws with this).
// Unknown letters and undefined operations give NaN.
export function evalExpression(text: string, vars: Record<string, number> = {}): number {
  const run = (node: Node): number => {
    switch (node.type) {
      case 'num': return Number(node.value);
      case 'var': return vars[node.name] ?? NaN;
      case 'const': return node.name === 'pi' ? Math.PI : NaN;
      case 'list': return NaN;
      case 'neg': return -run(node.arg);
      case 'group': return run(node.arg);
      case 'pow': return Math.pow(run(node.base), run(node.exp));
      case 'call': {
        const [a, b] = node.args.map(run);
        switch (node.name) {
          case 'sqrt': return Math.sqrt(a);
          case 'sin': return Math.sin(a);
          case 'cos': return Math.cos(a);
          case 'tan': return Math.tan(a);
          case 'abs': return Math.abs(a);
          case 'log': return Math.log(a) / Math.log(b);
          default: return NaN;
        }
      }
      case 'bin': {
        const l = run(node.left), r = run(node.right);
        return node.op === '+' ? l + r : node.op === '-' ? l - r : node.op === '*' ? l * r : l / r;
      }
    }
  };
  return run(parseExpression(text));
}

// "lhs; rhs; op" (op is <, >, <= or >=) as TeX.
export function inequalityTex(text: string): string {
  const [lhs, rhs, op] = splitTop(text, ';');
  return `${expressionTex(lhs)} ${({ '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge' } as Record<string, string>)[op.trim()]} ${expressionTex(rhs)}`;
}

// A solution set of an inequality as TeX: chains of relations joined by commas
// ("-1 < x < 4", "x <= -2, x >= 5").
export function intervalTex(text: string): string {
  return splitTop(text, ',').map(chain => {
    const parts = chain.split(/(<=|>=|<|>)/).map(part => part.trim());
    return parts.map((part, index) => index % 2 === 1 ? ({ '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge' } as Record<string, string>)[part] : expressionTex(part)).join(' ');
  }).join(',\\ ');
}


// Conditions and propositions of the logic problems, in one small notation shared with
// scripts/verify_math.py (which evaluates them over a range of integers or truth values):
//
//   cond  = imp
//   imp   = or ('=>' or)*                      right-associative
//   or    = and ('or' and)*
//   and   = not ('and' not)*
//   not   = 'not' not | '(' cond ')' | atom
//   atom  = expr relation expr                 relation: < > <= >= = !=   (expr in the formula grammar)
//         | p | q | r                          a truth value
//
// Parentheses group conditions only: an atom has none (write "x*x + x > 2", not "(x + 1) > 2").
type Cond =
  | { type: 'atom'; left: string; op: string; right: string }
  | { type: 'var'; name: string }
  | { type: 'not'; arg: Cond }
  | { type: 'bin'; op: 'and' | 'or' | 'imp'; left: Cond; right: Cond };

const RELATION = /^(.*?)(<=|>=|!=|<|>|=)(.*)$/;

function tokenizeCondition(text: string): string[] {
  const tokens: string[] = [];
  let buffer = '';
  const flush = () => { if (buffer.trim()) tokens.push(buffer.trim()); buffer = ''; };
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(' || text[i] === ')') { flush(); tokens.push(text[i]); continue; }
    if (text.startsWith('=>', i)) { flush(); tokens.push('=>'); i++; continue; }
    const word = /^(and|or|not)(?![a-z0-9])/.exec(text.slice(i));
    if (word && (i === 0 || /[\s()]/.test(text[i - 1]))) { flush(); tokens.push(word[1]); i += word[1].length - 1; continue; }
    buffer += text[i];
  }
  flush();
  return tokens;
}

export function parseCondition(text: string): Cond {
  const tokens = tokenizeCondition(text);
  let at = 0;
  const peek = () => tokens[at];
  const take = () => tokens[at++];
  function imp(): Cond {
    const left = or();
    if (peek() === '=>') { take(); return { type: 'bin', op: 'imp', left, right: imp() }; }
    return left;
  }
  function or(): Cond {
    let node = and();
    while (peek() === 'or') { take(); node = { type: 'bin', op: 'or', left: node, right: and() }; }
    return node;
  }
  function and(): Cond {
    let node = not();
    while (peek() === 'and') { take(); node = { type: 'bin', op: 'and', left: node, right: not() }; }
    return node;
  }
  function not(): Cond {
    if (peek() === 'not') { take(); return { type: 'not', arg: not() }; }
    if (peek() === '(') { take(); const inner = imp(); if (take() !== ')') throw new Error(`Missing ) in "${text}"`); return inner; }
    const token = take();
    if (token === undefined) throw new Error(`Unexpected end of "${text}"`);
    if (/^[pqr]$/.test(token)) return { type: 'var', name: token };
    const match = RELATION.exec(token);
    if (!match) throw new Error(`Not a condition: "${token}"`);
    return { type: 'atom', left: match[1].trim(), op: match[2], right: match[3].trim() };
  }
  const node = imp();
  if (at !== tokens.length) throw new Error(`Unexpected "${tokens[at]}" in "${text}"`);
  return node;
}

const RELATION_TEX: Record<string, string> = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge', '=': '=', '!=': '\\ne' };
const PRECEDENCE = { imp: 0, or: 1, and: 2 } as const;

function tex(node: Cond, parent: number): string {
  switch (node.type) {
    case 'atom': return `${expressionTex(node.left)} ${RELATION_TEX[node.op]} ${expressionTex(node.right)}`;
    case 'var': return node.name;
    case 'not': return `\\lnot ${node.arg.type === 'bin' ? `\\left(${tex(node.arg, 0)}\\right)` : tex(node.arg, 3)}`;
    case 'bin': {
      const own = PRECEDENCE[node.op];
      const symbol = node.op === 'and' ? '\\land' : node.op === 'or' ? '\\lor' : '\\Rightarrow';
      const body = `${tex(node.left, own + 1)} ${symbol} ${tex(node.right, node.op === 'imp' ? own : own + 1)}`;
      return own < parent ? `\\left(${body}\\right)` : body;
    }
  }
}

// A condition as TeX: x > 2 \Rightarrow x^{2} > 4.
export const conditionTex = (text: string) => tex(parseCondition(text), 0);
