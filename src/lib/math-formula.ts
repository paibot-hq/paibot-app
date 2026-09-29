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
//   power     = atom ('^' unary)?
//   atom      = number | letter | 'sqrt(' expr ')' | '(' expr ')'
//   number    = digits with an optional decimal part (0.25); letter = one of a-z
//
// Multiplication is always written with '*'; the TeX drops the sign where
// school math does (2x, 3\sqrt{2}, 2(x + 1)) and shows × between numbers.

export type FormulaKind = 'calc' | 'solve' | 'expand';

export interface FormulaPayload {
  kind: FormulaKind;
  // calc/expand: an expression; solve: an equation, or equations joined by ';'.
  question: string;
  // calc only: values substituted before calculating, e.g. "x = 3, y = -2".
  given: string | null;
  // calc/expand: expressions. solve: the solution, comma-separated values of
  // the one unknown ("-2, 5") or assignments for several ("x = 1, y = 2").
  choices: string[];
}

type Node =
  | { type: 'num'; value: string }
  | { type: 'var'; name: string }
  | { type: 'neg'; arg: Node }
  | { type: 'group'; arg: Node }
  | { type: 'sqrt'; arg: Node }
  | { type: 'pow'; base: Node; exp: Node }
  | { type: 'bin'; op: '+' | '-' | '*' | '/' | ':'; left: Node; right: Node };

const TOKEN = /\s*(\d+(?:\.\d+)?|sqrt|[a-z]|[-+*/:^()=;,])/y;

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
    if (token === 'sqrt') { take('('); const arg = expr(); take(')'); return { type: 'sqrt', arg }; }
    if (/^[a-z]$/.test(token)) return { type: 'var', name: token };
    if (token === '(') { const arg = expr(); take(')'); return { type: 'group', arg }; }
    throw new Error(`Unexpected "${token}" in "${text}"`);
  }
  const node = expr();
  if (at !== tokens.length) throw new Error(`Unexpected "${tokens[at]}" in "${text}"`);
  return node;
}

// The first token of a product's factor decides whether the × can be dropped:
// a number followed by a letter, sqrt or parenthesis reads as a product.
function startsWithNumber(node: Node): boolean {
  if (node.type === 'num') return true;
  if (node.type === 'bin') return startsWithNumber(node.left);
  if (node.type === 'pow') return startsWithNumber(node.base);
  return false;
}

export function toTex(node: Node): string {
  switch (node.type) {
    case 'num': return node.value;
    case 'var': return node.name;
    case 'neg': return `-${toTex(node.arg)}`;
    case 'group': return `\\left(${toTex(node.arg)}\\right)`;
    case 'sqrt': return `\\sqrt{${toTex(node.arg)}}`;
    case 'pow': return `${toTex(node.base)}^{${toTex(node.exp)}}`;
    case 'bin': {
      const left = toTex(node.left), right = toTex(node.right);
      if (node.op === '/') return `\\frac{${toTex(unwrap(node.left))}}{${toTex(unwrap(node.right))}}`;
      if (node.op === ':') return `${left} \\div ${right}`;
      if (node.op === '*') return startsWithNumber(node.right) ? `${left} \\times ${right}` : `${left}${right}`;
      return `${left} ${node.op} ${right}`;
    }
  }
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
// "x = 1, y = 2".
export function solutionTex(text: string, unknown: string): string {
  return text.split(',').map(item => {
    const [name, value] = item.includes('=') ? item.split('=') : [unknown, item];
    return `${name.trim()} = ${expressionTex(value)}`;
  }).join(',\\ ');
}

// The single letter a one-unknown equation is solved for.
export function unknownOf(question: string): string {
  return [...new Set(question.match(/(?<![a-z])[a-z](?![a-z])/g) ?? [])].sort()[0] ?? 'x';
}
