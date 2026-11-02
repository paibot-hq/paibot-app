import { evalExpression, splitTop } from './math-formula.ts';

// A graph in a lesson (src/data/item-lessons.json, `figures[].graph`): curves, marked points and a shaded region on a
// coordinate plane, all written in the formula grammar so that scripts/verify_lessons.py can check them with SymPy
// (a point's `on` names the curves it lies on). This module only works out where everything goes; the component
// (components/math-lesson-figure.tsx) draws it and the unit tests run it without a browser.
//   curve: { y: "x^2 - 2*x" }        y = f(x)
//          { x: "3" }                a vertical line
//          { implicit: "x^2 + y^2 = 4" }   any curve in x and y (circle, ellipse, hyperbola, ...)
// `label` is text drawn beside the curve (an equation label must equal the curve; the checker compares them);
// `labelAt` is the x to put it at (or [x, y]); `dashed` draws it dashed.
export interface LessonCurve { y?: string; x?: string; implicit?: string; label?: string; labelAt?: number | [number, number]; dashed?: boolean }
export interface LessonPoint { x: number; y: number; label?: string; on?: number[]; hollow?: boolean }
export interface LessonRegion { lhs: string; op: '<' | '>' | '<=' | '>='; rhs: string }
export interface LessonGraph {
  view?: { x: [number, number]; y: [number, number]; pi?: boolean };
  curves?: LessonCurve[];
  points?: LessonPoint[];
  region?: LessonRegion;
}

export const GRAPH_WIDTH = 360;
const PAD = 26;
export const DEFAULT_VIEW = { x: [-6, 6], y: [-6, 6] } as const;

export interface Tick { value: number; label: string }
export interface LaidCurve { d: string; dashed: boolean; label?: { x: number; y: number; text: string; anchor: 'start' | 'end' } }
export interface LaidPoint { x: number; y: number; hollow: boolean; label?: { x: number; y: number; text: string; anchor: 'start' | 'end' } }
export interface Layout {
  width: number; height: number; box: { x0: number; y0: number; x1: number; y1: number };
  axisX: number | null; axisY: number | null;
  gridX: number[]; gridY: number[]; ticksX: (Tick & { at: number })[]; ticksY: (Tick & { at: number })[];
  curves: LaidCurve[]; points: LaidPoint[]; region: string;
}

const minus = (text: string) => text.replace('-', '−');
const piLabel = (halves: number) => {
  if (halves === 0) return '0';
  const sign = halves < 0 ? '−' : '', n = Math.abs(halves);
  return n === 2 ? `${sign}π` : n % 2 === 0 ? `${sign}${n / 2}π` : n === 1 ? `${sign}π/2` : `${sign}${n}π/2`;
};
const niceStep = (span: number) => { const raw = span / 8; const base = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 5, 10].map(m => m * base).find(step => step >= raw) ?? raw; };

// Splits "lhs = rhs" of an implicit curve into one expression, lhs - rhs.
export const implicitParts = (text: string): [string, string] => {
  const parts = splitTop(text, '=');
  if (parts.length !== 2) throw new Error(`an implicit curve is "left = right": ${text}`);
  return [parts[0].trim(), parts[1].trim()];
};

