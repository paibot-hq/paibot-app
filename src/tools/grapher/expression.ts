// A small, safe reader for formulas typed into the grapher: "2x^2 - 3x + 1", "sin(x)/x", "2^-x", "y = sqrt(x)".
// No eval: the text becomes a tree of closures. Multiplication may be left out (2x, 2(x + 1), (x + 1)(x - 1), x sin(x), 2pi),
// ^ is a power (right to left, and -x^2 is -(x^2)), functions need their brackets, and every other name is refused.
// Pure functions, tested without a browser.

export type ErrorCode = "empty" | "unexpected" | "unknownName" | "brackets" | "needBrackets" | "arguments";
export class ExpressionError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode) { super(code); this.code = code; }
}

export type Compiled = { ok: true; evaluate: (x: number, y?: number) => number; tex: string } | { ok: false; error: ErrorCode };

const FUNCTIONS: Record<string, (...a: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp, ln: Math.log,
  // log(x) is the common logarithm; log(x, b) is the logarithm to the base b.
  log: (x, b) => (b === undefined ? Math.log10(x) : Math.log(x) / Math.log(b)),
  floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
};
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };
const ARITY: Record<string, [number, number]> = { log: [1, 2] };

// A power that keeps real cube roots: (-8)^(1/3) is -2, (-8)^(2/3) is 4, (-4)^0.5 stays undefined.
export function realPower(base: number, exponent: number): number {
  if (base >= 0 || Number.isInteger(exponent)) return Math.pow(base, exponent);
  for (let q = 3; q <= 99; q += 2) {
    const p = exponent * q;
    if (Math.abs(p - Math.round(p)) < 1e-9) return (Math.round(p) % 2 === 0 ? 1 : -1) * Math.pow(-base, exponent);
  }
  return NaN;
}

type Token = { kind: "number"; value: number } | { kind: "name"; name: string } | { kind: "op"; op: string };

function tokenize(text: string, variables: string[]): Token[] {
  const names = [...Object.keys(FUNCTIONS), ...Object.keys(CONSTANTS), ...variables].sort((a, b) => b.length - a.length);
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    if (/^\s/.test(rest)) { i++; continue; }
    const number = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(rest);
    if (number) { tokens.push({ kind: "number", value: Number(number[0]) }); i += number[0].length; continue; }
    if ("+-*/^(),".includes(rest[0])) { tokens.push({ kind: "op", op: rest[0] }); i++; continue; }
    const name = names.find(candidate => rest.toLowerCase().startsWith(candidate));
    if (!name) throw new ExpressionError(/^[a-z]/i.test(rest) ? "unknownName" : "unexpected");
    tokens.push({ kind: "name", name }); i += name.length;
  }
  return tokens;
}

