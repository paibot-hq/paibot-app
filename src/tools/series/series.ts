// Series that approach a function as terms are added: Taylor series (powers of x, around 0) and Fourier series (sines, for waves with
// period 2π). "n terms" means the first n terms that are not zero. Pure functions, tested without a browser.

export type Kind = "sin" | "cos" | "exp" | "log" | "geometric" | "atan" | "square" | "sawtooth" | "triangle";
export const TAYLOR_KINDS: readonly Kind[] = ["sin", "cos", "exp", "log", "geometric", "atan"];
export const FOURIER_KINDS: readonly Kind[] = ["square", "sawtooth", "triangle"];
export const KINDS: readonly Kind[] = [...TAYLOR_KINDS, ...FOURIER_KINDS];
export const isFourier = (kind: Kind) => FOURIER_KINDS.includes(kind);

// What is approached.
export function target(kind: Kind, x: number): number {
  switch (kind) {
    case "sin": return Math.sin(x);
    case "cos": return Math.cos(x);
    case "exp": return Math.exp(x);
    case "log": return Math.log(1 + x);
    case "geometric": return 1 / (1 - x);
    case "atan": return Math.atan(x);
    case "square": return Math.sin(x) > 0 ? 1 : Math.sin(x) < 0 ? -1 : 0;
    case "sawtooth": { const r = ((((x + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI; return Math.abs(r - Math.PI) < 1e-12 ? 0 : r / Math.PI; }
    case "triangle": return (2 / Math.PI) * Math.asin(Math.sin(x));
  }
}

// One term: coefficient · x^power (Taylor), or coefficient · sin(power · x) (Fourier).
export type Term = { power: number; coefficient: number };

const factorial = (k: number): number => (k <= 1 ? 1 : k * factorial(k - 1));

// The first n terms that are not zero.
export function terms(kind: Kind, n: number): Term[] {
  const out: Term[] = [];
  for (let k = kind === "exp" || kind === "geometric" || kind === "cos" ? 0 : 1; out.length < n; k++) {
    const sign = (m: number) => (m % 2 === 0 ? 1 : -1);
    let c = 0;
    switch (kind) {
      case "sin": c = k % 2 === 1 ? sign((k - 1) / 2) / factorial(k) : 0; break;
      case "cos": c = k % 2 === 0 ? sign(k / 2) / factorial(k) : 0; break;
      case "exp": c = 1 / factorial(k); break;
      case "log": c = sign(k + 1) / k; break;
      case "geometric": c = 1; break;
      case "atan": c = k % 2 === 1 ? sign((k - 1) / 2) / k : 0; break;
      case "square": c = k % 2 === 1 ? 4 / (Math.PI * k) : 0; break;
      case "sawtooth": c = (2 * sign(k + 1)) / (Math.PI * k); break;
      case "triangle": c = k % 2 === 1 ? (8 * sign((k - 1) / 2)) / (Math.PI * Math.PI * k * k) : 0; break;
    }
    if (c !== 0) out.push({ power: k, coefficient: c });
  }
  return out;
}

// The sum of the first n terms at x.
export function approximate(kind: Kind, n: number, x: number): number {
  let sum = 0;
  if (isFourier(kind)) for (const t of terms(kind, n)) sum += t.coefficient * Math.sin(t.power * x);
  else for (const t of terms(kind, n)) sum += t.coefficient * Math.pow(x, t.power);
  return sum;
}

// The range of x a kind is drawn over, and of y.
export const VIEWS: Record<Kind, { xMin: number; xMax: number; yMin: number; yMax: number; xStep: number; yStep: number }> = {
  sin: { xMin: -6.5, xMax: 6.5, yMin: -3, yMax: 3, xStep: 2, yStep: 1 },
  cos: { xMin: -6.5, xMax: 6.5, yMin: -3, yMax: 3, xStep: 2, yStep: 1 },
  exp: { xMin: -4, xMax: 4, yMin: -3, yMax: 12, xStep: 1, yStep: 2 },
  log: { xMin: -1.5, xMax: 4, yMin: -3, yMax: 3, xStep: 1, yStep: 1 },
  geometric: { xMin: -2.5, xMax: 2.5, yMin: -5, yMax: 5, xStep: 1, yStep: 1 },
  atan: { xMin: -4, xMax: 4, yMin: -3, yMax: 3, xStep: 1, yStep: 1 },
  square: { xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -1.7, yMax: 1.7, xStep: Math.PI, yStep: 1 },
  sawtooth: { xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -1.7, yMax: 1.7, xStep: Math.PI, yStep: 1 },
  triangle: { xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -1.7, yMax: 1.7, xStep: Math.PI, yStep: 1 },
};

// How far the sum is from the function on average over the drawn range (root mean square), where the function is a number.
export function rmsError(kind: Kind, n: number, samples = 800): number {
  const { xMin, xMax } = VIEWS[kind];
  let sum = 0, used = 0;
  for (let i = 0; i < samples; i++) {
    const x = xMin + ((xMax - xMin) * (i + 0.5)) / samples;
    const exact = target(kind, x), found = approximate(kind, n, x);
    if (!Number.isFinite(exact) || Math.abs(exact) > 50) continue;
    sum += (exact - found) ** 2;
    used++;
  }
  return used === 0 ? NaN : Math.sqrt(sum / used);
}

// The highest value of the sum: for a square wave it settles at about 1.179, not 1 (the Gibbs phenomenon).
export function peak(kind: Kind, n: number, samples = 4000): number {
  let top = -Infinity;
  for (let i = 0; i <= samples; i++) top = Math.max(top, approximate(kind, n, (Math.PI * i) / samples));
  return top;
}

// The sum as TeX: the first few terms, then \cdots.
export function sumTex(kind: Kind, n: number, shown = 4): string {
  const list = terms(kind, Math.min(n, shown));
  const more = n > shown ? "+\\cdots" : "";
  const power = (k: number) => (k === 0 ? "" : k === 1 ? "x" : `x^{${k}}`);
  if (isFourier(kind)) {
    const sin = (k: number) => (k === 1 ? "\\sin x" : `\\sin ${k}x`);
    const body = (term: (k: number) => string) => list.map((t, i) => (i === 0 ? "" : term(t.power).startsWith("-") ? "" : "+") + term(t.power)).join("");
    if (kind === "square") return `\\frac{4}{\\pi}\\left(${body(k => (k === 1 ? sin(1) : `\\frac{${sin(k)}}{${k}}`))}${more}\\right)`;
    if (kind === "sawtooth") return `\\frac{2}{\\pi}\\left(${body(k => `${k % 2 === 0 ? "-" : ""}${k === 1 ? sin(1) : `\\frac{${sin(k)}}{${k}}`}`)}${more}\\right)`;
    return `\\frac{8}{\\pi^{2}}\\left(${body(k => `${((k - 1) / 2) % 2 === 1 ? "-" : ""}${k === 1 ? sin(1) : `\\frac{${sin(k)}}{${k * k}}`}`)}${more}\\right)`;
  }
  const piece = (t: Term): string => {
    const k = t.power;
    switch (kind) {
      case "sin": case "cos": case "exp": return k === 0 ? "1" : k === 1 ? "x" : `\\frac{x^{${k}}}{${k}!}`;
      case "log": case "atan": return k === 1 ? "x" : `\\frac{x^{${k}}}{${k}}`;
      default: return k === 0 ? "1" : power(k);
    }
  };
  return list.map((t, i) => (t.coefficient < 0 ? "-" : i === 0 ? "" : "+") + piece(t)).join("") + more;
}