export function layoutGraph(graph: LessonGraph): Layout {
  const [xMin, xMax] = graph.view?.x ?? DEFAULT_VIEW.x, [yMin, yMax] = graph.view?.y ?? DEFAULT_VIEW.y;
  const xSpan = xMax - xMin, ySpan = yMax - yMin;
  const width = GRAPH_WIDTH, inner = width - 2 * PAD;
  // Equal scales on both axes when the window allows it; a very tall or flat window is stretched into 0.4 to 1.2 of the width.
  const innerH = Math.round(inner * Math.min(1.2, Math.max(0.4, ySpan / xSpan)));
  const height = innerH + 2 * PAD;
  const sx = (x: number) => PAD + ((x - xMin) / xSpan) * inner;
  const sy = (y: number) => PAD + ((yMax - y) / ySpan) * innerH;
  const fmt = (n: number) => n.toFixed(1);

  // Grid and ticks: whole numbers (or multiples of π/2) at a step that leaves about 8 of them.
  const stepX = graph.view?.pi ? Math.PI / 2 : niceStep(xSpan), stepY = niceStep(ySpan);
  const range = (min: number, max: number, step: number) => { const out: number[] = []; for (let k = Math.ceil(min / step - 1e-9); k * step <= max + 1e-9; k++) out.push(k); return out; };
  const gridX = range(xMin, xMax, stepX).map(k => k * stepX), gridY = range(yMin, yMax, stepY).map(k => k * stepY);
  const axisX = xMin <= 0 && xMax >= 0 ? sx(0) : null, axisY = yMin <= 0 && yMax >= 0 ? sy(0) : null;
  const ticksX = range(xMin, xMax, stepX).filter(k => k !== 0).map(k => ({ value: k * stepX, at: sx(k * stepX), label: graph.view?.pi ? piLabel(k) : minus(String(Math.round(k * stepX * 1e6) / 1e6)) }));
  const ticksY = range(yMin, yMax, stepY).filter(k => k !== 0).map(k => ({ value: k * stepY, at: sy(k * stepY), label: minus(String(Math.round(k * stepY * 1e6) / 1e6)) }));

  const inView = (x: number, y: number) => x >= xMin - 1e-9 && x <= xMax + 1e-9 && y >= yMin - 1e-9 && y <= yMax + 1e-9;
  const anchorFor = (px: number): 'start' | 'end' => (px > PAD + inner * 0.68 ? 'end' : 'start');
  const labelAt = (curve: LessonCurve, point: [number, number] | undefined) => {
    if (!curve.label || !point) return undefined;
    const px = sx(point[0]), py = sy(point[1]), anchor = anchorFor(px);
    return { x: px + (anchor === 'start' ? 6 : -6), y: py - 8, text: curve.label, anchor };
  };

  const curves: LaidCurve[] = (graph.curves ?? []).map(curve => {
    if (curve.x !== undefined) {
      const x = evalExpression(curve.x);
      return { d: `M${fmt(sx(x))} ${fmt(PAD)}V${fmt(PAD + innerH)}`, dashed: Boolean(curve.dashed), label: labelAt(curve, Array.isArray(curve.labelAt) ? curve.labelAt : [x, yMax - ySpan * 0.08]) };
    }
    if (curve.implicit !== undefined) {
      const [lhs, rhs] = implicitParts(curve.implicit);
      const n = 160, value = (i: number, j: number) => evalExpression(lhs, { x: xMin + (xSpan * i) / n, y: yMin + (ySpan * j) / n }) - evalExpression(rhs, { x: xMin + (xSpan * i) / n, y: yMin + (ySpan * j) / n });
      const grid = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => value(i, j)));
      let d = '';
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        // Where the curve crosses the cell's four edges (linear in between), joined in pairs.
        const corners = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]], at = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
        const crossings: [number, number][] = [];
        for (let k = 0; k < 4; k++) {
          const a = corners[k], b = corners[(k + 1) % 4];
          if (!Number.isFinite(a) || !Number.isFinite(b) || (a > 0) === (b > 0) || a === b) continue;
          const t = a / (a - b), [ai, aj] = at[k], [bi, bj] = at[(k + 1) % 4];
          crossings.push([xMin + (xSpan * (ai + (bi - ai) * t)) / n, yMin + (ySpan * (aj + (bj - aj) * t)) / n]);
        }
        for (let k = 0; k + 1 < crossings.length; k += 2) d += `M${fmt(sx(crossings[k][0]))} ${fmt(sy(crossings[k][1]))}L${fmt(sx(crossings[k + 1][0]))} ${fmt(sy(crossings[k + 1][1]))}`;
      }
      return { d, dashed: Boolean(curve.dashed), label: labelAt(curve, Array.isArray(curve.labelAt) ? curve.labelAt : undefined) };
    }
    const f = (x: number) => evalExpression(curve.y!, { x });
    const steps = 600;
    let d = '', drawing = false, last = NaN;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (xSpan * i) / steps, y = f(x);
      const visible = Number.isFinite(y) && y >= yMin - ySpan * 0.5 && y <= yMax + ySpan * 0.5 && !(drawing && Math.abs(y - last) > ySpan * 1.5);
      if (visible) { d += `${drawing ? 'L' : 'M'}${fmt(sx(x))} ${fmt(sy(y))}`; drawing = true; last = y; } else { drawing = false; last = NaN; }
    }
    // The label goes near the right end of the part that is in the window (or at labelAt).
    let at: [number, number] | undefined;
    if (typeof curve.labelAt === 'number') at = [curve.labelAt, f(curve.labelAt)];
    else if (Array.isArray(curve.labelAt)) at = curve.labelAt;
    else for (let i = steps - Math.round(steps * 0.06); i >= 0 && !at; i--) { const x = xMin + (xSpan * i) / steps, y = f(x); if (Number.isFinite(y) && inView(x, y)) at = [x, y]; }
    return { d, dashed: Boolean(curve.dashed), label: labelAt(curve, at) };
  });

  const points: LaidPoint[] = (graph.points ?? []).map(point => {
    const px = sx(point.x), py = sy(point.y), anchor = anchorFor(px);
    return { x: px, y: py, hollow: Boolean(point.hollow), label: point.label ? { x: px + (anchor === 'start' ? 8 : -8), y: py - 8, text: point.label, anchor } : undefined };
  });

  let region = '';
  if (graph.region) {
    const { lhs, op, rhs } = graph.region;
    const test = { '<': (v: number) => v < 0, '>': (v: number) => v > 0, '<=': (v: number) => v <= 0, '>=': (v: number) => v >= 0 }[op];
    const cols = 120, rows = Math.max(1, Math.round((cols * ySpan) / xSpan)), cw = xSpan / cols, ch = ySpan / rows;
    for (let row = 0; row < rows; row++) {
      const y = yMax - (row + 0.5) * ch;
      let start = -1;
      for (let col = 0; col <= cols; col++) {
        const x = xMin + (col + 0.5) * cw;
        const inside = col < cols && test(evalExpression(lhs, { x, y }) - evalExpression(rhs, { x, y }));
        if (inside && start < 0) start = col;
        if (!inside && start >= 0) { region += `M${fmt(sx(xMin + start * cw))} ${fmt(sy(yMax - row * ch))}h${fmt(((col - start) * cw * inner) / xSpan)}v${fmt((ch * innerH) / ySpan)}h-${fmt(((col - start) * cw * inner) / xSpan)}z`; start = -1; }
      }
    }
  }
  return { width, height, box: { x0: PAD, y0: PAD, x1: PAD + inner, y1: PAD + innerH }, axisX, axisY, gridX: gridX.map(sx), gridY: gridY.map(sy), ticksX, ticksY, curves, points, region };
}
