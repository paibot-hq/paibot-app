// A small, safe reader for formulas typed into the grapher: "2x^2 - 3x + 1", "sin(x)/x", "2^-x", "y = sqrt(x)".
// No eval: the text becomes a tree of closures. Multiplication may be left out (2x, 2(x + 1), (x + 1)(x - 1), x sin(x), 2pi),
// ^ is a power (right to left, and -x^2 is -(x^2)), functions need their brackets, and every other name is refused.
// Pure functions, tested without a browser.

export type ErrorCode = "empty" | "unexpected" | "unknownName" | "brackets" | "needBrackets" | "arguments";
export class ExpressionError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode) { super(code); this.code = code; }
}

export type Compiled = { ok: true; evaluate: (x: number, y?: number) => number } | { ok: false; error: ErrorCode };

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

type Fn = (x: number, y: number) => number;

function parse(tokens: Token[], variables: string[]): Fn {
  let position = 0;
  const peek = () => tokens[position];
  const isOp = (token: Token | undefined, op: string) => token?.kind === "op" && token.op === op;
  const startsPrimary = (token: Token | undefined) => token !== undefined && (token.kind === "number" || token.kind === "name" || isOp(token, "("));

  function expression(): Fn {
    let left = term();
    while (isOp(peek(), "+") || isOp(peek(), "-")) {
      const plus = (peek() as { op: string }).op === "+";
      position++;
      const a = left, b = term();
      left = plus ? (x, y) => a(x, y) + b(x, y) : (x, y) => a(x, y) - b(x, y);
    }
    return left;
  }
  function term(): Fn {
    let left = unary();
    for (;;) {
      const token = peek();
      let times = true;
      if (isOp(token, "*") || isOp(token, "/")) { times = (token as { op: string }).op === "*"; position++; }
      else if (!startsPrimary(token)) break;
      const a = left, b = unary();
      left = times ? (x, y) => a(x, y) * b(x, y) : (x, y) => a(x, y) / b(x, y);
    }
    return left;
  }
  function unary(): Fn {
    if (isOp(peek(), "-")) { position++; const a = unary(); return (x, y) => -a(x, y); }
    if (isOp(peek(), "+")) { position++; return unary(); }
    return power();
  }
  function power(): Fn {
    const base = primary();
    if (isOp(peek(), "^")) { position++; const exponent = unary(); return (x, y) => realPower(base(x, y), exponent(x, y)); }
    return base;
  }
  function primary(): Fn {
    const token = peek();
    if (!token) throw new ExpressionError("unexpected");
    position++;
    if (token.kind === "number") { const value = token.value; return () => value; }
    if (token.kind === "op") {
      if (token.op !== "(") throw new ExpressionError("unexpected");
      const inner = expression();
      if (!isOp(peek(), ")")) throw new ExpressionError("brackets");
      position++;
      return inner;
    }
    const { name } = token;
    if (name in CONSTANTS) { const value = CONSTANTS[name]; return () => value; }
    if (variables.includes(name)) return name === "y" ? (_x, y) => y : x => x;
    // a function
    if (!isOp(peek(), "(")) throw new ExpressionError("needBrackets");
    position++;
    const args: Fn[] = [expression()];
    while (isOp(peek(), ",")) { position++; args.push(expression()); }
    if (!isOp(peek(), ")")) throw new ExpressionError("brackets");
    position++;
    const [min, max] = ARITY[name] ?? [1, 1];
    if (args.length < min || args.length > max) throw new ExpressionError("arguments");
    const fn = FUNCTIONS[name];
    return (x, y) => fn(...args.map(arg => arg(x, y)));
  }

  const tree = expression();
  if (position < tokens.length) throw new ExpressionError(isOp(peek(), ")") ? "brackets" : "unexpected");
  return tree;
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
    return { ok: true, evaluate: (x, y = 0) => tree(x, y) };
  } catch (error) {
    if (error instanceof ExpressionError) return { ok: false, error: error.code };
    throw error;
  }
}