// The formula as a tree: evaluated for the graph, and written as TeX for the preview under the input.
export type Node =
  | { kind: "number"; value: number }
  | { kind: "constant"; name: string }
  | { kind: "variable"; name: string }
  | { kind: "negate"; operand: Node }
  | { kind: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { kind: "call"; name: string; args: Node[] };

function parse(tokens: Token[], variables: string[]): Node {
  let position = 0;
  const peek = () => tokens[position];
  const isOp = (token: Token | undefined, op: string) => token?.kind === "op" && token.op === op;
  const startsPrimary = (token: Token | undefined) => token !== undefined && (token.kind === "number" || token.kind === "name" || isOp(token, "("));

  function expression(): Node {
    let left = term();
    while (isOp(peek(), "+") || isOp(peek(), "-")) {
      const op = (peek() as { op: "+" | "-" }).op;
      position++;
      left = { kind: "binary", op, left, right: term() };
    }
    return left;
  }
  function term(): Node {
    let left = unary();
    for (;;) {
      const token = peek();
      let op: "*" | "/" = "*";
      if (isOp(token, "*") || isOp(token, "/")) { op = (token as { op: "*" | "/" }).op; position++; }
      else if (!startsPrimary(token)) break;
      left = { kind: "binary", op, left, right: unary() };
    }
    return left;
  }
  function unary(): Node {
    if (isOp(peek(), "-")) { position++; return { kind: "negate", operand: unary() }; }
    if (isOp(peek(), "+")) { position++; return unary(); }
    return power();
  }
  function power(): Node {
    const base = primary();
    if (isOp(peek(), "^")) { position++; return { kind: "binary", op: "^", left: base, right: unary() }; }
    return base;
  }
  function primary(): Node {
    const token = peek();
    if (!token) throw new ExpressionError("unexpected");
    position++;
    if (token.kind === "number") return { kind: "number", value: token.value };
    if (token.kind === "op") {
      if (token.op !== "(") throw new ExpressionError("unexpected");
      const inner = expression();
      if (!isOp(peek(), ")")) throw new ExpressionError("brackets");
      position++;
      return inner;
    }
    const { name } = token;
    if (name in CONSTANTS) return { kind: "constant", name };
    if (variables.includes(name)) return { kind: "variable", name };
    // a function
    if (!isOp(peek(), "(")) throw new ExpressionError("needBrackets");
    position++;
    const args: Node[] = [expression()];
    while (isOp(peek(), ",")) { position++; args.push(expression()); }
    if (!isOp(peek(), ")")) throw new ExpressionError("brackets");
    position++;
    const [min, max] = ARITY[name] ?? [1, 1];
    if (args.length < min || args.length > max) throw new ExpressionError("arguments");
    return { kind: "call", name, args };
  }

  const tree = expression();
  if (position < tokens.length) throw new ExpressionError(isOp(peek(), ")") ? "brackets" : "unexpected");
  return tree;
}

type Fn = (x: number, y: number) => number;

function evaluator(node: Node): Fn {
  switch (node.kind) {
    case "number": { const value = node.value; return () => value; }
    case "constant": { const value = CONSTANTS[node.name]; return () => value; }
    case "variable": return node.name === "y" ? (_x, y) => y : x => x;
    case "negate": { const a = evaluator(node.operand); return (x, y) => -a(x, y); }
    case "call": {
      const args = node.args.map(evaluator);
      const fn = FUNCTIONS[node.name];
      return (x, y) => fn(...args.map(arg => arg(x, y)));
    }
    case "binary": {
      const a = evaluator(node.left), b = evaluator(node.right);
      switch (node.op) {
        case "+": return (x, y) => a(x, y) + b(x, y);
        case "-": return (x, y) => a(x, y) - b(x, y);
        case "*": return (x, y) => a(x, y) * b(x, y);
        case "/": return (x, y) => a(x, y) / b(x, y);
        case "^": return (x, y) => realPower(a(x, y), b(x, y));
      }
    }
  }
}

const TEX_NAMES: Record<string, string> = { sin: "\\sin", cos: "\\cos", tan: "\\tan", asin: "\\arcsin", acos: "\\arccos", atan: "\\arctan", sinh: "\\sinh", cosh: "\\cosh", tanh: "\\tanh", ln: "\\ln" };
const TRIG = new Set(["sin", "cos", "tan", "sinh", "cosh", "tanh"]);
const paren = (tex: string) => `\\left(${tex}\\right)`;
const isSum = (node: Node) => node.kind === "binary" && (node.op === "+" || node.op === "-");

function numberTex(value: number): string {
  const text = String(value);
  const e = /^(.*)e([+-]?\d+)$/.exec(text);
  return e ? `${e[1]}\\times 10^{${Number(e[2])}}` : text;
}

// Does what is written begin with a digit? Then a times sign is needed in front of it (2 \\times 3, x \\cdot 2).
const startsWithNumber = (node: Node): boolean =>
  node.kind === "number" || (node.kind === "binary" && (node.op === "*" || node.op === "^") && startsWithNumber(node.left));

// The formula as TeX, as school maths writes it: fractions with a bar, roots, no times sign between a number and a letter.
export function toTex(node: Node): string {
  switch (node.kind) {
    case "number": return numberTex(node.value);
    case "constant": return node.name === "pi" ? "\\pi" : node.name;
    case "variable": return node.name;
    case "negate": return `-${isSum(node.operand) ? paren(toTex(node.operand)) : toTex(node.operand)}`;
    case "call": return callTex(node);
    case "binary": {
      const { op, left, right } = node;
      if (op === "/") return `\\frac{${toTex(left)}}{${toTex(right)}}`;
      if (op === "^") {
        if (left.kind === "call" && TRIG.has(left.name) && right.kind === "number" && right.value >= 0) {
          return `${TEX_NAMES[left.name]}^{${numberTex(right.value)}}${paren(toTex(left.args[0]))}`;
        }
        const base = toTex(left);
        const plain = left.kind === "variable" || left.kind === "constant" || (left.kind === "number" && left.value >= 0);
        return `${plain ? base : paren(base)}^{${toTex(right)}}`;
      }
      if (op === "*") {
        const wrap = (n: Node) => (isSum(n) || n.kind === "negate" ? paren(toTex(n)) : toTex(n));
        return `${wrap(left)}${startsWithNumber(right) ? (left.kind === "number" || startsWithNumber(left) ? "\\times " : "\\cdot ") : ""}${wrap(right)}`;
      }
      const rightTex = (op === "-" && isSum(right)) || right.kind === "negate" ? paren(toTex(right)) : toTex(right);
      return `${toTex(left)}${op}${rightTex}`;
    }
  }
}

function callTex(node: Extract<Node, { kind: "call" }>): string {
  const [a, b] = node.args.map(toTex);
  switch (node.name) {
    case "sqrt": return `\\sqrt{${a}}`;
    case "cbrt": return `\\sqrt[3]{${a}}`;
    case "abs": return `\\left|${a}\\right|`;
    case "exp": return `e^{${a}}`;
    case "log": return `\\log_{${b ?? "10"}}${paren(a)}`;
    case "floor": return `\\lfloor ${a}\\rfloor`;
    case "ceil": return `\\lceil ${a}\\rceil`;
    case "round": return `\\operatorname{round}${paren(a)}`;
    case "sign": return `\\operatorname{sgn}${paren(a)}`;
    default: return `${TEX_NAMES[node.name]}${paren(a)}`;
  }
}

// What people type for the same thing: full-width characters, × ÷ − π, a leading "y =" or "f(x) =".
export function clean(text: string): string {
  return text.normalize("NFKC").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-").replace(/π/g, "pi").replace(/^\s*(y|f\(x\)|z|f\(x,\s*y\))\s*=\s*/i, "");
}

export function compile(text: string, variables: string[] = ["x"]): Compiled {
  try {
    const source = clean(text);
    if (source.trim() === "") throw new ExpressionError("empty");
    const tree = parse(tokenize(source, variables), variables);
    const run = evaluator(tree);
    return { ok: true, evaluate: (x, y = 0) => run(x, y), tex: toTex(tree) };
  } catch (error) {
    if (error instanceof ExpressionError) return { ok: false, error: error.code };
    throw error;
  }
}
