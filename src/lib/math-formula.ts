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
//   atom      = number | letter | constant | call | '(' expr ')'
//   number    = digits with an optional decimal part (0.25)
//   letter    = one of a-z except i, a variable
//   constant  = pi | i (the imaginary unit)
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
//   identity   an equation in x with unknown constants; choices "a = 1, b = 2" make it an identity in x
export type FormulaKind = 'calc' | 'expand' | 'transform' | 'factor' | 'solve' | 'remainder' | 'derivative' | 'tangent' | 'extremum' | 'integral' | 'area' | 'term' | 'series' | 'radian' | 'degree' | 'recurrence' | 'distribution' | 'geometry' | 'identity' | 'inequality' | 'induction' | 'inference' | 'region' | 'graph';

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
  | { type: 'const'; name: 'pi' | 'i' }
  | { type: 'neg'; arg: Node }
  | { type: 'group'; arg: Node }
  | { type: 'call'; name: string; args: Node[] }
  | { type: 'pow'; base: Node; exp: Node }
  | { type: 'bin'; op: '+' | '-' | '*' | '/' | ':'; left: Node; right: Node };

// Functions and how many arguments each takes.
const FUNCTIONS: Record<string, number> = { sqrt: 1, sin: 1, cos: 1, tan: 1, abs: 1, log: 2, C: 2, P: 2, sum: 4 };

const TOKEN = /\s*(\d+(?:\.\d+)?|sqrt|sin|cos|tan|abs|log|sum|pi|[CP](?=\s*\()|[a-z]|[-+*/:^()=;,])/y;

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
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
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
    if (token === 'pi' || token === 'i') return { type: 'const', name: token };
    if (Object.hasOwn(FUNCTIONS, token)) {
      take('(');
      const args = [expr()];
      while (peek() === ',') { take(); args.push(expr()); }
      take(')');
      if (args.length !== FUNCTIONS[token]) throw new Error(`${token} takes ${FUNCTIONS[token]} argument(s) in "${text}"`);
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
const bare = (node: Node) => ['num', 'var', 'const'].includes(node.type) || (node.type === 'bin' && node.op === '/');
const argTex = (node: Node) => bare(node) ? ` ${toTex(node)}` : `\\left(${toTex(unwrap(node))}\\right)`;

export function toTex(node: Node): string {
  switch (node.type) {
    case 'num': return node.value;
    case 'var': return node.name;
    case 'const': return node.name === 'pi' ? '\\pi ' : 'i';
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
        default: return `\\${node.name}${argTex(a)}`;
      }
    }
    case 'bin': {
      const left = node.op === '*' ? coefficientTex(node.left) : toTex(node.left), right = toTex(node.right);
      if (node.op === '/') return `\\frac{${toTex(unwrap(node.left))}}{${toTex(unwrap(node.right))}}`;
      if (node.op === ':') return `${left} \\div ${right}`;
      // 3*pi/4 is 3 × (π/4) in the grammar but written \frac{3\pi}{4}, not a mixed-number-like 3\frac{\pi}{4}.
      if (node.op === '*' && node.right.type === 'bin' && node.right.op === '/' && !hasFraction(node.left)) {
        return toTex({ type: 'bin', op: '/', left: { type: 'bin', op: '*', left: node.left, right: node.right.left }, right: node.right.right });
      }
      if (node.op === '*' && node.right.type === 'pow' && node.right.base.type === 'num' && node.right.exp.type !== 'num') return `${left} \\cdot ${right}`;
      if (node.op === '*') return startsWithNumber(node.right) ? `${left} \\times ${right}` : `${left}${right}`;
      return `${left} ${node.op} ${right}`;
    }
  }
}
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
export function formulaQuestionTex(p: Pick<FormulaPayload, 'kind' | 'question' | 'bounds'> & { which?: string }): string {
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
    case 'identity': return statementTex(p.question);
    case 'inequality': return p.which === 'product-sum' ? `a b = ${expressionTex(p.question)}` : expressionTex(p.question);
    case 'induction': {
      const [g, f] = splitTop(p.question, ';');
      const term = parseExpression(g);
      const body = term.type === 'bin' && (term.op === '+' || term.op === '-') ? `\\left(${toTex(term)}\\right)` : toTex(term);
      return `\\sum_{k=1}^{n} ${body} = ${expressionTex(f)}`;
    }
    case 'region': return inequalityTex(p.question);
    case 'graph': return '';
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
  const at = { given: p.given ? solutionTex(p.given, 'x') : '' };
  switch (p.kind) {
    case 'calc': return p.given ? { key: 'given', tex: at } : { key: 'calc', tex: {} };
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
    case 'recurrence': return p.given ? { key: 'recurrenceAt', tex: { n: expressionTex(p.given.split('=')[1]) } } : { key: 'recurrence', tex: { an: 'a_n' } };
    case 'distribution': return { key: p.which === 'mean' || p.which === 'variance' ? `${p.which}Table` : p.which!, tex: p.given ? { k: expressionTex(p.given.split('=')[1]) } : {} };
    case 'inequality': return { key: p.which!.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()), tex: {} };
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

export function formulaChoiceTex(p: Pick<FormulaPayload, 'kind' | 'question'> & { which?: string }, choice: string): string {
  if (p.kind === 'solve') return solutionTex(choice, unknownOf(p.question));
  if (p.kind === 'tangent') return solutionTex(choice, 'y');
  if (p.kind === 'identity') return solutionTex(choice, 'a');
  if (p.kind === 'degree') return `${expressionTex(choice)}^{\\circ}`;
  if (p.kind === 'geometry') return p.which?.startsWith('line-') ? solutionTex(choice, 'y') : /^(circle|locus)-/.test(p.which ?? '') ? statementTex(choice) : expressionTex(choice);
  if (p.kind === 'region') return `\\left(${list(choice).join(', ')}\\right)`;
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
export function stepRows(line: string): string[][] {
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
