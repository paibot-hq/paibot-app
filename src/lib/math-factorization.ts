// A choice (x + p)(x + q), stored as [p, q]. Problems are LLM-generated and
// checked by scripts/validate-math-factorization.mjs before import, so this
// module only formats them - it holds no generation or grading logic.
export type FactorPair = [p: number, q: number];

export interface FactorizationPayload {
  // The correct factorization: x^2 + ax + b = (x + p)(x + q).
  p: number;
  q: number;
  choices: FactorPair[];
}

// A coefficient of 1 is left out before a variable: "x^2 + x - 6", not "1x".
function signedTerm(value: number, suffix: string): string {
  const size = Math.abs(value) === 1 && suffix ? '' : Math.abs(value);
  return ` ${value < 0 ? '-' : '+'} ${size}${suffix}`;
}

// "x^2 + 5x + 6" / "x^2 - 5x + 6" / "x^2 - 9" (p = -q, so a = 0).
export function trinomialTex(p: number, q: number): string {
  const a = p + q;
  const b = p * q;
  let tex = 'x^2';
  if (a !== 0) tex += signedTerm(a, 'x');
  if (b !== 0) tex += signedTerm(b, '');
  return tex;
}

// "(x + 2)(x + 3)" / "(x - 3)(x + 3)" / "(x + 3)^2" (a perfect square).
export function factoredTex([p, q]: FactorPair): string {
  const factor = (n: number) => `x ${n >= 0 ? '+' : '-'} ${Math.abs(n)}`;
  return p === q ? `(${factor(p)})^2` : `(${factor(p)})(${factor(q)})`;
}
