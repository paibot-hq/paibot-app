import { useId, useMemo } from 'react';
import { useTranslations } from 'use-intl';
import { evalExpression, splitTop } from '../lib/math-formula';
import styles from './math-graph.module.css';

// A graph the learner reads, drawn from the problem's hidden formula
// (src/lib/math-formula.ts, kind "graph"): a curve, a circle or a shaded region
// on a coordinate plane with a grid. The description names no feature of the
// graph, since the problem asks the learner to read it.
const SIZE = 360, PAD = 22;

interface View { xMin: number; xMax: number; yMin: number; yMax: number }
const BOX: View = { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };
const TRIG: View = { xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -3, yMax: 3 };

const piLabel = (halves: number) => {
  if (halves === 0) return '0';
  const sign = halves < 0 ? '−' : '', n = Math.abs(halves);
  return n === 2 ? `${sign}π` : n % 2 === 0 ? `${sign}${n / 2}π` : n === 1 ? `${sign}π/2` : `${sign}${n}π/2`;
};

export default function MathGraph({ which, question }: { which: string; question: string }) {
  const t = useTranslations('App.math.formulaQuiz');
  const clipId = useId();
  const view = which === 'trig' ? TRIG : BOX;
  const inner = SIZE - 2 * PAD;
  const sx = (x: number) => PAD + ((x - view.xMin) / (view.xMax - view.xMin)) * inner;
  const sy = (y: number) => PAD + ((view.yMax - y) / (view.yMax - view.yMin)) * inner;
  const shape = useMemo(() => {
    if (which === 'circle') {
      const [center, radius] = splitTop(question, ';');
      const [cx, cy] = splitTop(center, ',').map(part => evalExpression(part));
      return { circle: { cx, cy, r: evalExpression(radius) } };
    }
    if (which === 'region') {
      const [lhs, rhs, op] = splitTop(question, ';').map(part => part.trim());
      const strict = op === '<' || op === '>';
      const test = { '<': (v: number) => v < 0, '>': (v: number) => v > 0, '<=': (v: number) => v <= 0, '>=': (v: number) => v >= 0 }[op]!;
      // Shaded cells, each row's runs merged into single rectangles.
      const step = 0.1, cells = Math.round((view.xMax - view.xMin) / step);
      let d = '';
      for (let row = 0; row < cells; row++) {
        const y = view.yMax - (row + 0.5) * step;
        let start = -1;
        for (let col = 0; col <= cells; col++) {
          const x = view.xMin + (col + 0.5) * step;
          const inside = col < cells && test(evalExpression(lhs, { x, y }) - evalExpression(rhs, { x, y }));
          if (inside && start < 0) start = col;
          if (!inside && start >= 0) {
            d += `M${sx(view.xMin + start * step).toFixed(1)} ${sy(view.yMax - row * step).toFixed(1)}h${(((col - start) * step * inner) / (view.xMax - view.xMin)).toFixed(1)}v${((step * inner) / (view.yMax - view.yMin)).toFixed(1)}h-${(((col - start) * step * inner) / (view.xMax - view.xMin)).toFixed(1)}z`;
            start = -1;
          }
        }
      }
      // The boundary: y = g(x), or a circle x^2 + y^2 = r^2.
      const explicit = lhs === 'y';
      return { fill: d, strict, boundary: explicit ? curve(rhs, view, sx, sy) : undefined, circle: explicit ? undefined : { cx: 0, cy: 0, r: Math.sqrt(evalExpression(rhs)) } };
    }
    return { boundary: curve(question, view, sx, sy) };
  }, [which, question, view]);

  const ticks = which === 'trig'
    ? { x: Array.from({ length: 9 }, (_, i) => ({ value: (i - 4) * Math.PI / 2, label: piLabel((i - 4)) })), y: [-2, -1, 1, 2].map(value => ({ value, label: String(value).replace('-', '−') })) }
    : { x: [-4, -2, 2, 4, 6, -6].map(value => ({ value, label: String(value).replace('-', '−') })), y: [-4, -2, 2, 4, 6, -6].map(value => ({ value, label: String(value).replace('-', '−') })) };
  const gridX = which === 'trig' ? ticks.x.map(tick => tick.value) : Array.from({ length: 13 }, (_, i) => i - 6);
  const gridY = which === 'trig' ? [-3, -2, -1, 0, 1, 2, 3] : Array.from({ length: 13 }, (_, i) => i - 6);
  return <svg className={styles.graph} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={t('graphDescription')}>
    {shape.fill && <path className={styles.region} d={shape.fill} transform="translate(0 -.5)" />}
    {gridX.map(x => <line key={`gx${x}`} className={styles.grid} x1={sx(x)} y1={PAD} x2={sx(x)} y2={SIZE - PAD} />)}
    {gridY.map(y => <line key={`gy${y}`} className={styles.grid} x1={PAD} y1={sy(y)} x2={SIZE - PAD} y2={sy(y)} />)}
    <line className={styles.axis} x1={PAD} y1={sy(0)} x2={SIZE - PAD} y2={sy(0)} />
    <line className={styles.axis} x1={sx(0)} y1={PAD} x2={sx(0)} y2={SIZE - PAD} />
    <text className={styles.label} x={SIZE - PAD + 4} y={sy(0) + 4}>x</text>
    <text className={styles.label} x={sx(0) + 6} y={PAD - 6}>y</text>
    <text className={styles.label} x={sx(0) - 12} y={sy(0) + 14}>O</text>
    {ticks.x.filter(tick => tick.value !== 0).map(tick => <text key={`tx${tick.label}`} className={styles.tick} x={sx(tick.value)} y={sy(0) + 13} textAnchor="middle">{tick.label}</text>)}
    {ticks.y.map(tick => <text key={`ty${tick.label}`} className={styles.tick} x={sx(0) - 5} y={sy(tick.value) + 4} textAnchor="end">{tick.label}</text>)}
    <clipPath id={clipId}><rect x={PAD} y={PAD} width={SIZE - 2 * PAD} height={SIZE - 2 * PAD} /></clipPath>
    {shape.boundary && <path clipPath={`url(#${clipId})`} className={styles.curve} data-dashed={shape.strict || undefined} d={shape.boundary} />}
    {shape.circle && <circle clipPath={`url(#${clipId})`} className={styles.curve} data-dashed={shape.strict || undefined} cx={sx(shape.circle.cx)} cy={sy(shape.circle.cy)} r={(shape.circle.r * inner) / (view.xMax - view.xMin)} />}
  </svg>;
}

// y = f(x) as an SVG path, broken where the curve leaves the window.
function curve(text: string, view: View, sx: (x: number) => number, sy: (y: number) => number): string {
  let d = '', drawing = false;
  const steps = 480;
  for (let i = 0; i <= steps; i++) {
    const x = view.xMin + ((view.xMax - view.xMin) * i) / steps;
    const y = evalExpression(text, { x });
    if (Number.isFinite(y) && y >= view.yMin - 0.5 && y <= view.yMax + 0.5) { d += `${drawing ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`; drawing = true; }
    else drawing = false;
  }
  return d;
}
