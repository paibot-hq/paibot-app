export type Vertex = 'A' | 'B' | 'C';
export type Side = 'AB' | 'BA' | 'AC' | 'CA' | 'BC' | 'CB';
export type Radical = [number, number];
export interface RightTriangleFigure {
  points: Record<Vertex, [number, number]>;
  rightAngle: Vertex;
  given: [Side, Side];
  unknown: Side;
}
export interface PythagorasPayload { figure: RightTriangleFigure; choices: Radical[] }
export function sideSquared(figure: RightTriangleFigure, side: Side): number {
  const [a, b] = [...side].map(v => figure.points[v as Vertex]);
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}
export function simplifyRoot(n: number): Radical {
  let a = 1;
  for (let d = 2; d * d <= n; d++) while (n % (d * d) === 0) { a *= d; n /= d * d; }
  return [a, n];
}
export function lengthTex([a, b]: Radical): string {
  return `${b === 1 ? a : `${a === 1 ? '' : a}\\sqrt{${b}}`}\\,\\mathrm{cm}`;
}
export function explanationTex(figure: RightTriangleFigure): string {
  const hypotenuse = !figure.unknown.includes(figure.rightAngle);
  const squares = figure.given.map(s => sideSquared(figure, s)).sort((a, b) => b - a);
  const n = hypotenuse ? squares[0] + squares[1] : squares[0] - squares[1];
  return `x^2 = ${Math.sqrt(squares[0])}^2 ${hypotenuse ? '+' : '-'} ${Math.sqrt(squares[1])}^2 = ${n},\\quad x = ${lengthTex(simplifyRoot(n))}`;
}
